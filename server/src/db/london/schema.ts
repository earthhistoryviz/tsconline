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

export interface arkL_reflinks {
  id: number;
  refno: number | null;
  dbase_id: number | null;
  dbase: string | null;
}

export function assertarkL_reflinks(o: any): asserts o is arkL_reflinks {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_reflinks", "id", "number", o.id);
    if (o.refno !== null && typeof o.refno !== "number") throwError("arkL_reflinks", "refno", "number", o.refno);
    if (o.dbase_id !== null && typeof o.dbase_id !== "number") throwError("arkL_reflinks", "dbase_id", "number", o.dbase_id);
    if (o.dbase !== null && typeof o.dbase !== "string") throwError("arkL_reflinks", "dbase", "string", o.dbase);
}

export function assertarkL_reflinksArray(o: any[]): asserts o is arkL_reflinks[] {
	if (!Array.isArray(o)) throwError("arkL_reflinks", "Array", "Array", o);
	for (const item of o) assertarkL_reflinks(item);
}

export interface arkL_refs {
  refno: number;
  abv_ref: string | null;
  authors: string | null;
  year: number | null;
  disambig: string | null;
  title: string | null;
  journal: string | null;
  series: string | null;
  vol: string | null;
  journalid: number | null;
  part: string | null;
  firstP: string | null;
  lastP: string | null;
  publisher: string | null;
  notes: string | null;
  language: string | null;
  editors: string | null;
  vol_title: string | null;
  ref_type: string | null;
  is_abstract: string | null;
  full_ref: string | null;
  DOI: string | null;
  pdf_name: string | null;
  pdf_path: string | null;
  pdf_size: number | null;
  pdf_shareable: string | null;
  pdf_quality: string | null;
  pdf_upload_date: string | null;
  inclusionnotes: string | null;
  keywords: string | null;
  abstract: string | null;
  suppl_file: string | null;
  DOIartno: string | null;
}

export function assertarkL_refs(o: any): asserts o is arkL_refs {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.refno !== "number") throwError("arkL_refs", "refno", "number", o.refno);
    if (o.abv_ref !== null && typeof o.abv_ref !== "string") throwError("arkL_refs", "abv_ref", "string", o.abv_ref);
    if (o.authors !== null && typeof o.authors !== "string") throwError("arkL_refs", "authors", "string", o.authors);
    if (o.year !== null && typeof o.year !== "number") throwError("arkL_refs", "year", "number", o.year);
    if (o.disambig !== null && typeof o.disambig !== "string") throwError("arkL_refs", "disambig", "string", o.disambig);
    if (o.title !== null && typeof o.title !== "string") throwError("arkL_refs", "title", "string", o.title);
    if (o.journal !== null && typeof o.journal !== "string") throwError("arkL_refs", "journal", "string", o.journal);
    if (o.series !== null && typeof o.series !== "string") throwError("arkL_refs", "series", "string", o.series);
    if (o.vol !== null && typeof o.vol !== "string") throwError("arkL_refs", "vol", "string", o.vol);
    if (o.journalid !== null && typeof o.journalid !== "number") throwError("arkL_refs", "journalid", "number", o.journalid);
    if (o.part !== null && typeof o.part !== "string") throwError("arkL_refs", "part", "string", o.part);
    if (o.firstP !== null && typeof o.firstP !== "string") throwError("arkL_refs", "firstP", "string", o.firstP);
    if (o.lastP !== null && typeof o.lastP !== "string") throwError("arkL_refs", "lastP", "string", o.lastP);
    if (o.publisher !== null && typeof o.publisher !== "string") throwError("arkL_refs", "publisher", "string", o.publisher);
    if (o.notes !== null && typeof o.notes !== "string") throwError("arkL_refs", "notes", "string", o.notes);
    if (o.language !== null && typeof o.language !== "string") throwError("arkL_refs", "language", "string", o.language);
    if (o.editors !== null && typeof o.editors !== "string") throwError("arkL_refs", "editors", "string", o.editors);
    if (o.vol_title !== null && typeof o.vol_title !== "string") throwError("arkL_refs", "vol_title", "string", o.vol_title);
    if (o.ref_type !== null && typeof o.ref_type !== "string") throwError("arkL_refs", "ref_type", "string", o.ref_type);
    if (o.is_abstract !== null && typeof o.is_abstract !== "string") throwError("arkL_refs", "is_abstract", "string", o.is_abstract);
    if (o.full_ref !== null && typeof o.full_ref !== "string") throwError("arkL_refs", "full_ref", "string", o.full_ref);
    if (o.DOI !== null && typeof o.DOI !== "string") throwError("arkL_refs", "DOI", "string", o.DOI);
    if (o.pdf_name !== null && typeof o.pdf_name !== "string") throwError("arkL_refs", "pdf_name", "string", o.pdf_name);
    if (o.pdf_path !== null && typeof o.pdf_path !== "string") throwError("arkL_refs", "pdf_path", "string", o.pdf_path);
    if (o.pdf_size !== null && typeof o.pdf_size !== "number") throwError("arkL_refs", "pdf_size", "number", o.pdf_size);
    if (o.pdf_shareable !== null && typeof o.pdf_shareable !== "string") throwError("arkL_refs", "pdf_shareable", "string", o.pdf_shareable);
    if (o.pdf_quality !== null && typeof o.pdf_quality !== "string") throwError("arkL_refs", "pdf_quality", "string", o.pdf_quality);
    if (o.pdf_upload_date !== null && typeof o.pdf_upload_date !== "string") throwError("arkL_refs", "pdf_upload_date", "string", o.pdf_upload_date);
    if (o.inclusionnotes !== null && typeof o.inclusionnotes !== "string") throwError("arkL_refs", "inclusionnotes", "string", o.inclusionnotes);
    if (o.keywords !== null && typeof o.keywords !== "string") throwError("arkL_refs", "keywords", "string", o.keywords);
    if (o.abstract !== null && typeof o.abstract !== "string") throwError("arkL_refs", "abstract", "string", o.abstract);
    if (o.suppl_file !== null && typeof o.suppl_file !== "string") throwError("arkL_refs", "suppl_file", "string", o.suppl_file);
    if (o.DOIartno !== null && typeof o.DOIartno !== "string") throwError("arkL_refs", "DOIartno", "string", o.DOIartno);
}

