import {
  arkL_columns,
  arkL_datasets,
  arkL_events,
  arkL_intervals,
  assertarkL_columnsArray,
  assertarkL_datasetsArray,
  assertarkL_eventsArray,
  assertarkL_intervalsArray
} from "./schema.js";
import { join } from "path";
import { readFile, readdir, unlink, writeFile } from "fs/promises";
import chalk from "chalk";
import { calculateAutoScale } from "@tsconline/shared";

const outputDir = join("db", "london", "output");
const LONDON_DATAPACK_RETENTION_LIMIT = 10;
const LONDON_DATAPACK_FILE_REGEX = /^UCL_TSC_Chronostrat_(\d{2}[A-Z][a-z]{2}\d{4})\.txt$/;

/** Stable official datapack title (UI sync + server migrate key). Filename suffix reflects validation mode. */
export const LONDON_DATAPACK_TITLE = "UCL TSC Chron";

/**
 * generateLondonDatapack() runs all implemented processors (full London → TSC export).
 * Not implemented yet: range chart, blank, bar chart, stacked filled curve (transect geometry), graphic/images (freehand geometry).
 */

type ArkLLithologyRow = { id: number; lithology: string | null };

async function loadJSONS() {
  const datasetsFilePath = join(outputDir, "arkL_datasets.json");
  const eventsFilePath = join(outputDir, "arkL_events.json");
  const intervalsFilePath = join(outputDir, "arkL_intervals.json");
  const columnsFilePath = join(outputDir, "arkL_columns.json");
  const lithologyFilePath = join(outputDir, "arkL_lithology.json");
  const datasets = JSON.parse(await readFile(datasetsFilePath, "utf8"));
  assertarkL_datasetsArray(datasets);
  const events = JSON.parse(await readFile(eventsFilePath, "utf8"));
  assertarkL_eventsArray(events);
  const intervals = JSON.parse(await readFile(intervalsFilePath, "utf8"));
  assertarkL_intervalsArray(intervals);
  const columns = JSON.parse(await readFile(columnsFilePath, "utf8"));
  assertarkL_columnsArray(columns);
  const lithologyRows = JSON.parse(await readFile(lithologyFilePath, "utf8")) as ArkLLithologyRow[];
  const lithologyById = new Map<number, string>();
  for (const row of lithologyRows) {
    if (row.lithology) lithologyById.set(row.id, row.lithology);
  }
  return { datasets, events, intervals, columns, lithologyById };
}

type StringDict = { [key: string]: string[] };
type StringDictSet = { [key: string]: Set<string> };
type ProcessColumnOutput = { path: string; column: string; lines: string[]; sort: number };
type LondonJsonRow = Record<string, unknown>;

const jsonTableCache = new Map<string, LondonJsonRow[]>();

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Popup text for TSC column header lines (tab-delimited); must not contain tabs or raw double quotes. */
function columnHeaderPopup(raw: unknown): string {
  let text = cleanText(raw);
  if (!text) return "";
  const calIdx = text.indexOf("Calibrations");
  if (calIdx >= 0) {
    text = text.slice(calIdx);
    const noteIdx = text.search(/\s+NOTE:/i);
    if (noteIdx >= 0) text = text.slice(0, noteIdx).trim();
  }
  return text.replace(/"/g, "'");
}

/** Clamp r/g/b components to 0–255 for TSC datapack colour fields (e.g. 256/204/215 → 255/204/215). */
function sanitizeTscColour(colour: string | null | undefined): string {
  if (colour === null || colour === undefined) return "";
  const trimmed = String(colour).trim();
  if (!/^\d+\/\d+\/\d+$/.test(trimmed)) return trimmed;
  return trimmed
    .split("/")
    .map((part) => {
      const n = Number(part);
      if (!Number.isFinite(n)) return part;
      return String(Math.min(255, Math.max(0, Math.round(n))));
    })
    .join("/");
}

function isVariesOrNonRgbColour(colour: string | null | undefined): boolean {
  const trimmed = cleanText(colour).toLowerCase();
  return trimmed === "" || trimmed === "varies" || !/^\d+\/\d+\/\d+$/.test(trimmed);
}

/** Event column background: skip "varies" on column/dataset so dataset.event_colour is used (e.g. Paratethys). */
function resolveEventColumnColour(column: arkL_columns, dataset: arkL_datasets): string {
  for (const candidate of [column.colour, dataset.event_colour, dataset.colour]) {
    if (!isVariesOrNonRgbColour(candidate)) {
      return sanitizeTscColour(candidate);
    }
  }
  return "";
}

function isDefiningEventsFadColumn(column: arkL_columns): boolean {
  const name = column.columnx ?? "";
  return /\(FADs\)/i.test(name) || /^Defining events/i.test(name);
}

function normalizeLondonEventType(event: arkL_events): string {
  return cleanText(event.event_type).toLowerCase().replace(/_/g, " ");
}

function isIntervalBoundaryEventType(eventType: string): boolean {
  return eventType === "intv base" || eventType === "intv top";
}

/** When field_if_not_intvx is set, intv base/top rows use that constant TSC line label (e.g. GSSP column). */
function usesFieldIfNotIntvxEventLabel(column: arkL_columns, event: arkL_events): boolean {
  return cleanText(column.field_if_not_intvx) !== "" && isIntervalBoundaryEventType(normalizeLondonEventType(event));
}

type TscEventSubSection = "FAD" | "LAD" | "EVENT";

function mapLondonEventToTscSubSection(event: arkL_events, column: arkL_columns): TscEventSubSection | null {
  if (column.sub_columnE === "additional") {
    const t = (event.event_type ?? "").toUpperCase();
    if (t === "REV") return "FAD";
    if (t === "LCO") return "LAD";
  }
  if (usesFieldIfNotIntvxEventLabel(column, event)) {
    return "FAD";
  }
  if (isDefiningEventsFadColumn(column)) {
    return "FAD";
  }
  const t = (event.event_type ?? "").toUpperCase();
  if (t === "LAD") return "LAD";
  if (t === "FAD") return "FAD";
  if (t === "HORIZON" || t === "TURNOVER") return "EVENT";
  return null;
}

function eventRowLabel(event: arkL_events, column: arkL_columns, trimFadLadPrefix: boolean): string {
  if (usesFieldIfNotIntvxEventLabel(column, event)) {
    return cleanText(column.field_if_not_intvx);
  }
  let label = event.eventx ?? "";
  if (trimFadLadPrefix) {
    label = label.replace(/^\s*(FAD|LAD)\s+/i, "");
  }
  return label;
}

function formatEventDatapackLine(event: arkL_events, column: arkL_columns, trimFadLadPrefix: boolean): string {
  const label = eventRowLabel(event, column, trimFadLadPrefix);
  const display = event.event_display || "";
  const notes = event.notes_2020 !== null ? `\t${cleanText(event.notes_2020)}` : "";
  return `\t${label}\t${event.age}\t${display}${notes}`;
}

function eventColumnPopup(dataset: arkL_datasets): string {
  return columnHeaderPopup(
    dataset.TSC_source_notes ?? dataset.notes_Cenoz ?? dataset.notes_Jur ?? dataset.notes_Cret ?? ""
  );
}

function eventColumnWidth(column: arkL_columns): string | number {
  const w = column.width;
  if (w !== null && w !== undefined && w > 0) return w;
  return "";
}

/** TSC TOP of a chron column: regional scales use column.age_min (e.g. ~200 Ma for Late Triassic), not 0. */
function chronColumnTopAge(column: arkL_columns, chronIntervals: arkL_intervals[]): number {
  if (column.age_min != null && Number.isFinite(column.age_min)) {
    return column.age_min;
  }
  const youngest = chronIntervals[0];
  if (!youngest) return 0;
  return youngest.top_age ?? youngest.top_age2020 ?? 0;
}

function getRowNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

/** Age used to order block rows (youngest first). Prefer base_age — it matches the exported boundary and avoids base_age2020 placeholders of 0 in the DB. */
function blockSortAge(interval: arkL_intervals): number {
  if (interval.base_age !== null && interval.base_age !== undefined) return interval.base_age;
  return interval.base_age2020 ?? 0;
}

/** TOP of a block column = youngest top_age among its intervals (see internal TSC2020 graptolite columns). */
function blockTopAge(intervals: arkL_intervals[]): number {
  let minTop: number | null = null;
  for (const inter of intervals) {
    if (inter.top_age === null || inter.top_age === undefined) continue;
    if (minTop === null || inter.top_age < minTop) minTop = inter.top_age;
  }
  return minTop ?? 0;
}

type BlockLineStyle = "solid" | "dashed" | "dotted";

/** London DB encodes uncertain boundaries in interval_notes (e.g. "DASHED --", "DOTTED --", "DASH --"). */
function inferBlockLineStyleFromNotes(notes: string | null | undefined): BlockLineStyle {
  if (notes === null || notes === undefined) return "solid";
  const trimmed = notes.trim();
  if (!trimmed) return "solid";
  if (/^DOTTED\b/i.test(trimmed)) return "dotted";
  if (/^DASHED\b/i.test(trimmed)) return "dashed";
  if (/^DASH\b/i.test(trimmed)) return "dashed";
  return "solid";
}

function formatBlockIntervalLine(
  label: string,
  age: number,
  lineStyle: BlockLineStyle,
  popup: string,
  colour: string
): string {
  const styleField = lineStyle === "solid" ? "" : lineStyle;
  return `\t${label}\t${age}\t${styleField}\t${popup}\t${colour}`;
}

/** Ma slack between polarity boundary and full-chron label span (London vs TSC2020). */
const CHRON_LABEL_AGE_MARGIN_MA = 0.05;

function chronIntervalDisplayLabel(interval: arkL_intervals): string {
  if (!interval.intervalx) return "";
  if (interval.has_added_abv === "yes") {
    return interval.intervalx.split(" ").slice(0, -1).join(" ") || interval.intervalx;
  }
  return interval.intervalx.replace(/\s*\([^)]+continued\)$/i, "");
}

