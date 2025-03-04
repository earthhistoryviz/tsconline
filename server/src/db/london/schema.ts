import { throwError } from "@tsconline/shared";

//   PRIMARY KEY: ["id"],
export interface arkL_datasets {
  id: number; // int unsigned NOT NULL
  dataset: string | null; // varchar(255)
  dataset_type: string | null; // varchar(25)
  sort: number | null; // int DEFAULT NULL
  notes_Cret: string | null; // text
  compilation_notes_Cret: string | null; // text
  prefix: string | null; // varchar(25)
  added_abv: string | null; // varchar(255)
  main_interval_type: string | null; // varchar(25)
  interval_types: string | null; // varchar(255)
  colour: string | null; // varchar(20)
  width: number | null; // int DEFAULT NULL
  source_sheet: string | null; // varchar(25)
  refstoadd: string | null; // varchar(255)
  notes_Jur: string | null; // mediumtext
  compilation_notes_Jur: string | null; // text
}

//   PRIMARY KEY: ["id"],
//   UNIQUE: ["eventx"],
export interface arkL_events {
  id: number; // int unsigned NOT NULL
  eventx: string | null; // varchar(255)
  alternative_termE: string | null; // varchar(255)
  has_added_abvE: string | null; // varchar(5)
  pup: number | null; // decimal(5,4) DEFAULT NULL
  within_intv: string | null; // varchar(255)
  within_intv_id: number | null; // int DEFAULT NULL
  age: number | null; // decimal(9,4) DEFAULT NULL
  offset: number | null; // decimal(9,4) DEFAULT NULL
  offset_from_event: string | null; // varchar(255)
  offset_from_id: number | null; // int DEFAULT NULL
  age2020: number | null; // decimal(9,4) DEFAULT NULL
  stage: string | null; // varchar(50)
  preset_age: number | null; // decimal(9,4) DEFAULT NULL
  preset_age_notes: string | null; // mediumtext
  dataset: string | null; // varchar(50)
  dataset_id: number | null; // int DEFAULT NULL
  sub_dataset: string | null; // varchar(100)
  sub_columnE: string | null; // varchar(50)
  sort: number | null; // int DEFAULT NULL
  event_type: string | null; // varchar(100)
  event_display: string | null; // varchar(25)
  taxa: string | null; // varchar(500)
  T_Rcycle_use: string | null; // varchar(25)
  sea_level: number | null; // int DEFAULT NULL
  sea_level_notes: string | null; // text
  equation: string | null; // varchar(255)
  notes_2004: string | null; // mediumtext
  notes_2020: string | null; // text
  compilation_notesE: string | null; // mediumtext
  tracecode: string | null; // varchar(100)
  refstoadd: string | null; // varchar(255)
}

//   PRIMARY KEY: ["id"],
//   UNIQUE: ["intervalx"],
export interface arkL_intervals {
  id: number; // int unsigned NOT NULL
  intervalx: string | null; // varchar(255)
  has_added_abv: string | null; // varchar(5)
  alternative_term: string | null; // varchar(255)
  top_event: string | null; // varchar(255)
  top_id: number | null; // int DEFAULT NULL
  base_event: string | null; // varchar(255)
  base_id: number | null; // int DEFAULT NULL
  top_age: number | null; // decimal(10,4) DEFAULT NULL
  base_age: number | null; // decimal(10,4) DEFAULT NULL
  duration: number | null; // decimal(10,4) DEFAULT NULL
  top_age2020: number | null; // decimal(10,4) DEFAULT NULL
  base_age2020: number | null; // decimal(10,4) DEFAULT NULL
  stage: string | null; // varchar(50)
  dataset: string | null; // varchar(50)
  dataset_id: number | null; // int DEFAULT NULL
  sub_dataset: string | null; // varchar(100)
  preset_duration: number | null; // decimal(10,4) DEFAULT NULL
  preset_duration_notes: string | null; // mediumtext
  interval_notes: string | null; // mediumtext
  compilation_notes: string | null; // mediumtext
  sort: number | null; // int DEFAULT NULL
  interval_type: string | null; // varchar(50)
  sub_column: string | null; // varchar(50)
  parent_interval: string | null; // varchar(50)
  polarity: string | null; // varchar(10)
  colour: string | null; // varchar(20)
  tracecode: string | null; // varchar(100)
  refstoadd: string | null; // varchar(255)
  block_label: string | null; // varchar(100)
}

//   PRIMARY KEY: ["id"],
export interface arkL_taxon_links {
  id: number; // int unsigned NOT NULL
  event_id: number | null; // int DEFAULT NULL
  eventx: string | null; // varchar(255)
  dataset: string | null; // varchar(50)
  event_type: string | null; // varchar(50)
  stage: string | null; // varchar(50)
  taxon: string | null; // varchar(255)
  qualifier: string | null; // varchar(50)
  taxon_datasource: string | null; // varchar(50)
  taxon_in_datasource: string | null; // varchar(100)
  taxon_qualification: string | null; // varchar(50)
  id_in_datasource: string | null; // varchar(25)
}