export function assertarkL_refsArray(o: any[]): asserts o is arkL_refs[] {
	if (!Array.isArray(o)) throwError("arkL_refs", "Array", "Array", o);
	for (const item of o) assertarkL_refs(item);
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

export interface arkL_taxon_links {
  id: number;
  event_id: number | null;
  eventx: string | null;
  dataset: string | null;
  event_type: string | null;
  stage: string | null;
  taxon: string | null;
  qualifier: string | null;
  taxon_datasource: string | null;
  taxon_in_datasource: string | null;
  taxon_qualification: string | null;
  id_in_datasource: string | null;
}

export function assertarkL_taxon_links(o: any): asserts o is arkL_taxon_links {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("arkL_taxon_links", "id", "number", o.id);
    if (o.event_id !== null && typeof o.event_id !== "number") throwError("arkL_taxon_links", "event_id", "number", o.event_id);
    if (o.eventx !== null && typeof o.eventx !== "string") throwError("arkL_taxon_links", "eventx", "string", o.eventx);
    if (o.dataset !== null && typeof o.dataset !== "string") throwError("arkL_taxon_links", "dataset", "string", o.dataset);
    if (o.event_type !== null && typeof o.event_type !== "string") throwError("arkL_taxon_links", "event_type", "string", o.event_type);
    if (o.stage !== null && typeof o.stage !== "string") throwError("arkL_taxon_links", "stage", "string", o.stage);
    if (o.taxon !== null && typeof o.taxon !== "string") throwError("arkL_taxon_links", "taxon", "string", o.taxon);
    if (o.qualifier !== null && typeof o.qualifier !== "string") throwError("arkL_taxon_links", "qualifier", "string", o.qualifier);
    if (o.taxon_datasource !== null && typeof o.taxon_datasource !== "string") throwError("arkL_taxon_links", "taxon_datasource", "string", o.taxon_datasource);
    if (o.taxon_in_datasource !== null && typeof o.taxon_in_datasource !== "string") throwError("arkL_taxon_links", "taxon_in_datasource", "string", o.taxon_in_datasource);
    if (o.taxon_qualification !== null && typeof o.taxon_qualification !== "string") throwError("arkL_taxon_links", "taxon_qualification", "string", o.taxon_qualification);
    if (o.id_in_datasource !== null && typeof o.id_in_datasource !== "string") throwError("arkL_taxon_links", "id_in_datasource", "string", o.id_in_datasource);
}

export function assertarkL_taxon_linksArray(o: any[]): asserts o is arkL_taxon_links[] {
	if (!Array.isArray(o)) throwError("arkL_taxon_links", "Array", "Array", o);
	for (const item of o) assertarkL_taxon_links(item);
}

export interface ct_cat {
  taxon: string;
  id: number;
  tax_rank: string | null;
  tax_rank_sorter: number | null;
  citation: string | null;
  epithet: string | null;
  author: string | null;
  desc_year: number | null;
  noimagesflag: string | null;
  type_species: string | null;
  type_loc: string | null;
  type_age: string | null;
  type_sample: string | null;
  record_number: number | null;
  see_also_links: string | null;
  desc_ref: string | null;
  refs: string | null;
  refs_linked: string | null;
  refs_unedited: string | null;
  repository: string | null;
  type_specs: string | null;
  orig_desc: string | null;
  trans_desc: string | null;
  desc_pages: string | null;
  size: string | null;
  etymology: string | null;
  extra_detail: string | null;
  editor_remarks: string | null;
  current_taxon: string;
  current_id: number | null;
  current_citation: string | null;
  synonymy_status: string | null;
  path: string | null;
  hidden_flag: number;
  path_flag: string | null;
  parent: string | null;
  weight: number | null;
  table_header: string | null;
  fad_text: string | null;
  fad_source: string | null;
  lad_text: string | null;
  lad_source: string | null;
  last_edit: string | null;
  authorCopy: string | null;
  aphia_id: number | null;
  temp: string | null;
}

export function assertct_cat(o: any): asserts o is ct_cat {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.taxon !== "string") throwError("ct_cat", "taxon", "string", o.taxon);
    if (typeof o.id !== "number") throwError("ct_cat", "id", "number", o.id);
    if (o.tax_rank !== null && typeof o.tax_rank !== "string") throwError("ct_cat", "tax_rank", "string", o.tax_rank);
    if (o.tax_rank_sorter !== null && typeof o.tax_rank_sorter !== "number") throwError("ct_cat", "tax_rank_sorter", "number", o.tax_rank_sorter);
    if (o.citation !== null && typeof o.citation !== "string") throwError("ct_cat", "citation", "string", o.citation);
    if (o.epithet !== null && typeof o.epithet !== "string") throwError("ct_cat", "epithet", "string", o.epithet);
    if (o.author !== null && typeof o.author !== "string") throwError("ct_cat", "author", "string", o.author);
    if (o.desc_year !== null && typeof o.desc_year !== "number") throwError("ct_cat", "desc_year", "number", o.desc_year);
    if (o.noimagesflag !== null && typeof o.noimagesflag !== "string") throwError("ct_cat", "noimagesflag", "string", o.noimagesflag);
    if (o.type_species !== null && typeof o.type_species !== "string") throwError("ct_cat", "type_species", "string", o.type_species);
    if (o.type_loc !== null && typeof o.type_loc !== "string") throwError("ct_cat", "type_loc", "string", o.type_loc);
    if (o.type_age !== null && typeof o.type_age !== "string") throwError("ct_cat", "type_age", "string", o.type_age);
    if (o.type_sample !== null && typeof o.type_sample !== "string") throwError("ct_cat", "type_sample", "string", o.type_sample);
    if (o.record_number !== null && typeof o.record_number !== "number") throwError("ct_cat", "record_number", "number", o.record_number);
    if (o.see_also_links !== null && typeof o.see_also_links !== "string") throwError("ct_cat", "see_also_links", "string", o.see_also_links);
    if (o.desc_ref !== null && typeof o.desc_ref !== "string") throwError("ct_cat", "desc_ref", "string", o.desc_ref);
    if (o.refs !== null && typeof o.refs !== "string") throwError("ct_cat", "refs", "string", o.refs);
    if (o.refs_linked !== null && typeof o.refs_linked !== "string") throwError("ct_cat", "refs_linked", "string", o.refs_linked);
    if (o.refs_unedited !== null && typeof o.refs_unedited !== "string") throwError("ct_cat", "refs_unedited", "string", o.refs_unedited);
    if (o.repository !== null && typeof o.repository !== "string") throwError("ct_cat", "repository", "string", o.repository);
    if (o.type_specs !== null && typeof o.type_specs !== "string") throwError("ct_cat", "type_specs", "string", o.type_specs);
    if (o.orig_desc !== null && typeof o.orig_desc !== "string") throwError("ct_cat", "orig_desc", "string", o.orig_desc);
    if (o.trans_desc !== null && typeof o.trans_desc !== "string") throwError("ct_cat", "trans_desc", "string", o.trans_desc);
    if (o.desc_pages !== null && typeof o.desc_pages !== "string") throwError("ct_cat", "desc_pages", "string", o.desc_pages);
    if (o.size !== null && typeof o.size !== "string") throwError("ct_cat", "size", "string", o.size);
    if (o.etymology !== null && typeof o.etymology !== "string") throwError("ct_cat", "etymology", "string", o.etymology);
    if (o.extra_detail !== null && typeof o.extra_detail !== "string") throwError("ct_cat", "extra_detail", "string", o.extra_detail);
    if (o.editor_remarks !== null && typeof o.editor_remarks !== "string") throwError("ct_cat", "editor_remarks", "string", o.editor_remarks);
    if (typeof o.current_taxon !== "string") throwError("ct_cat", "current_taxon", "string", o.current_taxon);
    if (o.current_id !== null && typeof o.current_id !== "number") throwError("ct_cat", "current_id", "number", o.current_id);
    if (o.current_citation !== null && typeof o.current_citation !== "string") throwError("ct_cat", "current_citation", "string", o.current_citation);
    if (o.synonymy_status !== null && typeof o.synonymy_status !== "string") throwError("ct_cat", "synonymy_status", "string", o.synonymy_status);
    if (o.path !== null && typeof o.path !== "string") throwError("ct_cat", "path", "string", o.path);
    if (typeof o.hidden_flag !== "number") throwError("ct_cat", "hidden_flag", "number", o.hidden_flag);
    if (o.path_flag !== null && typeof o.path_flag !== "string") throwError("ct_cat", "path_flag", "string", o.path_flag);
    if (o.parent !== null && typeof o.parent !== "string") throwError("ct_cat", "parent", "string", o.parent);
    if (o.weight !== null && typeof o.weight !== "number") throwError("ct_cat", "weight", "number", o.weight);
    if (o.table_header !== null && typeof o.table_header !== "string") throwError("ct_cat", "table_header", "string", o.table_header);
    if (o.fad_text !== null && typeof o.fad_text !== "string") throwError("ct_cat", "fad_text", "string", o.fad_text);
    if (o.fad_source !== null && typeof o.fad_source !== "string") throwError("ct_cat", "fad_source", "string", o.fad_source);
    if (o.lad_text !== null && typeof o.lad_text !== "string") throwError("ct_cat", "lad_text", "string", o.lad_text);
    if (o.lad_source !== null && typeof o.lad_source !== "string") throwError("ct_cat", "lad_source", "string", o.lad_source);
    if (o.last_edit !== null && typeof o.last_edit !== "string") throwError("ct_cat", "last_edit", "string", o.last_edit);
    if (o.authorCopy !== null && typeof o.authorCopy !== "string") throwError("ct_cat", "authorCopy", "string", o.authorCopy);
    if (o.aphia_id !== null && typeof o.aphia_id !== "number") throwError("ct_cat", "aphia_id", "number", o.aphia_id);
    if (o.temp !== null && typeof o.temp !== "string") throwError("ct_cat", "temp", "string", o.temp);
}

