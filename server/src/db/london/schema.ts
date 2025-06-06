import { throwError } from "@tsconline/shared";

export interface arkL_columns {
  id: number;
  columnx: string | null;
  dataset: string | null;
  dataset_id: number | null;
  sub_columnE: string;
  colshare: string;
  subdataset: string | null;
  subdataset_id: number | null;
  width: number | null;
  interval_type: string | null;
  column_type: string | null;
  col_if_not_intvx: string | null;
  level: number | null;
  path: string | null;
  compilation_notes: string | null;
  sort: number | null;
  reftoadd: string | null;
}

export function assertarkL_columns(o: any): asserts o is arkL_columns {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_columns", "id", "number", o.id);
    if (o.columnx !== null && typeof o.columnx !== "string") throwError("arkL_columns", "columnx", "string", o.columnx);
    if (o.dataset !== null && typeof o.dataset !== "string") throwError("arkL_columns", "dataset", "string", o.dataset);
    if (o.dataset_id !== null && typeof o.dataset_id !== "number") throwError("arkL_columns", "dataset_id", "number", o.dataset_id);
    if (typeof o.sub_columnE !== "string") throwError("arkL_columns", "sub_columnE", "string", o.sub_columnE);
    if (typeof o.colshare !== "string") throwError("arkL_columns", "colshare", "string", o.colshare);
    if (o.subdataset !== null && typeof o.subdataset !== "string") throwError("arkL_columns", "subdataset", "string", o.subdataset);
    if (o.subdataset_id !== null && typeof o.subdataset_id !== "number") throwError("arkL_columns", "subdataset_id", "number", o.subdataset_id);
    if (o.width !== null && typeof o.width !== "number") throwError("arkL_columns", "width", "number", o.width);
    if (o.interval_type !== null && typeof o.interval_type !== "string") throwError("arkL_columns", "interval_type", "string", o.interval_type);
    if (o.column_type !== null && typeof o.column_type !== "string") throwError("arkL_columns", "column_type", "string", o.column_type);
    if (o.col_if_not_intvx !== null && typeof o.col_if_not_intvx !== "string") throwError("arkL_columns", "col_if_not_intvx", "string", o.col_if_not_intvx);
    if (o.level !== null && typeof o.level !== "number") throwError("arkL_columns", "level", "number", o.level);
    if (o.path !== null && typeof o.path !== "string") throwError("arkL_columns", "path", "string", o.path);
    if (o.compilation_notes !== null && typeof o.compilation_notes !== "string") throwError("arkL_columns", "compilation_notes", "string", o.compilation_notes);
    if (o.sort !== null && typeof o.sort !== "number") throwError("arkL_columns", "sort", "number", o.sort);
    if (o.reftoadd !== null && typeof o.reftoadd !== "string") throwError("arkL_columns", "reftoadd", "string", o.reftoadd);
}

export function assertarkL_columnsArray(o: any[]): asserts o is arkL_columns[] {
	if (!Array.isArray(o)) throwError("arkL_columns", "Array", "Array", o);
	for (const item of o) assertarkL_columns(item);
}

export interface arkL_datasets {
  id: number;
  dataset: string | null;
  dataset_type: string | null;
  sort: number | null;
  TSC_source_notes: string | null;
  compilation_notes: string | null;
  notes_Cenoz: string | null;
  compilation_notes_Cenoz: string | null;
  prefix: string | null;
  added_abv: string | null;
  main_interval_type: string | null;
  interval_types: string | null;
  colour: string | null;
  event_colour: string | null;
  width: number | null;
  source_sheet: string | null;
  refstoadd: string | null;
  notes_Jur: string | null;
  compilation_notes_Jur: string | null;
  notes_Cret: string | null;
  compilation_notes_Cret: string | null;
  min_age: number | null;
  max_age: number | null;
}