export function assertarkL_datasets(o: any): asserts o is arkL_datasets {
	if (typeof o.id !== "number") throwError("arkL_datasets", "id", "number", o.id);
	if (!(typeof o.dataset === "string" || o.dataset === null)) throwError("arkL_datasets", "dataset", "string | null", o.dataset);
	if (!(typeof o.dataset_type === "string" || o.dataset_type === null)) throwError("arkL_datasets", "dataset_type", "string | null", o.dataset_type);
	if (!(typeof o.sort === "number" || o.sort === null)) throwError("arkL_datasets", "sort", "number | null", o.sort);
	if (!(typeof o.notes_Cret === "string" || o.notes_Cret === null)) throwError("arkL_datasets", "notes_Cret", "string | null", o.notes_Cret);
	if (!(typeof o.compilation_notes_Cret === "string" || o.compilation_notes_Cret === null)) throwError("arkL_datasets", "compilation_notes_Cret", "string | null", o.compilation_notes_Cret);
	if (!(typeof o.prefix === "string" || o.prefix === null)) throwError("arkL_datasets", "prefix", "string | null", o.prefix);
	if (!(typeof o.added_abv === "string" || o.added_abv === null)) throwError("arkL_datasets", "added_abv", "string | null", o.added_abv);
	if (!(typeof o.main_interval_type === "string" || o.main_interval_type === null)) throwError("arkL_datasets", "main_interval_type", "string | null", o.main_interval_type);
	if (!(typeof o.interval_types === "string" || o.interval_types === null)) throwError("arkL_datasets", "interval_types", "string | null", o.interval_types);
	if (!(typeof o.colour === "string" || o.colour === null)) throwError("arkL_datasets", "colour", "string | null", o.colour);
	if (!(typeof o.width === "number" || o.width === null)) throwError("arkL_datasets", "width", "number | null", o.width);
	if (!(typeof o.source_sheet === "string" || o.source_sheet === null)) throwError("arkL_datasets", "source_sheet", "string | null", o.source_sheet);
	if (!(typeof o.refstoadd === "string" || o.refstoadd === null)) throwError("arkL_datasets", "refstoadd", "string | null", o.refstoadd);
	if (!(typeof o.notes_Jur === "string" || o.notes_Jur === null)) throwError("arkL_datasets", "notes_Jur", "string | null", o.notes_Jur);
	if (!(typeof o.compilation_notes_Jur === "string" || o.compilation_notes_Jur === null)) throwError("arkL_datasets", "compilation_notes_Jur", "string | null", o.compilation_notes_Jur);
}