export function assertct_catArray(o: any[]): asserts o is ct_cat[] {
	if (!Array.isArray(o)) throwError("ct_cat", "Array", "Array", o);
	for (const item of o) assertct_cat(item);
}

export interface ct_cat_images {
  file_name: string;
  id: number;
  image_type: string | null;
  species_f: string | null;
  caption: string | null;
  type_status: string | null;
  location: string | null;
  sample: string | null;
  geol_age: string | null;
  search_age: string | null;
  rating: number | null;
  source: string | null;
  source_refno: number | null;
  notes: string | null;
  lat_long: string | null;
  latitude: number | null;
  longitude: number | null;
  water_depth: string | null;
  collection_details: string | null;
  path: string | null;
  path_flag: string | null;
  width: number | null;
  height: string | null;
  capture_date: string | null;
  display_field: string;
  uploaded: string | null;
}

export function assertct_cat_images(o: any): asserts o is ct_cat_images {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.file_name !== "string") throwError("ct_cat_images", "file_name", "string", o.file_name);
    if (typeof o.id !== "number") throwError("ct_cat_images", "id", "number", o.id);
    if (o.image_type !== null && typeof o.image_type !== "string") throwError("ct_cat_images", "image_type", "string", o.image_type);
    if (o.species_f !== null && typeof o.species_f !== "string") throwError("ct_cat_images", "species_f", "string", o.species_f);
    if (o.caption !== null && typeof o.caption !== "string") throwError("ct_cat_images", "caption", "string", o.caption);
    if (o.type_status !== null && typeof o.type_status !== "string") throwError("ct_cat_images", "type_status", "string", o.type_status);
    if (o.location !== null && typeof o.location !== "string") throwError("ct_cat_images", "location", "string", o.location);
    if (o.sample !== null && typeof o.sample !== "string") throwError("ct_cat_images", "sample", "string", o.sample);
    if (o.geol_age !== null && typeof o.geol_age !== "string") throwError("ct_cat_images", "geol_age", "string", o.geol_age);
    if (o.search_age !== null && typeof o.search_age !== "string") throwError("ct_cat_images", "search_age", "string", o.search_age);
    if (o.rating !== null && typeof o.rating !== "number") throwError("ct_cat_images", "rating", "number", o.rating);
    if (o.source !== null && typeof o.source !== "string") throwError("ct_cat_images", "source", "string", o.source);
    if (o.source_refno !== null && typeof o.source_refno !== "number") throwError("ct_cat_images", "source_refno", "number", o.source_refno);
    if (o.notes !== null && typeof o.notes !== "string") throwError("ct_cat_images", "notes", "string", o.notes);
    if (o.lat_long !== null && typeof o.lat_long !== "string") throwError("ct_cat_images", "lat_long", "string", o.lat_long);
    if (o.latitude !== null && typeof o.latitude !== "number") throwError("ct_cat_images", "latitude", "number", o.latitude);
    if (o.longitude !== null && typeof o.longitude !== "number") throwError("ct_cat_images", "longitude", "number", o.longitude);
    if (o.water_depth !== null && typeof o.water_depth !== "string") throwError("ct_cat_images", "water_depth", "string", o.water_depth);
    if (o.collection_details !== null && typeof o.collection_details !== "string") throwError("ct_cat_images", "collection_details", "string", o.collection_details);
    if (o.path !== null && typeof o.path !== "string") throwError("ct_cat_images", "path", "string", o.path);
    if (o.path_flag !== null && typeof o.path_flag !== "string") throwError("ct_cat_images", "path_flag", "string", o.path_flag);
    if (o.width !== null && typeof o.width !== "number") throwError("ct_cat_images", "width", "number", o.width);
    if (o.height !== null && typeof o.height !== "string") throwError("ct_cat_images", "height", "string", o.height);
    if (o.capture_date !== null && typeof o.capture_date !== "string") throwError("ct_cat_images", "capture_date", "string", o.capture_date);
    if (typeof o.display_field !== "string") throwError("ct_cat_images", "display_field", "string", o.display_field);
    if (o.uploaded !== null && typeof o.uploaded !== "string") throwError("ct_cat_images", "uploaded", "string", o.uploaded);
}

export function assertct_cat_imagesArray(o: any[]): asserts o is ct_cat_images[] {
	if (!Array.isArray(o)) throwError("ct_cat_images", "Array", "Array", o);
	for (const item of o) assertct_cat_images(item);
}

export interface ct_icons {
  file_name: string;
  file_module: string | null;
  taxon: string;
  module: string;
  rating: number | null;
}

export function assertct_icons(o: any): asserts o is ct_icons {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.file_name !== "string") throwError("ct_icons", "file_name", "string", o.file_name);
    if (o.file_module !== null && typeof o.file_module !== "string") throwError("ct_icons", "file_module", "string", o.file_module);
    if (typeof o.taxon !== "string") throwError("ct_icons", "taxon", "string", o.taxon);
    if (typeof o.module !== "string") throwError("ct_icons", "module", "string", o.module);
    if (o.rating !== null && typeof o.rating !== "number") throwError("ct_icons", "rating", "number", o.rating);
}

export function assertct_iconsArray(o: any[]): asserts o is ct_icons[] {
	if (!Array.isArray(o)) throwError("ct_icons", "Array", "Array", o);
	for (const item of o) assertct_icons(item);
}