function chronIntervalTopBase(interval: arkL_intervals): { top: number; base: number } | null {
  const top = interval.top_age ?? interval.top_age2020;
  const base = interval.base_age ?? interval.base_age2020;
  if (top === null || top === undefined || base === null || base === undefined) return null;
  return { top, base };
}

function chronLabelContainsAge(interval: arkL_intervals, age: number): boolean {
  const bounds = chronIntervalTopBase(interval);
  if (!bounds) return false;
  return age >= bounds.top - 1e-9 && age <= bounds.base + CHRON_LABEL_AGE_MARGIN_MA;
}

function findChronLabelInterval(chronLabelIntervals: arkL_intervals[], chronAge: number): arkL_intervals | undefined {
  const matches = chronLabelIntervals.filter((inter) => chronLabelContainsAge(inter, chronAge));
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return matches.reduce((best, cur) => {
    const b = chronIntervalTopBase(best)!;
    const c = chronIntervalTopBase(cur)!;
    return c.base - c.top < b.base - b.top ? cur : best;
  });
}

function getIntervalLabel(interval: arkL_intervals, labelField?: string | null) {
  if (labelField && labelField in interval) {
    const value = interval[labelField as keyof arkL_intervals];
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
    return "";
  }
  const blockLabel = interval.block_label;
  if (blockLabel !== null && blockLabel !== undefined && String(blockLabel).trim() !== "") {
    return String(blockLabel).trim();
  }
  if (interval.intervalx) {
    if (interval.has_added_abv === "yes") {
      return interval.intervalx.split(" ").slice(0, -1).join(" ") || interval.intervalx;
    }
    return interval.intervalx.replace(/\s*\([^)]+continued\)$/i, "");
  }
  return "";
}

function getPointPopup(row: LondonJsonRow) {
  const popupValue =
    row.popup ??
    row.notes ??
    row.notes_2020 ??
    row.notes_2004 ??
    row.compilation_notes ??
    row.note ??
    row.label ??
    row.name ??
    row.eventx;
  return cleanText(popupValue);
}

function getRowAge(row: LondonJsonRow): number | null {
  return getRowNumber(row.age ?? row.age2020 ?? row.age2020_uncorrected);
}

function getRowValue(row: LondonJsonRow, fieldName: string): number | null {
  const trimmed = cleanText(fieldName);
  if (!trimmed) return null;

  const direct = getRowNumber(row[trimmed]);
  if (direct !== null) return direct;

  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) {
      const value = getRowNumber(row[key]);
      if (value !== null) return value;
    }
  }

  if (lower === "deltad_per_mil") return getRowNumber(row.deltaD_per_mil);
  if (lower === "d18o" || lower === "d18o_per_mil") {
    return getRowNumber(row.d18O ?? row.d18o ?? row.O18 ?? row.o18);
  }
  if (lower === "d13c" || lower === "d13c_per_mil") {
    return getRowNumber(row.d13C ?? row.d13c ?? row.C13 ?? row.c13);
  }
  return getRowNumber(row.pointdata1 ?? row.pointdata2);
}

type PointColumnDisplaySettings = {
  lower: number;
  upper: number;
  smoothed: boolean;
  nofill: boolean;
  headerWidth: string;
};

function pointColumnHeaderWidth(column: arkL_columns): string {
  const width = column.width;
  if (width !== null && width !== undefined && Number(width) > 0) {
    return String(width);
  }
  return "200";
}

/** Fixed Y-axis / smoothing rules for known curves (from datapack spec, not read from any .txt at runtime). */
const POINT_COLUMN_DISPLAY_BY_NAME: Record<
  string,
  Pick<PointColumnDisplaySettings, "lower" | "upper" | "smoothed" | "nofill">
> = {
  "Loess Mag Susc (schematic, past 1 myr)": { lower: 0, upper: 230, smoothed: false, nofill: false },
  "Antarctic delta-Deuterium (per-mil)": { lower: -450, upper: -360, smoothed: false, nofill: false },
  "Antarctic CO2 (ppmv)": { lower: 180, upper: 300, smoothed: false, nofill: false },
  "Insolation 65N Wm2": { lower: 335, upper: 410, smoothed: false, nofill: false },
  Eccentricity: { lower: 0.06, upper: 0, smoothed: false, nofill: false },
  Obliquity: { lower: 21.5, upper: 25, smoothed: false, nofill: false },
  Precession: { lower: 0.06, upper: -0.06, smoothed: false, nofill: false },
  "Strontium 87/86": { lower: 0.706, upper: 0.71, smoothed: true, nofill: true }
};

function resolvePointColumnDisplay(column: arkL_columns, values: number[]): PointColumnDisplaySettings {
  const columnName = column.columnx ?? "";
  const preset = POINT_COLUMN_DISPLAY_BY_NAME[columnName];
  if (preset) {
    return {
      lower: preset.lower,
      upper: preset.upper,
      smoothed: preset.smoothed,
      nofill: preset.nofill,
      headerWidth: pointColumnHeaderWidth(column)
    };
  }

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 100;
  const { lowerRange, upperRange } = calculateAutoScale(min, max);
  return {
    lower: lowerRange,
    upper: upperRange,
    smoothed: false,
    nofill: /strontium/i.test(columnName),
    headerWidth: pointColumnHeaderWidth(column)
  };
}

/** Transect: London has no exported geometry yet (stacked filled curve / bar chart metadata only). */
async function processTransectColumns(columns: arkL_columns[]): Promise<ProcessColumnOutput[]> {
  const candidates = columns.filter(
    (column) => column.column_type === "stacked filled curve" || column.columnx === "Major Evaporite Seals"
  );
  if (candidates.length > 0) {
    console.log(
      chalk.yellow(
        `Skipping ${candidates.length} transect-like London column(s) — no transect source rows in sql-to-json export yet`
      )
    );
  }
  return [];
}

/** Freehand: London graphic/images columns have no image-placement rows in export yet. */
async function processFreehandColumns(columns: arkL_columns[]): Promise<ProcessColumnOutput[]> {
  const candidates = columns.filter((column) => column.column_type === "graphic" || column.column_type === "images");
  if (candidates.length > 0) {
    console.log(
      chalk.yellow(
        `Skipping ${candidates.length} freehand-like London column(s) — no freehand source rows in sql-to-json export yet`
      )
    );
  }
  return [];
}

/** TSC2020 only tags `smoothed` when smoothing is on; omit otherwise (parser default is unsmoothed). */
function pointColumnRangeSuffix(smoothed: boolean): string {
  return smoothed ? "\tsmoothed" : "";
}

function derivePointAgeDecimalPlaces(ages: number[]): number {
  let minDelta = Infinity;
  for (let i = 1; i < ages.length; i++) {
    const delta = Math.abs(ages[i]! - ages[i - 1]!);
    if (delta > 0 && delta < minDelta) minDelta = delta;
  }
  if (!Number.isFinite(minDelta) || minDelta >= 0.01) return 3;
  if (minDelta >= 0.0001) return 5;
  return 7;
}

function formatPointAge(age: number, decimalPlaces: number): string {
  return String(Number(age.toFixed(decimalPlaces)));
}