export function assertarkL_events(o: any): asserts o is arkL_events {
	if (typeof o.id !== "number") throwError("arkL_events", "id", "number", o.id);
	if (!(typeof o.eventx === "string" || o.eventx === null)) throwError("arkL_events", "eventx", "string | null", o.eventx);
	if (!(typeof o.alternative_termE === "string" || o.alternative_termE === null)) throwError("arkL_events", "alternative_termE", "string | null", o.alternative_termE);
	if (!(typeof o.has_added_abvE === "string" || o.has_added_abvE === null)) throwError("arkL_events", "has_added_abvE", "string | null", o.has_added_abvE);
	if (!(typeof o.pup === "number" || o.pup === null)) throwError("arkL_events", "pup", "number | null", o.pup);
	if (!(typeof o.within_intv === "string" || o.within_intv === null)) throwError("arkL_events", "within_intv", "string | null", o.within_intv);
	if (!(typeof o.within_intv_id === "number" || o.within_intv_id === null)) throwError("arkL_events", "within_intv_id", "number | null", o.within_intv_id);
	if (!(typeof o.age === "number" || o.age === null)) throwError("arkL_events", "age", "number | null", o.age);
	if (!(typeof o.offset === "number" || o.offset === null)) throwError("arkL_events", "offset", "number | null", o.offset);
	if (!(typeof o.offset_from_event === "string" || o.offset_from_event === null)) throwError("arkL_events", "offset_from_event", "string | null", o.offset_from_event);
	if (!(typeof o.offset_from_id === "number" || o.offset_from_id === null)) throwError("arkL_events", "offset_from_id", "number | null", o.offset_from_id);
	if (!(typeof o.age2020 === "number" || o.age2020 === null)) throwError("arkL_events", "age2020", "number | null", o.age2020);
	if (!(typeof o.stage === "string" || o.stage === null)) throwError("arkL_events", "stage", "string | null", o.stage);
	if (!(typeof o.preset_age === "number" || o.preset_age === null)) throwError("arkL_events", "preset_age", "number | null", o.preset_age);
	if (!(typeof o.preset_age_notes === "string" || o.preset_age_notes === null)) throwError("arkL_events", "preset_age_notes", "string | null", o.preset_age_notes);
	if (!(typeof o.dataset === "string" || o.dataset === null)) throwError("arkL_events", "dataset", "string | null", o.dataset);
	if (!(typeof o.dataset_id === "number" || o.dataset_id === null)) throwError("arkL_events", "dataset_id", "number | null", o.dataset_id);
	if (!(typeof o.sub_dataset === "string" || o.sub_dataset === null)) throwError("arkL_events", "sub_dataset", "string | null", o.sub_dataset);
	if (!(typeof o.sub_columnE === "string" || o.sub_columnE === null)) throwError("arkL_events", "sub_columnE", "string | null", o.sub_columnE);
	if (!(typeof o.sort === "number" || o.sort === null)) throwError("arkL_events", "sort", "number | null", o.sort);
	if (!(typeof o.event_type === "string" || o.event_type === null)) throwError("arkL_events", "event_type", "string | null", o.event_type);
	if (!(typeof o.event_display === "string" || o.event_display === null)) throwError("arkL_events", "event_display", "string | null", o.event_display);
	if (!(typeof o.taxa === "string" || o.taxa === null)) throwError("arkL_events", "taxa", "string | null", o.taxa);
	if (!(typeof o.T_Rcycle_use === "string" || o.T_Rcycle_use === null)) throwError("arkL_events", "T_Rcycle_use", "string | null", o.T_Rcycle_use);
	if (!(typeof o.sea_level === "number" || o.sea_level === null)) throwError("arkL_events", "sea_level", "number | null", o.sea_level);
	if (!(typeof o.sea_level_notes === "string" || o.sea_level_notes === null)) throwError("arkL_events", "sea_level_notes", "string | null", o.sea_level_notes);
	if (!(typeof o.equation === "string" || o.equation === null)) throwError("arkL_events", "equation", "string | null", o.equation);
	if (!(typeof o.notes_2004 === "string" || o.notes_2004 === null)) throwError("arkL_events", "notes_2004", "string | null", o.notes_2004);
	if (!(typeof o.notes_2020 === "string" || o.notes_2020 === null)) throwError("arkL_events", "notes_2020", "string | null", o.notes_2020);
	if (!(typeof o.compilation_notesE === "string" || o.compilation_notesE === null)) throwError("arkL_events", "compilation_notesE", "string | null", o.compilation_notesE);
	if (!(typeof o.tracecode === "string" || o.tracecode === null)) throwError("arkL_events", "tracecode", "string | null", o.tracecode);
	if (!(typeof o.refstoadd === "string" || o.refstoadd === null)) throwError("arkL_events", "refstoadd", "string | null", o.refstoadd);
}