export interface ct_main {
  taxon: string;
  id: number;
  tax_rank: string | null;
  tax_rank_sorter: number | null;
  citation: string | null;
  basionym: string | null;
  type_species: string | null;
  synonyms: string | null;
  variants: string | null;
  cat_syns: string | null;
  taxonomic_remarks: string | null;
  primary_source: string | null;
  diagnosis: string | null;
  emend_desc: string | null;
  morphology: string | null;
  size_rem: string | null;
  geogr_distrib: string | null;
  paleobiol: string | null;
  evol_comments: string | null;
  MLA: string | null;
  mla_quality: number | null;
  mla_source: string | null;
  diverges_from_mla: string | null;
  similar_species: string | null;
  refs: string | null;
  refs_linked: string | null;
  refs_unedited: string | null;
  strat_notes: string | null;
  fad_text: string | null;
  fad_source: string | null;
  fad_pup: number | null;
  fad_quality: number | null;
  lad_text: string | null;
  lad_source: string | null;
  lad_quality: number | null;
  lad_pup: number | null;
  weight: number | null;
  table_header: string | null;
  table_caption: string | null;
  path: string | null;
  hidden_flag: number;
  path_flag: string | null;
  parent: string | null;
  last_edit: string | null;
  aphia_id: number | null;
}

export function assertct_main(o: any): asserts o is ct_main {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.taxon !== "string") throwError("ct_main", "taxon", "string", o.taxon);
    if (typeof o.id !== "number") throwError("ct_main", "id", "number", o.id);
    if (o.tax_rank !== null && typeof o.tax_rank !== "string") throwError("ct_main", "tax_rank", "string", o.tax_rank);
    if (o.tax_rank_sorter !== null && typeof o.tax_rank_sorter !== "number") throwError("ct_main", "tax_rank_sorter", "number", o.tax_rank_sorter);
    if (o.citation !== null && typeof o.citation !== "string") throwError("ct_main", "citation", "string", o.citation);
    if (o.basionym !== null && typeof o.basionym !== "string") throwError("ct_main", "basionym", "string", o.basionym);
    if (o.type_species !== null && typeof o.type_species !== "string") throwError("ct_main", "type_species", "string", o.type_species);
    if (o.synonyms !== null && typeof o.synonyms !== "string") throwError("ct_main", "synonyms", "string", o.synonyms);
    if (o.variants !== null && typeof o.variants !== "string") throwError("ct_main", "variants", "string", o.variants);
    if (o.cat_syns !== null && typeof o.cat_syns !== "string") throwError("ct_main", "cat_syns", "string", o.cat_syns);
    if (o.taxonomic_remarks !== null && typeof o.taxonomic_remarks !== "string") throwError("ct_main", "taxonomic_remarks", "string", o.taxonomic_remarks);
    if (o.primary_source !== null && typeof o.primary_source !== "string") throwError("ct_main", "primary_source", "string", o.primary_source);
    if (o.diagnosis !== null && typeof o.diagnosis !== "string") throwError("ct_main", "diagnosis", "string", o.diagnosis);
    if (o.emend_desc !== null && typeof o.emend_desc !== "string") throwError("ct_main", "emend_desc", "string", o.emend_desc);
    if (o.morphology !== null && typeof o.morphology !== "string") throwError("ct_main", "morphology", "string", o.morphology);
    if (o.size_rem !== null && typeof o.size_rem !== "string") throwError("ct_main", "size_rem", "string", o.size_rem);
    if (o.geogr_distrib !== null && typeof o.geogr_distrib !== "string") throwError("ct_main", "geogr_distrib", "string", o.geogr_distrib);
    if (o.paleobiol !== null && typeof o.paleobiol !== "string") throwError("ct_main", "paleobiol", "string", o.paleobiol);
    if (o.evol_comments !== null && typeof o.evol_comments !== "string") throwError("ct_main", "evol_comments", "string", o.evol_comments);
    if (o.MLA !== null && typeof o.MLA !== "string") throwError("ct_main", "MLA", "string", o.MLA);
    if (o.mla_quality !== null && typeof o.mla_quality !== "number") throwError("ct_main", "mla_quality", "number", o.mla_quality);
    if (o.mla_source !== null && typeof o.mla_source !== "string") throwError("ct_main", "mla_source", "string", o.mla_source);
    if (o.diverges_from_mla !== null && typeof o.diverges_from_mla !== "string") throwError("ct_main", "diverges_from_mla", "string", o.diverges_from_mla);
    if (o.similar_species !== null && typeof o.similar_species !== "string") throwError("ct_main", "similar_species", "string", o.similar_species);
    if (o.refs !== null && typeof o.refs !== "string") throwError("ct_main", "refs", "string", o.refs);
    if (o.refs_linked !== null && typeof o.refs_linked !== "string") throwError("ct_main", "refs_linked", "string", o.refs_linked);
    if (o.refs_unedited !== null && typeof o.refs_unedited !== "string") throwError("ct_main", "refs_unedited", "string", o.refs_unedited);
    if (o.strat_notes !== null && typeof o.strat_notes !== "string") throwError("ct_main", "strat_notes", "string", o.strat_notes);
    if (o.fad_text !== null && typeof o.fad_text !== "string") throwError("ct_main", "fad_text", "string", o.fad_text);
    if (o.fad_source !== null && typeof o.fad_source !== "string") throwError("ct_main", "fad_source", "string", o.fad_source);
    if (o.fad_pup !== null && typeof o.fad_pup !== "number") throwError("ct_main", "fad_pup", "number", o.fad_pup);
    if (o.fad_quality !== null && typeof o.fad_quality !== "number") throwError("ct_main", "fad_quality", "number", o.fad_quality);
    if (o.lad_text !== null && typeof o.lad_text !== "string") throwError("ct_main", "lad_text", "string", o.lad_text);
    if (o.lad_source !== null && typeof o.lad_source !== "string") throwError("ct_main", "lad_source", "string", o.lad_source);
    if (o.lad_quality !== null && typeof o.lad_quality !== "number") throwError("ct_main", "lad_quality", "number", o.lad_quality);
    if (o.lad_pup !== null && typeof o.lad_pup !== "number") throwError("ct_main", "lad_pup", "number", o.lad_pup);
    if (o.weight !== null && typeof o.weight !== "number") throwError("ct_main", "weight", "number", o.weight);
    if (o.table_header !== null && typeof o.table_header !== "string") throwError("ct_main", "table_header", "string", o.table_header);
    if (o.table_caption !== null && typeof o.table_caption !== "string") throwError("ct_main", "table_caption", "string", o.table_caption);
    if (o.path !== null && typeof o.path !== "string") throwError("ct_main", "path", "string", o.path);
    if (typeof o.hidden_flag !== "number") throwError("ct_main", "hidden_flag", "number", o.hidden_flag);
    if (o.path_flag !== null && typeof o.path_flag !== "string") throwError("ct_main", "path_flag", "string", o.path_flag);
    if (o.parent !== null && typeof o.parent !== "string") throwError("ct_main", "parent", "string", o.parent);
    if (o.last_edit !== null && typeof o.last_edit !== "string") throwError("ct_main", "last_edit", "string", o.last_edit);
    if (o.aphia_id !== null && typeof o.aphia_id !== "number") throwError("ct_main", "aphia_id", "number", o.aphia_id);
}

export function assertct_mainArray(o: any[]): asserts o is ct_main[] {
	if (!Array.isArray(o)) throwError("ct_main", "Array", "Array", o);
	for (const item of o) assertct_main(item);
}

export interface ct_main_images {
  file_name: string;
  id: number;
  image_type: string | null;
  species_f: string | null;
  caption: string | null;
  type_status: string | null;
  location: string | null;
  sample: string | null;
  geol_age: string | null;
  search_age: string | null;
  rating: number | null;
  source: string | null;
  source_refno: number | null;
  notes: string | null;
  lat_long: string | null;
  latitude: number | null;
  longitude: number | null;
  water_depth: string | null;
  collection_details: string | null;
  path: string | null;
  path_flag: string | null;
  width: number | null;
  height: string | null;
  capture_date: string | null;
  display_field: string;
  uploaded: string | null;
}