export function assertarkL_datasets(o: any): asserts o is arkL_datasets {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_datasets", "id", "number", o.id);
    if (o.dataset !== null && typeof o.dataset !== "string") throwError("arkL_datasets", "dataset", "string", o.dataset);
    if (o.dataset_type !== null && typeof o.dataset_type !== "string") throwError("arkL_datasets", "dataset_type", "string", o.dataset_type);
    if (o.sort !== null && typeof o.sort !== "number") throwError("arkL_datasets", "sort", "number", o.sort);
    if (o.TSC_source_notes !== null && typeof o.TSC_source_notes !== "string") throwError("arkL_datasets", "TSC_source_notes", "string", o.TSC_source_notes);
    if (o.compilation_notes !== null && typeof o.compilation_notes !== "string") throwError("arkL_datasets", "compilation_notes", "string", o.compilation_notes);
    if (o.notes_Cenoz !== null && typeof o.notes_Cenoz !== "string") throwError("arkL_datasets", "notes_Cenoz", "string", o.notes_Cenoz);
    if (o.compilation_notes_Cenoz !== null && typeof o.compilation_notes_Cenoz !== "string") throwError("arkL_datasets", "compilation_notes_Cenoz", "string", o.compilation_notes_Cenoz);
    if (o.prefix !== null && typeof o.prefix !== "string") throwError("arkL_datasets", "prefix", "string", o.prefix);
    if (o.added_abv !== null && typeof o.added_abv !== "string") throwError("arkL_datasets", "added_abv", "string", o.added_abv);
    if (o.main_interval_type !== null && typeof o.main_interval_type !== "string") throwError("arkL_datasets", "main_interval_type", "string", o.main_interval_type);
    if (o.interval_types !== null && typeof o.interval_types !== "string") throwError("arkL_datasets", "interval_types", "string", o.interval_types);
    if (o.colour !== null && typeof o.colour !== "string") throwError("arkL_datasets", "colour", "string", o.colour);
    if (o.event_colour !== null && typeof o.event_colour !== "string") throwError("arkL_datasets", "event_colour", "string", o.event_colour);
    if (o.width !== null && typeof o.width !== "number") throwError("arkL_datasets", "width", "number", o.width);
    if (o.source_sheet !== null && typeof o.source_sheet !== "string") throwError("arkL_datasets", "source_sheet", "string", o.source_sheet);
    if (o.refstoadd !== null && typeof o.refstoadd !== "string") throwError("arkL_datasets", "refstoadd", "string", o.refstoadd);
    if (o.notes_Jur !== null && typeof o.notes_Jur !== "string") throwError("arkL_datasets", "notes_Jur", "string", o.notes_Jur);
    if (o.compilation_notes_Jur !== null && typeof o.compilation_notes_Jur !== "string") throwError("arkL_datasets", "compilation_notes_Jur", "string", o.compilation_notes_Jur);
    if (o.notes_Cret !== null && typeof o.notes_Cret !== "string") throwError("arkL_datasets", "notes_Cret", "string", o.notes_Cret);
    if (o.compilation_notes_Cret !== null && typeof o.compilation_notes_Cret !== "string") throwError("arkL_datasets", "compilation_notes_Cret", "string", o.compilation_notes_Cret);
    if (o.min_age !== null && typeof o.min_age !== "number") throwError("arkL_datasets", "min_age", "number", o.min_age);
    if (o.max_age !== null && typeof o.max_age !== "number") throwError("arkL_datasets", "max_age", "number", o.max_age);
}

export function assertarkL_datasetsArray(o: any[]): asserts o is arkL_datasets[] {
	if (!Array.isArray(o)) throwError("arkL_datasets", "Array", "Array", o);
	for (const item of o) assertarkL_datasets(item);
}

export interface arkL_events {
  id: number;
  eventx: string | null;
  alternative_termE: string | null;
  dataset: string | null;
  dataset_id: number | null;
  has_added_abvE: string | null;
  pup: number | null;
  within_intv: string | null;
  within_intv_id: number | null;
  age: number | null;
  offset: number | null;
  offset_from_event: string | null;
  offset_from_id: number | null;
  age2020: number | null;
  age2020_uncorrected: number | null;
  stage: string | null;
  preset_age: number | null;
  preset_age_notes: string | null;
  sub_columnE: string;
  sort: number | null;
  event_type: string | null;
  event_display: string;
  text_colour: string | null;
  taxa: string | null;
  GSSP: string | null;
  image: string | null;
  url_part: string | null;
  url_part2: number | null;
  TR_cycle: string | null;
  Mega_TR_cycle: string | null;
  seq_scale: string | null;
  sl_change: number | null;
  longterm_sl: number | null;
  sl_correction_applied: number | null;
  sea_level_notes: string | null;
  equation: string | null;
  notes_2004: string | null;
  notes_2020: string | null;
  compilation_notesE: string | null;
  tracecode: string | null;
  refstoadd: string | null;
}