export function assertarkL_intervals(o: any): asserts o is arkL_intervals {
	if (typeof o.id !== "number") throwError("arkL_intervals", "id", "number", o.id);
	if (!(typeof o.intervalx === "string" || o.intervalx === null)) throwError("arkL_intervals", "intervalx", "string | null", o.intervalx);
	if (!(typeof o.has_added_abv === "string" || o.has_added_abv === null)) throwError("arkL_intervals", "has_added_abv", "string | null", o.has_added_abv);
	if (!(typeof o.alternative_term === "string" || o.alternative_term === null)) throwError("arkL_intervals", "alternative_term", "string | null", o.alternative_term);
	if (!(typeof o.top_event === "string" || o.top_event === null)) throwError("arkL_intervals", "top_event", "string | null", o.top_event);
	if (!(typeof o.top_id === "number" || o.top_id === null)) throwError("arkL_intervals", "top_id", "number | null", o.top_id);
	if (!(typeof o.base_event === "string" || o.base_event === null)) throwError("arkL_intervals", "base_event", "string | null", o.base_event);
	if (!(typeof o.base_id === "number" || o.base_id === null)) throwError("arkL_intervals", "base_id", "number | null", o.base_id);
	if (!(typeof o.top_age === "number" || o.top_age === null)) throwError("arkL_intervals", "top_age", "number | null", o.top_age);
	if (!(typeof o.base_age === "number" || o.base_age === null)) throwError("arkL_intervals", "base_age", "number | null", o.base_age);
	if (!(typeof o.duration === "number" || o.duration === null)) throwError("arkL_intervals", "duration", "number | null", o.duration);
	if (!(typeof o.top_age2020 === "number" || o.top_age2020 === null)) throwError("arkL_intervals", "top_age2020", "number | null", o.top_age2020);
	if (!(typeof o.base_age2020 === "number" || o.base_age2020 === null)) throwError("arkL_intervals", "base_age2020", "number | null", o.base_age2020);
	if (!(typeof o.stage === "string" || o.stage === null)) throwError("arkL_intervals", "stage", "string | null", o.stage);
	if (!(typeof o.dataset === "string" || o.dataset === null)) throwError("arkL_intervals", "dataset", "string | null", o.dataset);
	if (!(typeof o.dataset_id === "number" || o.dataset_id === null)) throwError("arkL_intervals", "dataset_id", "number | null", o.dataset_id);
	if (!(typeof o.sub_dataset === "string" || o.sub_dataset === null)) throwError("arkL_intervals", "sub_dataset", "string | null", o.sub_dataset);
	if (!(typeof o.preset_duration === "number" || o.preset_duration === null)) throwError("arkL_intervals", "preset_duration", "number | null", o.preset_duration);
	if (!(typeof o.preset_duration_notes === "string" || o.preset_duration_notes === null)) throwError("arkL_intervals", "preset_duration_notes", "string | null", o.preset_duration_notes);
	if (!(typeof o.interval_notes === "string" || o.interval_notes === null)) throwError("arkL_intervals", "interval_notes", "string | null", o.interval_notes);
	if (!(typeof o.compilation_notes === "string" || o.compilation_notes === null)) throwError("arkL_intervals", "compilation_notes", "string | null", o.compilation_notes);
	if (!(typeof o.sort === "number" || o.sort === null)) throwError("arkL_intervals", "sort", "number | null", o.sort);
	if (!(typeof o.interval_type === "string" || o.interval_type === null)) throwError("arkL_intervals", "interval_type", "string | null", o.interval_type);
	if (!(typeof o.sub_column === "string" || o.sub_column === null)) throwError("arkL_intervals", "sub_column", "string | null", o.sub_column);
	if (!(typeof o.parent_interval === "string" || o.parent_interval === null)) throwError("arkL_intervals", "parent_interval", "string | null", o.parent_interval);
	if (!(typeof o.polarity === "string" || o.polarity === null)) throwError("arkL_intervals", "polarity", "string | null", o.polarity);
	if (!(typeof o.colour === "string" || o.colour === null)) throwError("arkL_intervals", "colour", "string | null", o.colour);
	if (!(typeof o.tracecode === "string" || o.tracecode === null)) throwError("arkL_intervals", "tracecode", "string | null", o.tracecode);
	if (!(typeof o.refstoadd === "string" || o.refstoadd === null)) throwError("arkL_intervals", "refstoadd", "string | null", o.refstoadd);
	if (!(typeof o.block_label === "string" || o.block_label === null)) throwError("arkL_intervals", "block_label", "string | null", o.block_label);
}

export function assertarkL_taxon_links(o: any): asserts o is arkL_taxon_links {
	if (typeof o.id !== "number") throwError("arkL_taxon_links", "id", "number", o.id);
	if (!(typeof o.event_id === "number" || o.event_id === null)) throwError("arkL_taxon_links", "event_id", "number | null", o.event_id);
	if (!(typeof o.eventx === "string" || o.eventx === null)) throwError("arkL_taxon_links", "eventx", "string | null", o.eventx);
	if (!(typeof o.dataset === "string" || o.dataset === null)) throwError("arkL_taxon_links", "dataset", "string | null", o.dataset);
	if (!(typeof o.event_type === "string" || o.event_type === null)) throwError("arkL_taxon_links", "event_type", "string | null", o.event_type);
	if (!(typeof o.stage === "string" || o.stage === null)) throwError("arkL_taxon_links", "stage", "string | null", o.stage);
	if (!(typeof o.taxon === "string" || o.taxon === null)) throwError("arkL_taxon_links", "taxon", "string | null", o.taxon);
	if (!(typeof o.qualifier === "string" || o.qualifier === null)) throwError("arkL_taxon_links", "qualifier", "string | null", o.qualifier);
	if (!(typeof o.taxon_datasource === "string" || o.taxon_datasource === null)) throwError("arkL_taxon_links", "taxon_datasource", "string | null", o.taxon_datasource);
	if (!(typeof o.taxon_in_datasource === "string" || o.taxon_in_datasource === null)) throwError("arkL_taxon_links", "taxon_in_datasource", "string | null", o.taxon_in_datasource);
	if (!(typeof o.taxon_qualification === "string" || o.taxon_qualification === null)) throwError("arkL_taxon_links", "taxon_qualification", "string | null", o.taxon_qualification);
	if (!(typeof o.id_in_datasource === "string" || o.id_in_datasource === null)) throwError("arkL_taxon_links", "id_in_datasource", "string | null", o.id_in_datasource);
}