export function assertct_main_images(o: any): asserts o is ct_main_images {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.file_name !== "string") throwError("ct_main_images", "file_name", "string", o.file_name);
    if (typeof o.id !== "number") throwError("ct_main_images", "id", "number", o.id);
    if (o.image_type !== null && typeof o.image_type !== "string") throwError("ct_main_images", "image_type", "string", o.image_type);
    if (o.species_f !== null && typeof o.species_f !== "string") throwError("ct_main_images", "species_f", "string", o.species_f);
    if (o.caption !== null && typeof o.caption !== "string") throwError("ct_main_images", "caption", "string", o.caption);
    if (o.type_status !== null && typeof o.type_status !== "string") throwError("ct_main_images", "type_status", "string", o.type_status);
    if (o.location !== null && typeof o.location !== "string") throwError("ct_main_images", "location", "string", o.location);
    if (o.sample !== null && typeof o.sample !== "string") throwError("ct_main_images", "sample", "string", o.sample);
    if (o.geol_age !== null && typeof o.geol_age !== "string") throwError("ct_main_images", "geol_age", "string", o.geol_age);
    if (o.search_age !== null && typeof o.search_age !== "string") throwError("ct_main_images", "search_age", "string", o.search_age);
    if (o.rating !== null && typeof o.rating !== "number") throwError("ct_main_images", "rating", "number", o.rating);
    if (o.source !== null && typeof o.source !== "string") throwError("ct_main_images", "source", "string", o.source);
    if (o.source_refno !== null && typeof o.source_refno !== "number") throwError("ct_main_images", "source_refno", "number", o.source_refno);
    if (o.notes !== null && typeof o.notes !== "string") throwError("ct_main_images", "notes", "string", o.notes);
    if (o.lat_long !== null && typeof o.lat_long !== "string") throwError("ct_main_images", "lat_long", "string", o.lat_long);
    if (o.latitude !== null && typeof o.latitude !== "number") throwError("ct_main_images", "latitude", "number", o.latitude);
    if (o.longitude !== null && typeof o.longitude !== "number") throwError("ct_main_images", "longitude", "number", o.longitude);
    if (o.water_depth !== null && typeof o.water_depth !== "string") throwError("ct_main_images", "water_depth", "string", o.water_depth);
    if (o.collection_details !== null && typeof o.collection_details !== "string") throwError("ct_main_images", "collection_details", "string", o.collection_details);
    if (o.path !== null && typeof o.path !== "string") throwError("ct_main_images", "path", "string", o.path);
    if (o.path_flag !== null && typeof o.path_flag !== "string") throwError("ct_main_images", "path_flag", "string", o.path_flag);
    if (o.width !== null && typeof o.width !== "number") throwError("ct_main_images", "width", "number", o.width);
    if (o.height !== null && typeof o.height !== "string") throwError("ct_main_images", "height", "string", o.height);
    if (o.capture_date !== null && typeof o.capture_date !== "string") throwError("ct_main_images", "capture_date", "string", o.capture_date);
    if (typeof o.display_field !== "string") throwError("ct_main_images", "display_field", "string", o.display_field);
    if (o.uploaded !== null && typeof o.uploaded !== "string") throwError("ct_main_images", "uploaded", "string", o.uploaded);
}

export function assertct_main_imagesArray(o: any[]): asserts o is ct_main_images[] {
	if (!Array.isArray(o)) throwError("ct_main_images", "Array", "Array", o);
	for (const item of o) assertct_main_images(item);
}

export interface ct_reflinks {
  id: number;
  refno: number | null;
  taxon_id: number | null;
  category: string | null;
}

export function assertct_reflinks(o: any): asserts o is ct_reflinks {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("ct_reflinks", "id", "number", o.id);
    if (o.refno !== null && typeof o.refno !== "number") throwError("ct_reflinks", "refno", "number", o.refno);
    if (o.taxon_id !== null && typeof o.taxon_id !== "number") throwError("ct_reflinks", "taxon_id", "number", o.taxon_id);
    if (o.category !== null && typeof o.category !== "string") throwError("ct_reflinks", "category", "string", o.category);
}

export function assertct_reflinksArray(o: any[]): asserts o is ct_reflinks[] {
	if (!Array.isArray(o)) throwError("ct_reflinks", "Array", "Array", o);
	for (const item of o) assertct_reflinks(item);
}

export interface ct_refs {
  refno: number;
  abv_ref: string | null;
  authors: string | null;
  year: number | null;
  disambig: string | null;
  title: string | null;
  journal: string | null;
  series: string | null;
  journalid: number | null;
  vol: string | null;
  part: string | null;
  firstP: string | null;
  lastP: string | null;
  publisher: string | null;
  notes: string | null;
  language: string | null;
  editors: string | null;
  vol_title: string | null;
  ref_type: string | null;
  full_ref: string | null;
  DOI: string | null;
  pdf_name: string | null;
  pdf_path: string | null;
  pdf_size: number | null;
  pdf_shareable: string | null;
  pdf_quality: string | null;
  pdf_upload_date: string | null;
  source: string | null;
  keywords: string | null;
}

export function assertct_refs(o: any): asserts o is ct_refs {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.refno !== "number") throwError("ct_refs", "refno", "number", o.refno);
    if (o.abv_ref !== null && typeof o.abv_ref !== "string") throwError("ct_refs", "abv_ref", "string", o.abv_ref);
    if (o.authors !== null && typeof o.authors !== "string") throwError("ct_refs", "authors", "string", o.authors);
    if (o.year !== null && typeof o.year !== "number") throwError("ct_refs", "year", "number", o.year);
    if (o.disambig !== null && typeof o.disambig !== "string") throwError("ct_refs", "disambig", "string", o.disambig);
    if (o.title !== null && typeof o.title !== "string") throwError("ct_refs", "title", "string", o.title);
    if (o.journal !== null && typeof o.journal !== "string") throwError("ct_refs", "journal", "string", o.journal);
    if (o.series !== null && typeof o.series !== "string") throwError("ct_refs", "series", "string", o.series);
    if (o.journalid !== null && typeof o.journalid !== "number") throwError("ct_refs", "journalid", "number", o.journalid);
    if (o.vol !== null && typeof o.vol !== "string") throwError("ct_refs", "vol", "string", o.vol);
    if (o.part !== null && typeof o.part !== "string") throwError("ct_refs", "part", "string", o.part);
    if (o.firstP !== null && typeof o.firstP !== "string") throwError("ct_refs", "firstP", "string", o.firstP);
    if (o.lastP !== null && typeof o.lastP !== "string") throwError("ct_refs", "lastP", "string", o.lastP);
    if (o.publisher !== null && typeof o.publisher !== "string") throwError("ct_refs", "publisher", "string", o.publisher);
    if (o.notes !== null && typeof o.notes !== "string") throwError("ct_refs", "notes", "string", o.notes);
    if (o.language !== null && typeof o.language !== "string") throwError("ct_refs", "language", "string", o.language);
    if (o.editors !== null && typeof o.editors !== "string") throwError("ct_refs", "editors", "string", o.editors);
    if (o.vol_title !== null && typeof o.vol_title !== "string") throwError("ct_refs", "vol_title", "string", o.vol_title);
    if (o.ref_type !== null && typeof o.ref_type !== "string") throwError("ct_refs", "ref_type", "string", o.ref_type);
    if (o.full_ref !== null && typeof o.full_ref !== "string") throwError("ct_refs", "full_ref", "string", o.full_ref);
    if (o.DOI !== null && typeof o.DOI !== "string") throwError("ct_refs", "DOI", "string", o.DOI);
    if (o.pdf_name !== null && typeof o.pdf_name !== "string") throwError("ct_refs", "pdf_name", "string", o.pdf_name);
    if (o.pdf_path !== null && typeof o.pdf_path !== "string") throwError("ct_refs", "pdf_path", "string", o.pdf_path);
    if (o.pdf_size !== null && typeof o.pdf_size !== "number") throwError("ct_refs", "pdf_size", "number", o.pdf_size);
    if (o.pdf_shareable !== null && typeof o.pdf_shareable !== "string") throwError("ct_refs", "pdf_shareable", "string", o.pdf_shareable);
    if (o.pdf_quality !== null && typeof o.pdf_quality !== "string") throwError("ct_refs", "pdf_quality", "string", o.pdf_quality);
    if (o.pdf_upload_date !== null && typeof o.pdf_upload_date !== "string") throwError("ct_refs", "pdf_upload_date", "string", o.pdf_upload_date);
    if (o.source !== null && typeof o.source !== "string") throwError("ct_refs", "source", "string", o.source);
    if (o.keywords !== null && typeof o.keywords !== "string") throwError("ct_refs", "keywords", "string", o.keywords);
}