export function assertarkL_events(o: any): asserts o is arkL_events {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_events", "id", "number", o.id);
    if (o.eventx !== null && typeof o.eventx !== "string") throwError("arkL_events", "eventx", "string", o.eventx);
    if (o.alternative_termE !== null && typeof o.alternative_termE !== "string") throwError("arkL_events", "alternative_termE", "string", o.alternative_termE);
    if (o.dataset !== null && typeof o.dataset !== "string") throwError("arkL_events", "dataset", "string", o.dataset);
    if (o.dataset_id !== null && typeof o.dataset_id !== "number") throwError("arkL_events", "dataset_id", "number", o.dataset_id);
    if (o.has_added_abvE !== null && typeof o.has_added_abvE !== "string") throwError("arkL_events", "has_added_abvE", "string", o.has_added_abvE);
    if (o.pup !== null && typeof o.pup !== "number") throwError("arkL_events", "pup", "number", o.pup);
    if (o.within_intv !== null && typeof o.within_intv !== "string") throwError("arkL_events", "within_intv", "string", o.within_intv);
    if (o.within_intv_id !== null && typeof o.within_intv_id !== "number") throwError("arkL_events", "within_intv_id", "number", o.within_intv_id);
    if (o.age !== null && typeof o.age !== "number") throwError("arkL_events", "age", "number", o.age);
    if (o.offset !== null && typeof o.offset !== "number") throwError("arkL_events", "offset", "number", o.offset);
    if (o.offset_from_event !== null && typeof o.offset_from_event !== "string") throwError("arkL_events", "offset_from_event", "string", o.offset_from_event);
    if (o.offset_from_id !== null && typeof o.offset_from_id !== "number") throwError("arkL_events", "offset_from_id", "number", o.offset_from_id);
    if (o.age2020 !== null && typeof o.age2020 !== "number") throwError("arkL_events", "age2020", "number", o.age2020);
    if (o.age2020_uncorrected !== null && typeof o.age2020_uncorrected !== "number") throwError("arkL_events", "age2020_uncorrected", "number", o.age2020_uncorrected);
    if (o.stage !== null && typeof o.stage !== "string") throwError("arkL_events", "stage", "string", o.stage);
    if (o.preset_age !== null && typeof o.preset_age !== "number") throwError("arkL_events", "preset_age", "number", o.preset_age);
    if (o.preset_age_notes !== null && typeof o.preset_age_notes !== "string") throwError("arkL_events", "preset_age_notes", "string", o.preset_age_notes);
    if (typeof o.sub_columnE !== "string") throwError("arkL_events", "sub_columnE", "string", o.sub_columnE);
    if (o.sort !== null && typeof o.sort !== "number") throwError("arkL_events", "sort", "number", o.sort);
    if (o.event_type !== null && typeof o.event_type !== "string") throwError("arkL_events", "event_type", "string", o.event_type);
    if (typeof o.event_display !== "string") throwError("arkL_events", "event_display", "string", o.event_display);
    if (o.text_colour !== null && typeof o.text_colour !== "string") throwError("arkL_events", "text_colour", "string", o.text_colour);
    if (o.taxa !== null && typeof o.taxa !== "string") throwError("arkL_events", "taxa", "string", o.taxa);
    if (o.GSSP !== null && typeof o.GSSP !== "string") throwError("arkL_events", "GSSP", "string", o.GSSP);
    if (o.image !== null && typeof o.image !== "string") throwError("arkL_events", "image", "string", o.image);
    if (o.url_part !== null && typeof o.url_part !== "string") throwError("arkL_events", "url_part", "string", o.url_part);
    if (o.url_part2 !== null && typeof o.url_part2 !== "number") throwError("arkL_events", "url_part2", "number", o.url_part2);
    if (o.TR_cycle !== null && typeof o.TR_cycle !== "string") throwError("arkL_events", "TR_cycle", "string", o.TR_cycle);
    if (o.Mega_TR_cycle !== null && typeof o.Mega_TR_cycle !== "string") throwError("arkL_events", "Mega_TR_cycle", "string", o.Mega_TR_cycle);
    if (o.seq_scale !== null && typeof o.seq_scale !== "string") throwError("arkL_events", "seq_scale", "string", o.seq_scale);
    if (o.sl_change !== null && typeof o.sl_change !== "number") throwError("arkL_events", "sl_change", "number", o.sl_change);
    if (o.longterm_sl !== null && typeof o.longterm_sl !== "number") throwError("arkL_events", "longterm_sl", "number", o.longterm_sl);
    if (o.sl_correction_applied !== null && typeof o.sl_correction_applied !== "number") throwError("arkL_events", "sl_correction_applied", "number", o.sl_correction_applied);
    if (o.sea_level_notes !== null && typeof o.sea_level_notes !== "string") throwError("arkL_events", "sea_level_notes", "string", o.sea_level_notes);
    if (o.equation !== null && typeof o.equation !== "string") throwError("arkL_events", "equation", "string", o.equation);
    if (o.notes_2004 !== null && typeof o.notes_2004 !== "string") throwError("arkL_events", "notes_2004", "string", o.notes_2004);
    if (o.notes_2020 !== null && typeof o.notes_2020 !== "string") throwError("arkL_events", "notes_2020", "string", o.notes_2020);
    if (o.compilation_notesE !== null && typeof o.compilation_notesE !== "string") throwError("arkL_events", "compilation_notesE", "string", o.compilation_notesE);
    if (o.tracecode !== null && typeof o.tracecode !== "string") throwError("arkL_events", "tracecode", "string", o.tracecode);
    if (o.refstoadd !== null && typeof o.refstoadd !== "string") throwError("arkL_events", "refstoadd", "string", o.refstoadd);
}