async function loadPointdataRows(column: arkL_columns, _events: arkL_events[]): Promise<LondonJsonRow[]> {
  const tableName = cleanText(column.pointdata_table);
  if (!tableName) return [];

  const sourceRows = await loadJsonTable(tableName);
  if (tableName === "arkL_events") {
    const datasetId = column.dataset_id;
    if (datasetId == null) return [];
    return sourceRows.filter((row) => getRowNumber(row.dataset_id) === datasetId);
  }
  return sourceRows;
}

async function loadJsonTable(tableName: string): Promise<LondonJsonRow[]> {
  if (jsonTableCache.has(tableName)) {
    return jsonTableCache.get(tableName)!;
  }
  const filePath = join(outputDir, `${tableName}.json`);
  try {
    const rows = JSON.parse(await readFile(filePath, "utf8"));
    if (Array.isArray(rows)) {
      jsonTableCache.set(tableName, rows as LondonJsonRow[]);
      return rows as LondonJsonRow[];
    }
  } catch {
    // Missing pointdata tables are handled by skipping that column.
  }
  jsonTableCache.set(tableName, []);
  return [];
}

type SequenceExportMode = "sequence" | "tr" | "mega";

function effectiveSubdatasetId(column: arkL_columns): number | null {
  const subId = column.subdataset_id;
  if (subId === null || subId === undefined || subId === 0) return null;
  return subId;
}

/** Event ids linked to sequence intervals (top/base/mfs), keyed as `${datasetId}:${subdatasetId}`. */
function buildSequenceIntervalEventIds(intervals: arkL_intervals[]): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const interval of intervals) {
    if (interval.dataset_id == null) continue;
    const subId = interval.subdataset_id ?? 0;
    const key = `${interval.dataset_id}:${subId}`;
    if (!map.has(key)) map.set(key, new Set());
    const ids = map.get(key)!;
    for (const field of ["top_id", "base_id", "mfs_id"] as const) {
      const eventId = interval[field];
      if (typeof eventId === "number") ids.add(eventId);
    }
  }
  return map;
}

function sequenceDatasetPopup(dataset: arkL_datasets): string {
  return columnHeaderPopup(
    dataset.TSC_source_notes ??
      dataset.notes_PermoCarb ??
      dataset.notes_Jur ??
      dataset.notes_Cret ??
      dataset.notes_Dev ??
      dataset.notes_SilOrd ??
      dataset.notes_Cenoz ??
      ""
  );
}

function getSequenceExportMode(column: arkL_columns): SequenceExportMode {
  const subtype = cleanText(column.column_subtype).toLowerCase();
  const name = column.columnx ?? "";
  if (subtype === "trmega" || /mega\s*t-?\s*r/i.test(name)) return "mega";
  if (subtype === "tr" || /t-?\s*r[\s-]*(cycle|episode)/i.test(name)) return "tr";
  if (/t-?\s*r[\s-]*trend/i.test(name)) return "tr";
  return "sequence";
}

function getSequenceTscColumnType(column: arkL_columns): "sequence" | "trend" {
  const name = column.columnx ?? "";
  if (/t-?\s*r[\s-]*(cycle|episode|trend)/i.test(name) || /mega\s*t-?\s*r/i.test(name)) return "trend";
  return "sequence";
}