export function assertct_refsArray(o: any[]): asserts o is ct_refs[] {
	if (!Array.isArray(o)) throwError("ct_refs", "Array", "Array", o);
	for (const item of o) assertct_refs(item);
}

export interface journals {
  jid: number;
  jtitle: string;
  jabv: string | null;
  jtransliteration: string | null;
  jtranslation: string | null;
  jOAstart: number | null;
  jOAend: number | null;
  jnotes: string | null;
  jlanguage: string | null;
  ntaxhits: number | null;
  pfhits: number | null;
  bfhits: number | null;
  radshits: number | null;
  acrihits: number | null;
  diatomshits: number | null;
  CPdinoshits: number | null;
  dtaxhits: number | null;
  totalhits: number | null;
  ISSN: string | null;
}

export function assertjournals(o: any): asserts o is journals {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.jid !== "number") throwError("journals", "jid", "number", o.jid);
    if (typeof o.jtitle !== "string") throwError("journals", "jtitle", "string", o.jtitle);
    if (o.jabv !== null && typeof o.jabv !== "string") throwError("journals", "jabv", "string", o.jabv);
    if (o.jtransliteration !== null && typeof o.jtransliteration !== "string") throwError("journals", "jtransliteration", "string", o.jtransliteration);
    if (o.jtranslation !== null && typeof o.jtranslation !== "string") throwError("journals", "jtranslation", "string", o.jtranslation);
    if (o.jOAstart !== null && typeof o.jOAstart !== "number") throwError("journals", "jOAstart", "number", o.jOAstart);
    if (o.jOAend !== null && typeof o.jOAend !== "number") throwError("journals", "jOAend", "number", o.jOAend);
    if (o.jnotes !== null && typeof o.jnotes !== "string") throwError("journals", "jnotes", "string", o.jnotes);
    if (o.jlanguage !== null && typeof o.jlanguage !== "string") throwError("journals", "jlanguage", "string", o.jlanguage);
    if (o.ntaxhits !== null && typeof o.ntaxhits !== "number") throwError("journals", "ntaxhits", "number", o.ntaxhits);
    if (o.pfhits !== null && typeof o.pfhits !== "number") throwError("journals", "pfhits", "number", o.pfhits);
    if (o.bfhits !== null && typeof o.bfhits !== "number") throwError("journals", "bfhits", "number", o.bfhits);
    if (o.radshits !== null && typeof o.radshits !== "number") throwError("journals", "radshits", "number", o.radshits);
    if (o.acrihits !== null && typeof o.acrihits !== "number") throwError("journals", "acrihits", "number", o.acrihits);
    if (o.diatomshits !== null && typeof o.diatomshits !== "number") throwError("journals", "diatomshits", "number", o.diatomshits);
    if (o.CPdinoshits !== null && typeof o.CPdinoshits !== "number") throwError("journals", "CPdinoshits", "number", o.CPdinoshits);
    if (o.dtaxhits !== null && typeof o.dtaxhits !== "number") throwError("journals", "dtaxhits", "number", o.dtaxhits);
    if (o.totalhits !== null && typeof o.totalhits !== "number") throwError("journals", "totalhits", "number", o.totalhits);
    if (o.ISSN !== null && typeof o.ISSN !== "string") throwError("journals", "ISSN", "string", o.ISSN);
}

export function assertjournalsArray(o: any[]): asserts o is journals[] {
	if (!Array.isArray(o)) throwError("journals", "Array", "Array", o);
	for (const item of o) assertjournals(item);
}

export interface moduleFields {
  id: number;
  field: string | null;
  label: string | null;
  input_type: string | null;
  tooltip: string | null;
  f_group: string | null;
  sort_order: string | null;
  special: string | null;
  pf_cenozoic: string | null;
  pf_mesozoic: string | null;
  bf_main: string | null;
  ct_main: string | null;
  pf_cat: string | null;
  bf_cat: string | null;
  ct_cat: string | null;
  ntax_Farinacci: string | null;
  Acritax_JWIP: string | null;
  rads_cat: string | null;
  diatoms_cat: string | null;
  dtax_cat: string | null;
  dtax_dflgs: string | null;
  ntax_main: string | null;
  ntax_mesozoic: string | null;
  ntax_non_cocco: string | null;
  Acritax_Camb: string | null;
  rads_cenozoic: string | null;
  diatoms: string | null;
  Birds: string | null;
  CPdinos: string | null;
}