export function assertarkL_eventsArray(o: any[]): asserts o is arkL_events[] {
	if (!Array.isArray(o)) throwError("arkL_events", "Array", "Array", o);
	for (const item of o) assertarkL_events(item);
}

export interface arkL_intervals {
  id: number;
  intervalx: string;
  has_added_abv: string | null;
  alternative_term: string | null;
  formal_term: string | null;
  top_event: string | null;
  top_id: number | null;
  base_event: string | null;
  base_id: number | null;
  top_age: number | null;
  base_age: number | null;
  duration: number | null;
  top_age2020: number | null;
  base_age2020: number | null;
  stage: string | null;
  dataset: string | null;
  dataset_id: number | null;
  subdataset: string;
  subdataset_id: number | null;
  preset_duration: number | null;
  preset_duration_notes: string | null;
  interval_notes: string | null;
  compilation_notes: string | null;
  sort: number | null;
  interval_type: string | null;
  sub_column: string | null;
  parent_interval: string | null;
  polarity: string | null;
  colour: string | null;
  tracecode: string | null;
  refstoadd: string | null;
  block_label: string | null;
}

export function assertarkL_intervals(o: any): asserts o is arkL_intervals {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_intervals", "id", "number", o.id);
    if (typeof o.intervalx !== "string") throwError("arkL_intervals", "intervalx", "string", o.intervalx);
    if (o.has_added_abv !== null && typeof o.has_added_abv !== "string") throwError("arkL_intervals", "has_added_abv", "string", o.has_added_abv);
    if (o.alternative_term !== null && typeof o.alternative_term !== "string") throwError("arkL_intervals", "alternative_term", "string", o.alternative_term);
    if (o.formal_term !== null && typeof o.formal_term !== "string") throwError("arkL_intervals", "formal_term", "string", o.formal_term);
    if (o.top_event !== null && typeof o.top_event !== "string") throwError("arkL_intervals", "top_event", "string", o.top_event);
    if (o.top_id !== null && typeof o.top_id !== "number") throwError("arkL_intervals", "top_id", "number", o.top_id);
    if (o.base_event !== null && typeof o.base_event !== "string") throwError("arkL_intervals", "base_event", "string", o.base_event);
    if (o.base_id !== null && typeof o.base_id !== "number") throwError("arkL_intervals", "base_id", "number", o.base_id);
    if (o.top_age !== null && typeof o.top_age !== "number") throwError("arkL_intervals", "top_age", "number", o.top_age);
    if (o.base_age !== null && typeof o.base_age !== "number") throwError("arkL_intervals", "base_age", "number", o.base_age);
    if (o.duration !== null && typeof o.duration !== "number") throwError("arkL_intervals", "duration", "number", o.duration);
    if (o.top_age2020 !== null && typeof o.top_age2020 !== "number") throwError("arkL_intervals", "top_age2020", "number", o.top_age2020);
    if (o.base_age2020 !== null && typeof o.base_age2020 !== "number") throwError("arkL_intervals", "base_age2020", "number", o.base_age2020);
    if (o.stage !== null && typeof o.stage !== "string") throwError("arkL_intervals", "stage", "string", o.stage);
    if (o.dataset !== null && typeof o.dataset !== "string") throwError("arkL_intervals", "dataset", "string", o.dataset);
    if (o.dataset_id !== null && typeof o.dataset_id !== "number") throwError("arkL_intervals", "dataset_id", "number", o.dataset_id);
    if (typeof o.subdataset !== "string") throwError("arkL_intervals", "subdataset", "string", o.subdataset);
    if (o.subdataset_id !== null && typeof o.subdataset_id !== "number") throwError("arkL_intervals", "subdataset_id", "number", o.subdataset_id);
    if (o.preset_duration !== null && typeof o.preset_duration !== "number") throwError("arkL_intervals", "preset_duration", "number", o.preset_duration);
    if (o.preset_duration_notes !== null && typeof o.preset_duration_notes !== "string") throwError("arkL_intervals", "preset_duration_notes", "string", o.preset_duration_notes);
    if (o.interval_notes !== null && typeof o.interval_notes !== "string") throwError("arkL_intervals", "interval_notes", "string", o.interval_notes);
    if (o.compilation_notes !== null && typeof o.compilation_notes !== "string") throwError("arkL_intervals", "compilation_notes", "string", o.compilation_notes);
    if (o.sort !== null && typeof o.sort !== "number") throwError("arkL_intervals", "sort", "number", o.sort);
    if (o.interval_type !== null && typeof o.interval_type !== "string") throwError("arkL_intervals", "interval_type", "string", o.interval_type);
    if (o.sub_column !== null && typeof o.sub_column !== "string") throwError("arkL_intervals", "sub_column", "string", o.sub_column);
    if (o.parent_interval !== null && typeof o.parent_interval !== "string") throwError("arkL_intervals", "parent_interval", "string", o.parent_interval);
    if (o.polarity !== null && typeof o.polarity !== "string") throwError("arkL_intervals", "polarity", "string", o.polarity);
    if (o.colour !== null && typeof o.colour !== "string") throwError("arkL_intervals", "colour", "string", o.colour);
    if (o.tracecode !== null && typeof o.tracecode !== "string") throwError("arkL_intervals", "tracecode", "string", o.tracecode);
    if (o.refstoadd !== null && typeof o.refstoadd !== "string") throwError("arkL_intervals", "refstoadd", "string", o.refstoadd);
    if (o.block_label !== null && typeof o.block_label !== "string") throwError("arkL_intervals", "block_label", "string", o.block_label);
}