function trCycleToSeverity(value: string | null | undefined): string {
  const v = cleanText(value);
  if (!v) return "";
  const match = v.match(/^T[\s-]*(major|medium|minor)$/i);
  if (match) return match[1]!.charAt(0).toUpperCase() + match[1]!.slice(1).toLowerCase();
  if (v.toUpperCase() === "R") return "Minor";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function normalizeSequenceSeverity(severity: string): string | null {
  const trimmed = severity.trim();
  if (!trimmed) return null;
  if (/^major$/i.test(trimmed)) return "Major";
  if (/^medium$/i.test(trimmed) || /^mediium$/i.test(trimmed)) return "Medium";
  if (/^minor$/i.test(trimmed)) return "Minor";
  if (trimmed === "Major" || trimmed === "Medium" || trimmed === "Minor") return trimmed;
  return null;
}

function sequenceSeverity(event: arkL_events, mode: SequenceExportMode): string | null {
  if (mode === "mega") return normalizeSequenceSeverity(trCycleToSeverity(event.Mega_TR_cycle));
  if (mode === "tr") {
    const fromTr = normalizeSequenceSeverity(trCycleToSeverity(event.TR_cycle));
    if (fromTr) return fromTr;
  }
  const scale = cleanText(event.seq_scale);
  if (!scale) return null;
  if (/^T[\s-]/i.test(scale)) return normalizeSequenceSeverity(trCycleToSeverity(scale));
  return normalizeSequenceSeverity(scale.charAt(0).toUpperCase() + scale.slice(1).toLowerCase());
}

function sequenceEventLabel(event: arkL_events, direction: "SB" | "MFS"): string {
  if (direction === "MFS") return "";
  let label = cleanText(event.TR_name || event.eventx);
  label = label.replace(/seqbdy/gi, "").trim();
  label = label.replace(/\s+(SB|MFS|LST)$/i, "").trim();
  return label;
}

function isSequenceBoundaryEvent(event: arkL_events): boolean {
  const et = normalizeLondonEventType(event);
  return et === "seq bdy" || et === "mfs" || et === "lst";
}

function eventMatchesSequenceMode(event: arkL_events, mode: SequenceExportMode): boolean {
  if (!isSequenceBoundaryEvent(event)) return false;
  if (mode === "mega") return cleanText(event.Mega_TR_cycle) !== "";
  if (mode === "tr") return cleanText(event.TR_cycle) !== "";
  return cleanText(event.seq_scale) !== "";
}

function selectSequenceEventsForColumn(
  column: arkL_columns,
  events: arkL_events[],
  intervalEventIds: Map<string, Set<number>>,
  mode: SequenceExportMode
): arkL_events[] {
  const datasetId = column.dataset_id;
  if (datasetId == null) return [];

  const subId = effectiveSubdatasetId(column);
  let pool: arkL_events[];
  if (subId != null) {
    const linkedIds = intervalEventIds.get(`${datasetId}:${subId}`);
    if (!linkedIds || linkedIds.size === 0) return [];
    pool = events.filter((event) => linkedIds.has(event.id));
  } else {
    pool = events.filter((event) => event.dataset_id === datasetId);
  }

  return pool
    .filter((event) => event.age !== null && event.age !== undefined && eventMatchesSequenceMode(event, mode))
    .sort((a, b) => a.age! - b.age!);
}

function formatSequenceEventLine(event: arkL_events, mode: SequenceExportMode): string | null {
  const eventType = normalizeLondonEventType(event);
  // TSC sequence/trend blocks only accept SB and MFS (LST is used internally for onlap math, not exported here).
  if (eventType === "lst") return null;
  if (eventType !== "seq bdy" && eventType !== "mfs") return null;

  const direction: "SB" | "MFS" = eventType === "seq bdy" ? "SB" : "MFS";
  const severity = sequenceSeverity(event, mode);
  if (!severity) return null;

  const label = sequenceEventLabel(event, direction);
  const age = event.age;
  if (age === null || age === undefined) return null;

  const popup = cleanText(event.notes_2020 ?? event.sea_level_notes ?? "");
  const popupField = popup ? `\t${popup}` : "";
  return `\t${label}\t${direction}\t${Number(age.toFixed(3))}\t${severity}${popupField}`;
}

/** Pen-down value between onlap segments (TSC2020 coastal onlap segmented). */
const ONLAP_SEGMENT_BREAK = -150;

const COASTAL_ONLAP_COLUMN_POPUP =
  "Coastal onlap for CENOZOIC = offsets from long-term curve are directly from Hardenbol et al. (SEPM charts, 1998). MESOZOIC-PALEOZOIC = Schematic with SB Falls set from Bilal Haq's diagrams as Minor SB = 20m, Medium = 45m, Major = 80m relative to long-term envelope, based on advise from B. Haq to J.Ogg.  [Cret = Haq'2014; Jur = Haq'2017; Tri = Haq'2018; Paleozoic = Haq and Schutter, 2008]";

const OFFLAP_FALL_BY_SCALE: Record<string, number> = {
  minor: 20,
  medium: 45,
  major: 80
};

type OnlapPoint = { age: number; onlap: number };

function resolveSlChange(event: arkL_events): number {
  const explicit = getRowNumber(event.sl_change);
  if (explicit !== null && explicit > 0) return explicit;
  const scale = cleanText(event.seq_scale).toLowerCase();
  return OFFLAP_FALL_BY_SCALE[scale] ?? 45;
}

function lerpValue(from: number, to: number, fraction: number): number {
  return from + fraction * (to - from);
}

/**
 * Five age–onlap points per London sequence notes (calc order 1 → 5 → 3 → 2 → 4).
 * 1 top: prev SB age (interval top_id), onlap = MFS longterm_sl
 * 5 SB: base SB age, onlap = longterm_sl − sl_change
 * 3 MFS: MFS age, onlap = 0.5 × (1 → 5)
 * 2 crest: 0.5 × (3 → 1) age, 0.75 × (3 → 1) onlap
 * 4 LST: 0.333 × (5 → 3) age, 0.667 × (3 → 5) onlap
 */
function computeSequenceOnlapPoints(mfs: arkL_events, sb: arkL_events, prevSbAge: number | null): OnlapPoint[] {
  const mfsLt = getRowNumber(mfs.longterm_sl);
  const sbLt = getRowNumber(sb.longterm_sl);
  const mfsAge = mfs.age;
  const sbAge = sb.age;
  if (mfsLt === null || sbLt === null || mfsAge == null || sbAge == null) return [];

  const topAge = prevSbAge ?? sbAge;
  const sbActual = sbLt - resolveSlChange(sb);

  const p1: OnlapPoint = { age: topAge, onlap: mfsLt };
  const p5: OnlapPoint = { age: sbAge, onlap: sbActual };
  const p3: OnlapPoint = { age: mfsAge, onlap: lerpValue(p1.onlap, p5.onlap, 0.5) };
  const p2: OnlapPoint = {
    age: lerpValue(p3.age, p1.age, 0.5),
    onlap: lerpValue(p3.onlap, p1.onlap, 0.75)
  };
  const p4: OnlapPoint = {
    age: lerpValue(p5.age, p3.age, 0.333),
    onlap: lerpValue(p3.onlap, p5.onlap, 0.667)
  };
  return [p1, p5, p3, p2, p4];
}

function getSequenceIntervalsForDataset(datasetId: number, intervals: arkL_intervals[]): arkL_intervals[] {
  return intervals
    .filter(
      (interval) =>
        interval.dataset_id === datasetId &&
        interval.interval_type === "sequence" &&
        interval.mfs_id != null &&
        interval.base_id != null
    )
    .sort((a, b) => (a.base_age ?? 0) - (b.base_age ?? 0));
}

function buildCoastalOnlapSeries(
  datasetId: number,
  events: arkL_events[],
  intervals: arkL_intervals[],
  segmented: boolean
): OnlapPoint[] {
  const eventById = new Map<number, arkL_events>();
  for (const event of events) {
    if (event.dataset_id === datasetId) eventById.set(event.id, event);
  }

  const sequenceIntervals = getSequenceIntervalsForDataset(datasetId, intervals);
  const staged: { age: number; onlap: number; sortKey: number }[] = [];

  for (let cycleIndex = 0; cycleIndex < sequenceIntervals.length; cycleIndex++) {
    const interval = sequenceIntervals[cycleIndex]!;
    const mfs = eventById.get(interval.mfs_id!);
    const sb = eventById.get(interval.base_id!);
    if (!mfs || !sb) continue;
    if (!cleanText(mfs.seq_scale) || mfs.age == null || getRowNumber(mfs.longterm_sl) === null) continue;
    if (getRowNumber(sb.longterm_sl) === null || sb.age == null) continue;

    const topEvent = interval.top_id != null ? eventById.get(interval.top_id) : undefined;
    const prevSbAge = topEvent?.age ?? null;

    const cyclePoints = computeSequenceOnlapPoints(mfs, sb, prevSbAge);
    if (cyclePoints.length === 0) continue;

    const sortBase = cycleIndex * 100000 + mfs.age! * 1000;
    cyclePoints.forEach((point, index) => {
      staged.push({ ...point, sortKey: sortBase + index });
    });

    if (segmented) {
      const sbLt = getRowNumber(sb.longterm_sl)!;
      const sbOnlap = sbLt - resolveSlChange(sb);
      const sbAge = sb.age!;
      staged.push(
        { age: sbAge, onlap: sbOnlap, sortKey: sortBase + 10 },
        { age: sbAge, onlap: sbOnlap, sortKey: sortBase + 11 },
        { age: sbAge, onlap: ONLAP_SEGMENT_BREAK, sortKey: sortBase + 12 },
        { age: sbAge, onlap: sbLt, sortKey: sortBase + 13 }
      );
    }
  }

  staged.sort((a, b) => a.age - b.age || a.sortKey - b.sortKey);
  const series = staged.map(({ age, onlap }) => ({ age, onlap }));
  if (!series.some((point) => point.age === 0)) {
    series.unshift({ age: 0, onlap: 0 });
  }
  return series;
}

/** Short-term envelope: same 5 age–level points per sequence as coastal onlap (unsegmented). */
function buildShortTermPhanerozoicSeries(
  datasetId: number,
  events: arkL_events[],
  intervals: arkL_intervals[]
): OnlapPoint[] {
  return buildCoastalOnlapSeries(datasetId, events, intervals, false);
}

/** Mean sea level at each MFS: 0.5 × (MFS longterm + SB actual), per London notes. */
function buildMeanSeaLevelSeries(datasetId: number, events: arkL_events[], intervals: arkL_intervals[]): OnlapPoint[] {
  const eventById = new Map<number, arkL_events>();
  for (const event of events) {
    if (event.dataset_id === datasetId) eventById.set(event.id, event);
  }

  const staged: { age: number; onlap: number; sortKey: number }[] = [];
  const sequenceIntervals = getSequenceIntervalsForDataset(datasetId, intervals);

  for (let cycleIndex = 0; cycleIndex < sequenceIntervals.length; cycleIndex++) {
    const interval = sequenceIntervals[cycleIndex]!;
    const mfs = eventById.get(interval.mfs_id!);
    const sb = eventById.get(interval.base_id!);
    if (!mfs || !sb) continue;
    if (!cleanText(mfs.seq_scale) || mfs.age == null || getRowNumber(mfs.longterm_sl) === null) continue;
    const sbLt = getRowNumber(sb.longterm_sl);
    if (sbLt === null || sb.age == null) continue;

    const mfsLt = getRowNumber(mfs.longterm_sl)!;
    const sbActual = sbLt - resolveSlChange(sb);
    staged.push({
      age: mfs.age,
      onlap: lerpValue(mfsLt, sbActual, 0.5),
      sortKey: cycleIndex
    });
  }

  staged.sort((a, b) => a.age - b.age || a.sortKey - b.sortKey);
  const series = staged.map(({ age, onlap }) => ({ age, onlap }));
  if (!series.some((point) => point.age === 0)) {
    series.unshift({ age: 0, onlap: 0 });
  }
  return series;
}

/** Long-term envelope: longterm_sl at each sequence SB and MFS event. */
function buildLongTermPhanerozoicSeries(datasetId: number, events: arkL_events[]): OnlapPoint[] {
  const staged = events
    .filter((event) => {
      if (event.dataset_id !== datasetId) return false;
      const eventType = normalizeLondonEventType(event);
      if (eventType !== "mfs" && eventType !== "seq bdy") return false;
      if (!cleanText(event.seq_scale)) return false;
      if (event.age == null || getRowNumber(event.longterm_sl) === null) return false;
      return true;
    })
    .map((event, index) => ({
      age: event.age!,
      onlap: getRowNumber(event.longterm_sl)!,
      sortKey: index
    }));

  staged.sort((a, b) => a.age - b.age || a.sortKey - b.sortKey);
  const series = staged.map(({ age, onlap }) => ({ age, onlap }));

  const presentLt = events.find(
    (event) =>
      event.dataset_id === datasetId && /modern/i.test(event.eventx ?? "") && getRowNumber(event.longterm_sl) !== null
  );
  const presentOnlap = presentLt ? getRowNumber(presentLt.longterm_sl)! : -30;
  if (!series.some((point) => point.age === 0)) {
    series.unshift({ age: 0, onlap: presentOnlap });
  }
  return series;
}

function formatOnlapPointLine(age: number, onlap: number): string {
  return `\t${Number(age.toFixed(3))}\t${Number(Number(onlap).toFixed(2))}`;
}

type SeaLevelCurveKind = "coastal-onlap-segmented" | "coastal-onlap-curve" | "short-term" | "mean" | "long-term";

function classifySeaLevelCurveColumn(column: arkL_columns): SeaLevelCurveKind | null {
  const name = column.columnx ?? "";
  if (/coastal onlap segmented/i.test(name)) return "coastal-onlap-segmented";
  if (/coastal onlap curve/i.test(name)) return "coastal-onlap-curve";
  if (/short-term phanerozoic/i.test(name)) return "short-term";
  if (/mean sea level/i.test(name)) return "mean";
  if (/long-term phanerozoic/i.test(name)) return "long-term";
  return null;
}

function buildSeaLevelCurveSeries(
  kind: SeaLevelCurveKind,
  datasetId: number,
  events: arkL_events[],
  intervals: arkL_intervals[]
): OnlapPoint[] {
  switch (kind) {
    case "coastal-onlap-segmented":
      return buildCoastalOnlapSeries(datasetId, events, intervals, true);
    case "coastal-onlap-curve":
      return buildCoastalOnlapSeries(datasetId, events, intervals, false);
    case "short-term":
      return buildShortTermPhanerozoicSeries(datasetId, events, intervals);
    case "mean":
      return buildMeanSeaLevelSeries(datasetId, events, intervals);
    case "long-term":
      return buildLongTermPhanerozoicSeries(datasetId, events);
    default:
      return [];
  }
}

function seaLevelCurveSettings(kind: SeaLevelCurveKind): {
  titleFlag: string;
  lowerRange: number;
  upperRange: number;
} {
  if (kind === "coastal-onlap-segmented") {
    return { titleFlag: "on", lowerRange: -150, upperRange: 280 };
  }
  if (kind === "short-term") {
    return { titleFlag: "off", lowerRange: -150, upperRange: 285 };
  }
  return { titleFlag: "off", lowerRange: -150, upperRange: 280 };
}

async function processSeaLevelCurveColumns(
  events: arkL_events[],
  columns: arkL_columns[],
  datasets: arkL_datasets[],
  intervals: arkL_intervals[]
): Promise<ProcessColumnOutput[]> {
  const outputs: ProcessColumnOutput[] = [];

  for (const column of columns) {
    if (column.column_type !== "sea-level curve") continue;
    if (column.pointdata_table !== "sequence data") continue;

    const kind = classifySeaLevelCurveColumn(column);
    if (!kind) continue;

    const dataset = datasets.find((item) => item.id === column.dataset_id);
    if (!dataset) {
      console.log(chalk.yellow(`missing dataset for ${column.columnx}`));
      continue;
    }

    const datasetId = column.dataset_id;
    if (datasetId == null) continue;

    const series = buildSeaLevelCurveSeries(kind, datasetId, events, intervals);
    if (series.length === 0) {
      console.log(chalk.yellow(`no sea-level points for ${column.columnx}`));
      continue;
    }

    const popup = columnHeaderPopup(column.TSC_notes ?? COASTAL_ONLAP_COLUMN_POPUP);
    const { titleFlag, lowerRange, upperRange } = seaLevelCurveSettings(kind);
    const lines: string[] = [];
    lines.push(`${column.columnx}\tpoint\t${column.width || "200"}\t\t\t${titleFlag}\t${popup}`);
    lines.push(`nopoints\tline\t\t${lowerRange}\t${upperRange}\tsmoothed`);
    for (const point of series) {
      lines.push(formatOnlapPointLine(point.age, point.onlap));
    }
    lines.push("");

    if (column.path && column.columnx) {
      outputs.push({
        path: column.path,
        column: column.columnx,
        lines,
        sort: column.sort ?? 0
      });
    }
  }

  return outputs;
}

async function processSequenceColumns(
  events: arkL_events[],
  columns: arkL_columns[],
  datasets: arkL_datasets[],
  intervals: arkL_intervals[]
) {
  const sequenceColumns: ProcessColumnOutput[] = [];
  const intervalEventIds = buildSequenceIntervalEventIds(intervals);

  for (const column of columns) {
    if (column.column_type !== "sequence") continue;

    const dataset = datasets.find((item) => item.id === column.dataset_id);
    if (!dataset) {
      console.log(chalk.yellow("missing dataset id for " + column.columnx));
      continue;
    }

    const mode = getSequenceExportMode(column);
    const sequenceEvents = selectSequenceEventsForColumn(column, events, intervalEventIds, mode);
    if (sequenceEvents.length === 0) {
      console.log(
        chalk.yellow(
          `missing sequence events for ${column.columnx} (mode=${mode}, dataset=${column.dataset_id}, subdataset=${column.subdataset_id ?? "all"})`
        )
      );
      continue;
    }

    const lines: string[] = [];
    const colour = sanitizeTscColour(column.colour || dataset.colour);
    const popup = sequenceDatasetPopup(dataset);
    const tscType = getSequenceTscColumnType(column);
    lines.push(`${column.columnx}\t${tscType}\t${column.width || ""}\t${colour}\tnotitle\toff\t${popup}`);

    for (const event of sequenceEvents) {
      const row = formatSequenceEventLine(event, mode);
      if (row) lines.push(row);
    }

    if (lines.length <= 1) {
      console.log(chalk.yellow(`no exportable sequence rows for ${column.columnx}`));
      continue;
    }

    lines.push("");
    if (column.path && column.columnx) {
      sequenceColumns.push({
        path: column.path,
        column: column.columnx,
        lines,
        sort: column.sort ?? 0
      });
    }
  }
  return sequenceColumns;
}

async function processEventColumns(datasets: arkL_datasets[], columns: arkL_columns[], events: arkL_events[]) {
  const eventColumns: ProcessColumnOutput[] = [];
  const sectionOrder: TscEventSubSection[] = ["LAD", "FAD", "EVENT"];
  for (const column of columns) {
    const columnLines: string[] = [];
    if (column.column_type === "events") {
      const dataset = datasets.find((dataset) => dataset.id === column.dataset_id);
      if (!dataset) {
        console.log(chalk.yellow("missing dataset id for " + column.columnx));
        continue;
      }
      const dbEvents = events
        .filter((event) => event.column_id === column.id && event.age !== null && event.age !== undefined)
        .sort((a, b) => a.age! - b.age!);
      const bySection: Record<TscEventSubSection, arkL_events[]> = { LAD: [], FAD: [], EVENT: [] };
      for (const event of dbEvents) {
        const section = mapLondonEventToTscSubSection(event, column);
        if (section) bySection[section].push(event);
      }

      if (bySection.LAD.length + bySection.FAD.length + bySection.EVENT.length === 0) {
        console.log(chalk.yellow("no exportable events for " + column.columnx));
        continue;
      }

      const colour = resolveEventColumnColour(column, dataset);
      const popup = eventColumnPopup(dataset);
      const trimPrefix = isDefiningEventsFadColumn(column);
      const line = `${column.columnx}\tevent\t${eventColumnWidth(column)}\t${colour}\tnotitle\toff\t${popup}`;
      columnLines.push(line);

      for (const section of sectionOrder) {
        const sectionEvents = bySection[section];
        if (sectionEvents.length === 0) continue;
        columnLines.push(section);
        for (const event of sectionEvents) {
          columnLines.push(formatEventDatapackLine(event, column, trimPrefix));
        }
      }
      //for blank space between columns for tscreator to parse
      columnLines.push("");
      if (column.path && column.columnx) {
        eventColumns.push({
          path: column.path,
          column: column.columnx,
          lines: columnLines,
          sort: column.sort ?? 0
        });
      }
    }
  }
  return eventColumns;
}

async function processBlockColumns(datasets: arkL_datasets[], columns: arkL_columns[], intervals: arkL_intervals[]) {
  const blockColumns: ProcessColumnOutput[] = [];
  for (const column of columns) {
    if (
      column.column_type?.includes("interval") &&
      !column.interval_type?.includes("sequence") &&
      !column.interval_type?.includes("chron")
    ) {
      const columnLines: string[] = [];
      const dataset = datasets.find((dataset) => dataset.id === column.dataset_id);
      if (!dataset) {
        console.log(chalk.yellow("missing dataset id for " + column.columnx));
        continue;
      }
      const intervalColumnId = column.source_col_id ?? column.id;
      const dbIntervals = intervals
        .filter(
          (interval) =>
            interval.column_id === intervalColumnId && interval.base_age !== null && interval.base_age !== undefined
        )
        .sort((a, b) => blockSortAge(a) - blockSortAge(b));
      if (dbIntervals.length === 0) {
        console.log(chalk.yellow("no blocks found for " + column.columnx));
        continue;
      }
      const popup = columnHeaderPopup(column.TSC_notes ?? dataset.TSC_source_notes ?? dataset.notes_Jur ?? "");
      const defaultWidth =
        column.columnx === "Chinese Loess divisions"
          ? "60"
          : column.columnx === "Ukrainian Loess Plain stages"
            ? "100"
            : "";
      const defaultColour =
        column.columnx === "Chinese Loess divisions" && isVariesOrNonRgbColour(column.colour) ? "225/255/255" : "";
      const columnColour = sanitizeTscColour(column.colour || defaultColour || dataset.colour || "");
      const line = `${column.columnx}\tblock\t${column.width || defaultWidth}\t${columnColour}\tnotitle\toff\t${popup}`;
      columnLines.push(line);
      const topAge = blockTopAge(dbIntervals);
      const topInterval =
        dbIntervals.find((inter) => inter.top_age !== null && inter.top_age === topAge) ?? dbIntervals[0];
      columnLines.push(
        formatBlockIntervalLine(
          "TOP",
          topAge,
          inferBlockLineStyleFromNotes(topInterval?.interval_notes),
          cleanText(topInterval?.interval_notes),
          ""
        )
      );
      for (const inter of dbIntervals) {
        //london database is missing data
        if (inter.base_age === null) continue;
        //if col_if_not_intvx is defined, it indicates the label that appears on TSC.
        //ex. block_label
        const label = getIntervalLabel(
          inter,
          column.field_if_not_intvx !== "" && column.field_if_not_intvx !== null ? column.field_if_not_intvx : null
        );
        if (!label) continue;
        const intervalNotes = cleanText(inter.interval_notes);
        columnLines.push(
          formatBlockIntervalLine(
            label,
            inter.base_age,
            inferBlockLineStyleFromNotes(inter.interval_notes),
            intervalNotes,
            sanitizeTscColour(inter.colour || columnColour)
          )
        );
      }
      columnLines.push("");
      if (column.path && column.columnx) {
        blockColumns.push({
          path: column.path,
          column: column.columnx,
          lines: columnLines,
          sort: column.sort ?? 0
        });
      }
    }
  }
  return blockColumns;
}

async function processChronColumns(datasets: arkL_datasets[], columns: arkL_columns[], intervals: arkL_intervals[]) {
  const chronColumns: ProcessColumnOutput[] = [];
  for (const column of columns) {
    if (
      column.column_type?.includes("interval") &&
      column.interval_type?.includes("chron") &&
      !column.columnx?.includes("Chron Label ") &&
      !column.columnx?.includes("Series Label")
    ) {
      const columnLines: string[] = [];
      const dataset = datasets.find((dataset) => dataset.id === column.dataset_id);
      if (!dataset) {
        console.log(chalk.yellow("missing dataset id for " + column.columnx));
        continue;
      }

      // There must be a space after chron label, if broken, space might have been removed so check for that
      const chronLabelColumn = columns.find(
        (col) =>
          col.columnx?.includes("Chron Label") && col.dataset_id === column.dataset_id && col.path === column.path
      );
      if (!chronLabelColumn) {
        console.log(chalk.yellow("missing chron label column for " + column.columnx));
        continue;
      }
      const chronSeriesColumn = columns.find(
        (col) =>
          col.columnx?.includes("Series Label") && col.dataset_id === column.dataset_id && col.path === column.path
      );
      if (!chronSeriesColumn) {
        console.log(chalk.yellow("missing chron series column for " + column.columnx));
        continue;
      }

      let chronIntervals = [];
      let chronLabelIntervals = [];
      let chronSeriesIntervals = [];

      const path = column.path || "";
      if (path === null || path === "") {
        console.log(chalk.yellow("missing path for " + column.columnx));
        continue;
      }

      chronIntervals = intervals
        .filter(
          (interval) =>
            interval.column_id === column.id &&
            interval.base_age2020 !== null &&
            interval.base_age !== null &&
            interval.polarity !== null &&
            interval.intervalx !== null
        )
        .sort((a, b) => a.base_age2020! - b.base_age2020!);
      if (chronIntervals.length === 0) {
        console.log(chalk.yellow("no chron intervals found for " + column.columnx));
        continue;
      }

      chronLabelIntervals = chronLabelColumn
        ? intervals
            .filter((interval) => interval.column_id === chronLabelColumn.id && interval.base_age2020 !== null)
            .sort((a, b) => a.base_age2020! - b.base_age2020!)
        : [];
      if (chronLabelIntervals.length === 0 && chronLabelColumn) {
        console.log(chalk.yellow("no chron label intervals found for " + column.columnx));
        continue;
      }

      chronSeriesIntervals = chronSeriesColumn
        ? intervals
            .filter((interval) => interval.column_id === chronSeriesColumn.id && interval.base_age2020 !== null)
            .sort((a, b) => a.base_age2020! - b.base_age2020!)
        : [];
      if (chronSeriesIntervals.length === 0 && chronSeriesColumn) {
        console.log(chalk.yellow("no chron series intervals found for " + column.columnx));
        continue;
      }

      const popup = dataset.notes_Jur;
      let line = `${column.columnx}\tchron\t${column.width || ""}\t${sanitizeTscColour(column.colour || dataset.colour || "")}\tnotitle\toff\t${
        popup !== null ? popup.replace(/[\r\n]+/g, " ") : ""
      }`;
      columnLines.push(line);

      let topWritten = false;
      let prevSeries = "";

      for (const chronInter of chronIntervals) {
        const chronAge = chronInter.base_age ?? chronInter.base_age2020!;

        const chronLabel = findChronLabelInterval(chronLabelIntervals, chronAge);
        if (!chronLabel) {
          console.log(
            chalk.yellow(`No chron label found for interval ${chronInter.intervalx} in column ${column.columnx}`)
          );
          continue;
        }
        const chronSeries = chronSeriesIntervals.find((inter) => {
          const interBase = inter.base_age != null ? inter.base_age : inter.base_age2020;
          const interTop = inter.top_age != null ? inter.top_age : inter.top_age2020;
          return interTop != null && interBase != null && interBase >= chronAge && interTop <= chronAge;
        });
        if (!chronSeries) {
          console.log(
            chalk.yellow(`No chron series found for interval ${chronInter.intervalx} in column ${column.columnx}`)
          );
          continue;
        }

        if (chronSeries?.intervalx !== prevSeries) {
          prevSeries = chronSeries?.intervalx ?? "";
          if (prevSeries != "") {
            line = `${chronSeries?.intervalx || ""}\tPrimary`;
            columnLines.push(line);
          }
          if (!topWritten) {
            const topAge = chronColumnTopAge(column, chronIntervals);
            columnLines.push(`\tTOP\t\t${Number(topAge.toFixed(3))}`);
            topWritten = true;
          }
        }

        const polarity = chronInter.polarity === "n" ? "N" : chronInter.polarity === "r" ? "R" : "U";

        // Column label = parent full chron (Chron Label column); subchron name goes in popup only.
        const label = chronIntervalDisplayLabel(chronLabel);

        let chronPopup = "";
        if (
          chronInter.compilation_notes !== null &&
          chronInter.compilation_notes !== undefined &&
          chronInter.compilation_notes !== ""
        ) {
          chronPopup = String(chronInter.compilation_notes).replace(/[\r\n]+/g, " ");
        } else {
          chronPopup = chronIntervalDisplayLabel(chronInter);
        }

        line = `\t${polarity}\t${label}\t${Number(chronAge.toFixed(3))}\t${chronPopup}`;
        columnLines.push(line);
      }

      columnLines.push("");
      if (column.path && column.columnx) {
        chronColumns.push({
          path: column.path,
          column: column.columnx,
          lines: columnLines,
          sort: column.sort ?? 0
        });
      }
    }
  }
  return chronColumns;
}

function isFaciesGraphicColumn(column: arkL_columns): boolean {
  if (column.column_type !== "lithology") return false;
  const name = column.columnx ?? "";
  return name.includes("graphic log") || name.endsWith(" beds");
}

function findFaciesSeriesColumn(columns: arkL_columns[], faciesColumn: arkL_columns): arkL_columns | undefined {
  return columns.find(
    (col) =>
      col.dataset_id === faciesColumn.dataset_id &&
      col.path === faciesColumn.path &&
      col.id !== faciesColumn.id &&
      (/series label/i.test(col.columnx ?? "") || /\bSeries\b/i.test(col.columnx ?? ""))
  );
}

function findFaciesFormationLabelColumn(columns: arkL_columns[], faciesColumn: arkL_columns): arkL_columns | undefined {
  return columns.find(
    (col) =>
      col.dataset_id === faciesColumn.dataset_id &&
      col.path === faciesColumn.path &&
      col.id !== faciesColumn.id &&
      (col.columnx?.includes("Facies Label") ||
        col.columnx?.includes("Formations") ||
        col.columnx?.includes("Lithostrat - units"))
  );
}

/** Match TSC pattern PNG basename (e.g. Shallow-marine marl, Fine-grained sandstone). */
function tscPatternNameFromLithology(lithology: string): string {
  const trimmed = lithology.trim();
  if (!trimmed) return trimmed;
  if (trimmed.toLowerCase() === "gap") return "Gap";
  const normalized = trimmed.replace(/\s+-\s+/g, "-");
  return normalized
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

const FACIES_LITHOLOGY_ALIASES: Record<string, string> = {
  "fine grained sst": "fine-grained sandstone"
};

function faciesRockTypeLabel(bed: arkL_intervals, lithologyById: Map<number, string>): string {
  if (bed.lithology_id != null) {
    const canonical = lithologyById.get(bed.lithology_id);
    if (canonical) return tscPatternNameFromLithology(canonical);
  }
  const raw = cleanText(bed.lithology || "");
  const alias = FACIES_LITHOLOGY_ALIASES[raw.toLowerCase()];
  return tscPatternNameFromLithology(alias ?? raw);
}

function faciesFormationLabel(interval: arkL_intervals): string {
  if (interval.intervalx) {
    return interval.intervalx
      .replace(/\s+Fm\.\s*DeL$/i, " Fm.")
      .replace(/\s+DeL$/i, "")
      .trim();
  }
  return chronIntervalDisplayLabel(interval);
}

function formatFaciesLine(rockType: string, label: string, age: number, info: string): string {
  const infoField = info ? `\t${info}` : "";
  if (label) {
    return `\t${rockType}\t${label}\t${Number(age.toFixed(3))}${infoField}`;
  }
  return `\t${rockType}\t\t${Number(age.toFixed(3))}${infoField}`;
}

function faciesSeriesPrimaryLine(series: arkL_intervals): string {
  const notes = cleanText(series.interval_notes);
  if (notes) {
    return `${series.intervalx}\tPrimary\t\t\t${notes}`;
  }
  return `${series.intervalx}\tPrimary`;
}

async function processFaciesColumns(
  datasets: arkL_datasets[],
  columns: arkL_columns[],
  intervals: arkL_intervals[],
  lithologyById: Map<number, string>
) {
  const faciesColumns: ProcessColumnOutput[] = [];
  for (const column of columns) {
    if (!isFaciesGraphicColumn(column)) continue;

    const exportPath = (column.path || "").trim() || column.columnx || "";
    if (!exportPath) {
      console.log(chalk.yellow("missing path for " + column.columnx));
      continue;
    }

    const dataset = datasets.find((d) => d.id === column.dataset_id);
    if (!dataset) {
      console.log(chalk.yellow("missing dataset id for " + column.columnx));
      continue;
    }

    const seriesColumn = findFaciesSeriesColumn(columns, column);
    const labelColumn = findFaciesFormationLabelColumn(columns, column);

    const beds = intervals
      .filter(
        (interval) => interval.column_id === column.id && interval.base_age !== null && interval.base_age !== undefined
      )
      .sort((a, b) => a.base_age! - b.base_age!);
    if (beds.length === 0) {
      console.log(chalk.yellow("no facies beds found for " + column.columnx));
      continue;
    }

    const seriesIntervals = seriesColumn
      ? intervals
          .filter((interval) => interval.column_id === seriesColumn.id && interval.base_age2020 !== null)
          .sort((a, b) => a.base_age2020! - b.base_age2020!)
      : [];
    const labelIntervals = labelColumn
      ? intervals
          .filter((interval) => interval.column_id === labelColumn.id && interval.base_age2020 !== null)
          .sort((a, b) => a.base_age2020! - b.base_age2020!)
      : [];

    const popup = cleanText(
      dataset.TSC_source_notes ?? dataset.notes_Jur ?? dataset.compilation_notes_Jur ?? dataset.notes_Cenoz ?? ""
    );
    const columnLines: string[] = [];
    columnLines.push(
      `${column.columnx}\tfacies\t${column.width || ""}\t${sanitizeTscColour(column.colour || dataset.colour || "")}\tnotitle\toff\t${popup}`
    );

    let topWritten = false;
    let prevSeries = "";

    for (const bed of beds) {
      const bedAge = bed.base_age!;

      if (seriesIntervals.length > 0) {
        const series = findChronLabelInterval(seriesIntervals, bedAge);
        if (!series) {
          console.log(chalk.yellow(`No facies series found for bed ${bed.intervalx} in column ${column.columnx}`));
          continue;
        }
        if (series.intervalx !== prevSeries) {
          prevSeries = series.intervalx ?? "";
          columnLines.push(faciesSeriesPrimaryLine(series));
          if (!topWritten) {
            const topAge = chronColumnTopAge(column, beds);
            const topNotes = cleanText(beds.find((b) => b.top_age === topAge)?.interval_notes ?? "");
            columnLines.push(formatFaciesLine("TOP", "", topAge, topNotes));
            topWritten = true;
          }
        }
      } else if (!topWritten) {
        const topAge = chronColumnTopAge(column, beds);
        const topNotes = cleanText(beds.find((b) => b.top_age === topAge)?.interval_notes ?? "");
        columnLines.push(formatFaciesLine("TOP", "", topAge, topNotes));
        topWritten = true;
      }

      const rawLithology = cleanText(bed.lithology || "");
      if (!rawLithology && !bed.intervalx) continue;

      const isGap = rawLithology.toLowerCase() === "gap";
      const rockType = isGap ? "Gap" : faciesRockTypeLabel(bed, lithologyById);
      let memberLabel = "";
      if (!isGap && labelIntervals.length > 0) {
        const formation = findChronLabelInterval(labelIntervals, bedAge);
        if (formation) {
          memberLabel = faciesFormationLabel(formation);
        }
      }

      const info = cleanText(bed.pop_up_notes || bed.interval_notes);
      columnLines.push(formatFaciesLine(rockType, isGap ? "" : memberLabel, bedAge, info));
    }

    columnLines.push("");
    faciesColumns.push({
      path: exportPath,
      column: column.columnx!,
      lines: columnLines,
      sort: column.sort ?? 0
    });
  }
  return faciesColumns;
}

async function processPointDataColumns(
  datasets: arkL_datasets[],
  columns: arkL_columns[],
  events: arkL_events[]
): Promise<ProcessColumnOutput[]> {
  const pointColumns: ProcessColumnOutput[] = [];

  for (const column of columns) {
    if (column.column_type !== "pointdata") continue;
    if (!column.pointdata_table || !column.dataset_id) continue;

    const valueField = cleanText(column.field_if_not_intvx) || "pointdata1";
    const rows = await loadPointdataRows(column, events);
    const points = rows
      .map((row) => {
        const age = getRowAge(row);
        const xVal = getRowValue(row, valueField);
        if (age === null || xVal === null) return null;
        return {
          age,
          xVal,
          popup: getPointPopup(row)
        };
      })
      .filter((point): point is { age: number; xVal: number; popup: string } => point !== null)
      .sort((a, b) => a.age - b.age);

    if (points.length === 0) {
      console.log(chalk.yellow(`missing point data for ${column.columnx} (${column.pointdata_table}.${valueField})`));
      continue;
    }

    const dataset = datasets.find((item) => item.id === column.dataset_id);
    const valueRange = points.map((point) => point.xVal);
    const display = resolvePointColumnDisplay(column, valueRange);
    const popup = columnHeaderPopup(
      column.TSC_notes ?? dataset?.TSC_source_notes ?? dataset?.notes_Cenoz ?? dataset?.notes_Jur ?? ""
    );
    const ageDecimals = derivePointAgeDecimalPlaces(points.map((point) => point.age));

    const columnLines: string[] = [];
    columnLines.push(`${column.columnx}\tpoint\t${display.headerWidth}\t\t\t\toff\t${popup}`);
    const smoothSuffix = pointColumnRangeSuffix(display.smoothed);
    const rangeLine = display.nofill
      ? `nopoints\tline\tnofill\t${formatRangeBound(display.lower)}\t${formatRangeBound(display.upper)}${smoothSuffix}`
      : `nopoints\tline\t\t${formatRangeBound(display.lower)}\t${formatRangeBound(display.upper)}${smoothSuffix}`;
    columnLines.push(rangeLine);

    for (const point of points) {
      const popupField = point.popup ? `\t${point.popup}` : "";
      columnLines.push(
        `\t${formatPointAge(point.age, ageDecimals)}\t${Number(Number(point.xVal).toFixed(3))}${popupField}`
      );
    }
    columnLines.push("");

    if (column.path && column.columnx) {
      pointColumns.push({
        path: column.path,
        column: column.columnx,
        lines: columnLines,
        sort: column.sort ?? 0
      });
    }
  }

  return pointColumns;
}

function formatRangeBound(value: number): string {
  const rounded = Number(value.toFixed(3));
  return String(rounded);
}

function makeUniqueMetaColumnLabel(label: string, usedNames: Set<string>): string {
  let candidate = `${label} group`;
  let counter = 2;
  while (usedNames.has(candidate)) {
    candidate = `${label} group ${counter}`;
    counter++;
  }
  return candidate;
}

const organizeColumn = (entries: ProcessColumnOutput[], pathDict: StringDictSet, linesDict: StringDict) => {
  const columnNames = new Set(entries.map((entry) => entry.column.trim()));
  const usedNames = new Set(columnNames);
  const pathAliases = new Map<string, string>();

  for (const entry of entries) {
    const { path, column, lines } = entry;
    let pathArray = customSplit(path);
    // Avoid emitting a redundant metacolumn whose name is identical to its only child column.
    // TSC's Java loader is brittle here, especially for chron columns.
    if (pathArray.length > 1 && pathArray[pathArray.length - 1]?.trim() === column.trim()) {
      pathArray = pathArray.slice(0, -1);
    }
    pathArray = pathArray.map((segment, index) => {
      const trimmed = segment.trim();
      const aliasKey = pathArray.slice(0, index + 1).join("\u0000");
      const existingAlias = pathAliases.get(aliasKey);
      if (existingAlias) return existingAlias;
      if (!columnNames.has(trimmed)) return segment;

      const alias = makeUniqueMetaColumnLabel(trimmed, usedNames);
      usedNames.add(alias);
      pathAliases.set(aliasKey, alias);
      return alias;
    });
    for (let i = 0; i < pathArray.length; i++) {
      const currentPath = pathArray[i]!;
      if (!currentPath) continue;
      if (!pathDict[currentPath]) {
        pathDict[currentPath] = new Set<string>();
      }
      if (i === pathArray.length - 1) {
        pathDict[currentPath]?.add(column);
        linesDict[column] = lines;
      } else {
        pathDict[currentPath]?.add(pathArray[i + 1]!);
      }
    }
  }
};

// takes dictionaries and returns lines to be written to output file
async function linesFromDicts(pathDict: StringDictSet, linesDict: StringDict) {
  let lines: string[] = [];
  for (const path in pathDict) {
    let line = "";
    line += `${path}`;
    if (pathDict[path] && pathDict[path]!.size > 0) {
      line += "\t:";
      for (const item of pathDict[path]!) {
        if (item) {
          line += `\t${item}`;
        }
      }
      line += "\t_METACOLUMN_OFF\t_TITLE_ON"; // metacolumn off, title on by default
    }
    lines.push(line);
    // need empty line between groups
    lines.push("");
    if (pathDict[path] && pathDict[path]!.size > 0) {
      for (const item of pathDict[path]!) {
        const columnLines = linesDict[item];
        if (columnLines) {
          lines = [...lines, ...columnLines];
        }
      }
    }
  }
  return lines;
}

// custom split function that handles paths with "/"'s that are not meant to split the path, as well as "/"'s that are part of the group name
const customSplit = (path: string): string[] => {
  // return empty array if path is empty or only contains whitespace
  if (path === "" || path.trim() === "") {
    return [];
  }
  const parts: string[] = [];
  let currentPart = "";
  let parentDepth = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path[i];
    if (char === "(") {
      parentDepth++;
      currentPart += char;
    } else if (char === ")") {
      parentDepth = Math.max(parentDepth - 1, 0);
      currentPart += char;
    } else if (char === "/" && parentDepth === 0) {
      // split here
      parts.push(currentPart.trim());
      currentPart = "";
    } else {
      currentPart += char;
    }
  }
  if (currentPart.length > 0) {
    parts.push(currentPart.trim());
  }
  return parts;
};

export async function generateAndWriteConfig(fileName: string) {
  const filePath = join(outputDir, fileName);
  let fileSize = "0 MB";
  try {
    const stats = await import("fs/promises").then((fs) => fs.stat(filePath));
    fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    fileSize = "0 MB";
  }
  const config = [
    {
      title: LONDON_DATAPACK_TITLE,
      description: "A test datapack created by a group",
      originalFileName: fileName,
      storedFileName: fileName,
      date: new Date().toISOString().split("T")[0],
      size: fileSize,
      authoredBy: "Group Testers",
      references: [],
      tags: [],
      notes: "This is a sample datapack generated from the London database.",
      type: "official",
      isPublic: true,
      priority: 2,
      hasFiles: false
    }
  ];
  const configPath = join(outputDir, "london-config.json");
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
}

function parseLondonDatapackDate(fileName: string): number | null {
  const match = fileName.match(LONDON_DATAPACK_FILE_REGEX);
  if (!match) return null;

  const parsed = Date.parse(`${match[1]} UTC`);
  return Number.isNaN(parsed) ? null : parsed;
}

async function pruneLondonDatapackHistory(currentFileName: string) {
  const entries = await readdir(outputDir, { withFileTypes: true });
  const datapackFiles = entries
    .filter((entry) => entry.isFile() && LONDON_DATAPACK_FILE_REGEX.test(entry.name))
    .map((entry) => ({
      fileName: entry.name,
      timestamp: parseLondonDatapackDate(entry.name)
    }))
    .filter((entry): entry is { fileName: string; timestamp: number } => entry.timestamp !== null)
    .sort((a, b) => b.timestamp - a.timestamp);

  const keep = new Set(datapackFiles.slice(0, LONDON_DATAPACK_RETENTION_LIMIT).map((entry) => entry.fileName));
  keep.add(currentFileName);

  const staleFiles = datapackFiles.filter((entry) => !keep.has(entry.fileName));
  for (const staleFile of staleFiles) {
    await unlink(join(outputDir, staleFile.fileName));
  }

  if (staleFiles.length > 0) {
    console.log(
      chalk.cyan(
        `Pruned ${staleFiles.length} old London datapack(s); kept latest ${Math.min(datapackFiles.length, LONDON_DATAPACK_RETENTION_LIMIT)}`
      )
    );
  }
}

export async function generateLondonDatapack(): Promise<File | undefined> {
  try {
    const { datasets, columns, events, intervals, lithologyById } = await loadJSONS();
    const date = new Date();
    const formattedDate = `${date.getDate().toString().padStart(2, "0")}${date.toLocaleString("en-US", { month: "short" })}${date.getFullYear()}`;
    const fileName = `UCL_TSC_Chronostrat_${formattedDate}.txt`;
    const filePath = join(outputDir, fileName);

    console.log(chalk.cyan("London datapack: full export (all implemented processors)"));

    const pathDict: StringDictSet = {};
    const linesDict: StringDict = {};

    const eventColumns = await processEventColumns(datasets, columns, events);
    const blockColumns = await processBlockColumns(datasets, columns, intervals);
    const sequenceColumns = await processSequenceColumns(events, columns, datasets, intervals);
    const chronColumns = await processChronColumns(datasets, columns, intervals);
    const faciesColumns = await processFaciesColumns(datasets, columns, intervals, lithologyById);
    const seaLevelColumns = await processSeaLevelCurveColumns(events, columns, datasets, intervals);
    const pointDataColumns = await processPointDataColumns(datasets, columns, events);
    const transectColumns = await processTransectColumns(columns);
    const freehandColumns = await processFreehandColumns(columns);
    const allColumns = [
      ...eventColumns,
      ...blockColumns,
      ...sequenceColumns,
      ...chronColumns,
      ...faciesColumns,
      ...seaLevelColumns,
      ...pointDataColumns,
      ...transectColumns,
      ...freehandColumns
    ].sort((a, b) => a.sort - b.sort);
    console.log(
      chalk.cyan(
        [
          `Emitted ${eventColumns.length} event`,
          `${blockColumns.length} block`,
          `${sequenceColumns.length} sequence`,
          `${chronColumns.length} chron`,
          `${faciesColumns.length} facies`,
          `${seaLevelColumns.length} sea-level curve`,
          `${pointDataColumns.length} pointdata`,
          `${transectColumns.length} transect`,
          `${freehandColumns.length} freehand`
        ].join(", ") + " column(s)"
      )
    );
    organizeColumn(allColumns, pathDict, linesDict);
    const lines = await linesFromDicts(pathDict, linesDict);
    await writeFile(filePath, lines.join("\n"));
    await pruneLondonDatapackHistory(fileName);
    await generateAndWriteConfig(fileName);

    // Read the file back and return as a File object (browser-compatible)
    const buffer = Buffer.from(lines.join("\n"), "utf8");
    return new File([buffer], fileName, {
      type: "text/plain",
      lastModified: Date.now()
    });
  } catch (error) {
    console.error(chalk.red(`Failed to create test_datapack.txt: ${error}`));
    return undefined;
  }
}

// if (import.meta.url === `file://${process.argv[1]}`) {
//   await generateLondonDatapack();
// }