export function assertmoduleFields(o: any): asserts o is moduleFields {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("moduleFields", "id", "number", o.id);
    if (o.field !== null && typeof o.field !== "string") throwError("moduleFields", "field", "string", o.field);
    if (o.label !== null && typeof o.label !== "string") throwError("moduleFields", "label", "string", o.label);
    if (o.input_type !== null && typeof o.input_type !== "string") throwError("moduleFields", "input_type", "string", o.input_type);
    if (o.tooltip !== null && typeof o.tooltip !== "string") throwError("moduleFields", "tooltip", "string", o.tooltip);
    if (o.f_group !== null && typeof o.f_group !== "string") throwError("moduleFields", "f_group", "string", o.f_group);
    if (o.sort_order !== null && typeof o.sort_order !== "string") throwError("moduleFields", "sort_order", "string", o.sort_order);
    if (o.special !== null && typeof o.special !== "string") throwError("moduleFields", "special", "string", o.special);
    if (o.pf_cenozoic !== null && typeof o.pf_cenozoic !== "string") throwError("moduleFields", "pf_cenozoic", "string", o.pf_cenozoic);
    if (o.pf_mesozoic !== null && typeof o.pf_mesozoic !== "string") throwError("moduleFields", "pf_mesozoic", "string", o.pf_mesozoic);
    if (o.bf_main !== null && typeof o.bf_main !== "string") throwError("moduleFields", "bf_main", "string", o.bf_main);
    if (o.ct_main !== null && typeof o.ct_main !== "string") throwError("moduleFields", "ct_main", "string", o.ct_main);
    if (o.pf_cat !== null && typeof o.pf_cat !== "string") throwError("moduleFields", "pf_cat", "string", o.pf_cat);
    if (o.bf_cat !== null && typeof o.bf_cat !== "string") throwError("moduleFields", "bf_cat", "string", o.bf_cat);
    if (o.ct_cat !== null && typeof o.ct_cat !== "string") throwError("moduleFields", "ct_cat", "string", o.ct_cat);
    if (o.ntax_Farinacci !== null && typeof o.ntax_Farinacci !== "string") throwError("moduleFields", "ntax_Farinacci", "string", o.ntax_Farinacci);
    if (o.Acritax_JWIP !== null && typeof o.Acritax_JWIP !== "string") throwError("moduleFields", "Acritax_JWIP", "string", o.Acritax_JWIP);
    if (o.rads_cat !== null && typeof o.rads_cat !== "string") throwError("moduleFields", "rads_cat", "string", o.rads_cat);
    if (o.diatoms_cat !== null && typeof o.diatoms_cat !== "string") throwError("moduleFields", "diatoms_cat", "string", o.diatoms_cat);
    if (o.dtax_cat !== null && typeof o.dtax_cat !== "string") throwError("moduleFields", "dtax_cat", "string", o.dtax_cat);
    if (o.dtax_dflgs !== null && typeof o.dtax_dflgs !== "string") throwError("moduleFields", "dtax_dflgs", "string", o.dtax_dflgs);
    if (o.ntax_main !== null && typeof o.ntax_main !== "string") throwError("moduleFields", "ntax_main", "string", o.ntax_main);
    if (o.ntax_mesozoic !== null && typeof o.ntax_mesozoic !== "string") throwError("moduleFields", "ntax_mesozoic", "string", o.ntax_mesozoic);
    if (o.ntax_non_cocco !== null && typeof o.ntax_non_cocco !== "string") throwError("moduleFields", "ntax_non_cocco", "string", o.ntax_non_cocco);
    if (o.Acritax_Camb !== null && typeof o.Acritax_Camb !== "string") throwError("moduleFields", "Acritax_Camb", "string", o.Acritax_Camb);
    if (o.rads_cenozoic !== null && typeof o.rads_cenozoic !== "string") throwError("moduleFields", "rads_cenozoic", "string", o.rads_cenozoic);
    if (o.diatoms !== null && typeof o.diatoms !== "string") throwError("moduleFields", "diatoms", "string", o.diatoms);
    if (o.Birds !== null && typeof o.Birds !== "string") throwError("moduleFields", "Birds", "string", o.Birds);
    if (o.CPdinos !== null && typeof o.CPdinos !== "string") throwError("moduleFields", "CPdinos", "string", o.CPdinos);
}

export function assertmoduleFieldsArray(o: any[]): asserts o is moduleFields[] {
	if (!Array.isArray(o)) throwError("moduleFields", "Array", "Array", o);
	for (const item of o) assertmoduleFields(item);
}

export interface moduleSets {
  id: number;
  name: string | null;
  catalog: string | null;
  icons: string | null;
  ref_list: string | null;
  default_module: string | null;
  menu: string | null;
  neptax_table: string | null;
  fossil_group: string | null;
  image_reshape: string | null;
  prefix: string | null;
  iconstarget: number | null;
  refspref: string | null;
  longname: string | null;
  taxonomic: string | null;
  relsyns: string | null;
}

export function assertmoduleSets(o: any): asserts o is moduleSets {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("moduleSets", "id", "number", o.id);
    if (o.name !== null && typeof o.name !== "string") throwError("moduleSets", "name", "string", o.name);
    if (o.catalog !== null && typeof o.catalog !== "string") throwError("moduleSets", "catalog", "string", o.catalog);
    if (o.icons !== null && typeof o.icons !== "string") throwError("moduleSets", "icons", "string", o.icons);
    if (o.ref_list !== null && typeof o.ref_list !== "string") throwError("moduleSets", "ref_list", "string", o.ref_list);
    if (o.default_module !== null && typeof o.default_module !== "string") throwError("moduleSets", "default_module", "string", o.default_module);
    if (o.menu !== null && typeof o.menu !== "string") throwError("moduleSets", "menu", "string", o.menu);
    if (o.neptax_table !== null && typeof o.neptax_table !== "string") throwError("moduleSets", "neptax_table", "string", o.neptax_table);
    if (o.fossil_group !== null && typeof o.fossil_group !== "string") throwError("moduleSets", "fossil_group", "string", o.fossil_group);
    if (o.image_reshape !== null && typeof o.image_reshape !== "string") throwError("moduleSets", "image_reshape", "string", o.image_reshape);
    if (o.prefix !== null && typeof o.prefix !== "string") throwError("moduleSets", "prefix", "string", o.prefix);
    if (o.iconstarget !== null && typeof o.iconstarget !== "number") throwError("moduleSets", "iconstarget", "number", o.iconstarget);
    if (o.refspref !== null && typeof o.refspref !== "string") throwError("moduleSets", "refspref", "string", o.refspref);
    if (o.longname !== null && typeof o.longname !== "string") throwError("moduleSets", "longname", "string", o.longname);
    if (o.taxonomic !== null && typeof o.taxonomic !== "string") throwError("moduleSets", "taxonomic", "string", o.taxonomic);
    if (o.relsyns !== null && typeof o.relsyns !== "string") throwError("moduleSets", "relsyns", "string", o.relsyns);
}

export function assertmoduleSetsArray(o: any[]): asserts o is moduleSets[] {
	if (!Array.isArray(o)) throwError("moduleSets", "Array", "Array", o);
	for (const item of o) assertmoduleSets(item);
}

export interface moduleUsers {
  id: number;
  username: string | null;
  password: string | null;
  email: string | null;
  first_name: string | null;
  editor_level: number | null;
  default_module: string | null;
  ntax_main: string | null;
  ntax_Farinacci: string | null;
  pf_cat: string | null;
  pf_cenozoic: string | null;
  pf_mesozoic: string | null;
  bf_main: string | null;
  bf_cat: string | null;
  Acritax_JWIP: string | null;
  Acritax_Camb: string | null;
  unsorted: string | null;
  rads_cenozoic: string | null;
  rads_cat: string | null;
  CPdinos: string | null;
  dtax_dflgs: string | null;
  dtax_cat: string | null;
  birds: string | null;
  JR271_plankton_sampling: string | null;
  diatoms: string | null;
  diatoms_cat: string | null;
  UNEP: string | null;
  arkL: string | null;
  ct_main: string | null;
  ct_cat: string | null;
}