export function assertarkL_intervalsArray(o: any[]): asserts o is arkL_intervals[] {
	if (!Array.isArray(o)) throwError("arkL_intervals", "Array", "Array", o);
	for (const item of o) assertarkL_intervals(item);
}

export interface arkL_subdatasets {
  id: number;
  subdataset: string | null;
  interval_types: string | null;
  dataset: string | null;
  dataset_id: number | null;
  colshare: string | null;
  notes: string | null;
  period: string | null;
  TSC_source_notes: string | null;
  refstoadd: string | null;
  min_age: number | null;
  max_age: number | null;
}

export function assertarkL_subdatasets(o: any): asserts o is arkL_subdatasets {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_subdatasets", "id", "number", o.id);
    if (o.subdataset !== null && typeof o.subdataset !== "string") throwError("arkL_subdatasets", "subdataset", "string", o.subdataset);
    if (o.interval_types !== null && typeof o.interval_types !== "string") throwError("arkL_subdatasets", "interval_types", "string", o.interval_types);
    if (o.dataset !== null && typeof o.dataset !== "string") throwError("arkL_subdatasets", "dataset", "string", o.dataset);
    if (o.dataset_id !== null && typeof o.dataset_id !== "number") throwError("arkL_subdatasets", "dataset_id", "number", o.dataset_id);
    if (o.colshare !== null && typeof o.colshare !== "string") throwError("arkL_subdatasets", "colshare", "string", o.colshare);
    if (o.notes !== null && typeof o.notes !== "string") throwError("arkL_subdatasets", "notes", "string", o.notes);
    if (o.period !== null && typeof o.period !== "string") throwError("arkL_subdatasets", "period", "string", o.period);
    if (o.TSC_source_notes !== null && typeof o.TSC_source_notes !== "string") throwError("arkL_subdatasets", "TSC_source_notes", "string", o.TSC_source_notes);
    if (o.refstoadd !== null && typeof o.refstoadd !== "string") throwError("arkL_subdatasets", "refstoadd", "string", o.refstoadd);
    if (o.min_age !== null && typeof o.min_age !== "number") throwError("arkL_subdatasets", "min_age", "number", o.min_age);
    if (o.max_age !== null && typeof o.max_age !== "number") throwError("arkL_subdatasets", "max_age", "number", o.max_age);
}

export function assertarkL_subdatasetsArray(o: any[]): asserts o is arkL_subdatasets[] {
	if (!Array.isArray(o)) throwError("arkL_subdatasets", "Array", "Array", o);
	for (const item of o) assertarkL_subdatasets(item);
}