export function assertmoduleUsers(o: any): asserts o is moduleUsers {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.id !== "number") throwError("moduleUsers", "id", "number", o.id);
    if (o.username !== null && typeof o.username !== "string") throwError("moduleUsers", "username", "string", o.username);
    if (o.password !== null && typeof o.password !== "string") throwError("moduleUsers", "password", "string", o.password);
    if (o.email !== null && typeof o.email !== "string") throwError("moduleUsers", "email", "string", o.email);
    if (o.first_name !== null && typeof o.first_name !== "string") throwError("moduleUsers", "first_name", "string", o.first_name);
    if (o.editor_level !== null && typeof o.editor_level !== "number") throwError("moduleUsers", "editor_level", "number", o.editor_level);
    if (o.default_module !== null && typeof o.default_module !== "string") throwError("moduleUsers", "default_module", "string", o.default_module);
    if (o.ntax_main !== null && typeof o.ntax_main !== "string") throwError("moduleUsers", "ntax_main", "string", o.ntax_main);
    if (o.ntax_Farinacci !== null && typeof o.ntax_Farinacci !== "string") throwError("moduleUsers", "ntax_Farinacci", "string", o.ntax_Farinacci);
    if (o.pf_cat !== null && typeof o.pf_cat !== "string") throwError("moduleUsers", "pf_cat", "string", o.pf_cat);
    if (o.pf_cenozoic !== null && typeof o.pf_cenozoic !== "string") throwError("moduleUsers", "pf_cenozoic", "string", o.pf_cenozoic);
    if (o.pf_mesozoic !== null && typeof o.pf_mesozoic !== "string") throwError("moduleUsers", "pf_mesozoic", "string", o.pf_mesozoic);
    if (o.bf_main !== null && typeof o.bf_main !== "string") throwError("moduleUsers", "bf_main", "string", o.bf_main);
    if (o.bf_cat !== null && typeof o.bf_cat !== "string") throwError("moduleUsers", "bf_cat", "string", o.bf_cat);
    if (o.Acritax_JWIP !== null && typeof o.Acritax_JWIP !== "string") throwError("moduleUsers", "Acritax_JWIP", "string", o.Acritax_JWIP);
    if (o.Acritax_Camb !== null && typeof o.Acritax_Camb !== "string") throwError("moduleUsers", "Acritax_Camb", "string", o.Acritax_Camb);
    if (o.unsorted !== null && typeof o.unsorted !== "string") throwError("moduleUsers", "unsorted", "string", o.unsorted);
    if (o.rads_cenozoic !== null && typeof o.rads_cenozoic !== "string") throwError("moduleUsers", "rads_cenozoic", "string", o.rads_cenozoic);
    if (o.rads_cat !== null && typeof o.rads_cat !== "string") throwError("moduleUsers", "rads_cat", "string", o.rads_cat);
    if (o.CPdinos !== null && typeof o.CPdinos !== "string") throwError("moduleUsers", "CPdinos", "string", o.CPdinos);
    if (o.dtax_dflgs !== null && typeof o.dtax_dflgs !== "string") throwError("moduleUsers", "dtax_dflgs", "string", o.dtax_dflgs);
    if (o.dtax_cat !== null && typeof o.dtax_cat !== "string") throwError("moduleUsers", "dtax_cat", "string", o.dtax_cat);
    if (o.birds !== null && typeof o.birds !== "string") throwError("moduleUsers", "birds", "string", o.birds);
    if (o.JR271_plankton_sampling !== null && typeof o.JR271_plankton_sampling !== "string") throwError("moduleUsers", "JR271_plankton_sampling", "string", o.JR271_plankton_sampling);
    if (o.diatoms !== null && typeof o.diatoms !== "string") throwError("moduleUsers", "diatoms", "string", o.diatoms);
    if (o.diatoms_cat !== null && typeof o.diatoms_cat !== "string") throwError("moduleUsers", "diatoms_cat", "string", o.diatoms_cat);
    if (o.UNEP !== null && typeof o.UNEP !== "string") throwError("moduleUsers", "UNEP", "string", o.UNEP);
    if (o.arkL !== null && typeof o.arkL !== "string") throwError("moduleUsers", "arkL", "string", o.arkL);
    if (o.ct_main !== null && typeof o.ct_main !== "string") throwError("moduleUsers", "ct_main", "string", o.ct_main);
    if (o.ct_cat !== null && typeof o.ct_cat !== "string") throwError("moduleUsers", "ct_cat", "string", o.ct_cat);
}

export function assertmoduleUsersArray(o: any[]): asserts o is moduleUsers[] {
	if (!Array.isArray(o)) throwError("moduleUsers", "Array", "Array", o);
	for (const item of o) assertmoduleUsers(item);
}

export interface modules {
  refnum: number;
  name: string;
  linkname: string | null;
  catalog: string | null;
  icons: string | null;
  type: string | null;
  plot_Nep: string | null;
  menu: string | null;
  moduleSet: string | null;
  base_id: number | null;
  mla_used: string | null;
  updateform: string | null;
  plotintv: string | null;
  smart_name: string | null;
  gallery_class: string | null;
  image_ratio: number | null;
  relsyns: string | null;
  geolrange: string | null;
  modelw: number | null;
  modelh: number | null;
}

export function assertmodules(o: any): asserts o is modules {
  if (typeof o !== 'object' || o === null) throw new Error('Expected object');
    if (typeof o.refnum !== "number") throwError("modules", "refnum", "number", o.refnum);
    if (typeof o.name !== "string") throwError("modules", "name", "string", o.name);
    if (o.linkname !== null && typeof o.linkname !== "string") throwError("modules", "linkname", "string", o.linkname);
    if (o.catalog !== null && typeof o.catalog !== "string") throwError("modules", "catalog", "string", o.catalog);
    if (o.icons !== null && typeof o.icons !== "string") throwError("modules", "icons", "string", o.icons);
    if (o.type !== null && typeof o.type !== "string") throwError("modules", "type", "string", o.type);
    if (o.plot_Nep !== null && typeof o.plot_Nep !== "string") throwError("modules", "plot_Nep", "string", o.plot_Nep);
    if (o.menu !== null && typeof o.menu !== "string") throwError("modules", "menu", "string", o.menu);
    if (o.moduleSet !== null && typeof o.moduleSet !== "string") throwError("modules", "moduleSet", "string", o.moduleSet);
    if (o.base_id !== null && typeof o.base_id !== "number") throwError("modules", "base_id", "number", o.base_id);
    if (o.mla_used !== null && typeof o.mla_used !== "string") throwError("modules", "mla_used", "string", o.mla_used);
    if (o.updateform !== null && typeof o.updateform !== "string") throwError("modules", "updateform", "string", o.updateform);
    if (o.plotintv !== null && typeof o.plotintv !== "string") throwError("modules", "plotintv", "string", o.plotintv);
    if (o.smart_name !== null && typeof o.smart_name !== "string") throwError("modules", "smart_name", "string", o.smart_name);
    if (o.gallery_class !== null && typeof o.gallery_class !== "string") throwError("modules", "gallery_class", "string", o.gallery_class);
    if (o.image_ratio !== null && typeof o.image_ratio !== "number") throwError("modules", "image_ratio", "number", o.image_ratio);
    if (o.relsyns !== null && typeof o.relsyns !== "string") throwError("modules", "relsyns", "string", o.relsyns);
    if (o.geolrange !== null && typeof o.geolrange !== "string") throwError("modules", "geolrange", "string", o.geolrange);
    if (o.modelw !== null && typeof o.modelw !== "number") throwError("modules", "modelw", "number", o.modelw);
    if (o.modelh !== null && typeof o.modelh !== "number") throwError("modules", "modelh", "number", o.modelh);
}

export function assertmodulesArray(o: any[]): asserts o is modules[] {
	if (!Array.isArray(o)) throwError("modules", "Array", "Array", o);
	for (const item of o) assertmodules(item);
}

