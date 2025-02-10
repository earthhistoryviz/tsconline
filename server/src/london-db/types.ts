//   UNIQUE: ["Taxon"],
//   PRIMARY KEY: ["id"],
export interface CPdinos {
  id: number; // int unsigned NOT NULL
  Taxon: string; // varchar(255) NOT NULL DEFAULT ''
  citation: string | null; // varchar(255) DEFAULT NULL
  basionym: string | null; // varchar(255) DEFAULT ''
  synonyms: string | null; // varchar(255) DEFAULT NULL
  type_species: string | null; // varchar(255) DEFAULT NULL
  tax_rank: string | null; // varchar(255) DEFAULT NULL
  tax_rank_sorter: number | null; // int DEFAULT NULL
  weight: number | null; // int DEFAULT '0'
  EURA_number: string | null; // varchar(255) DEFAULT NULL
  diagnosis: string | null; // varchar(255) DEFAULT NULL
  FCPD_weblink: string | null; // varchar(255) DEFAULT NULL
  "3D_scanning": string | null; // varchar(255) DEFAULT NULL
  strat_notes: string | null; // mediumtext
  lad_text: string | null; // varchar(255) DEFAULT NULL
  fad_text: string | null; // varchar(255) DEFAULT NULL
  Age_Ma: number | null; // int DEFAULT NULL
  Subject: string | null; // mediumtext
  Construction: string | null; // mediumtext
  Conservation: string | null; // mediumtext
  Cons_summary: string | null; // mediumtext
  review2022: string | null; // mediumtext
  review2023: string | null; // mediumtext
  refs: string | null; // varchar(255) DEFAULT NULL
  refs_linked: string | null; // mediumtext
  Parent: string | null; // varchar(255) DEFAULT NULL
  detached_from: string | null; // varchar(255) DEFAULT NULL
  detached_from_id: number | null; // int DEFAULT NULL
  table_header: string | null; // varchar(255) DEFAULT NULL
  table_caption: string | null; // varchar(255) DEFAULT NULL
  path: string | null; // varchar(255) DEFAULT NULL
  path_flag: string | null; // varchar(10) DEFAULT NULL
  last_edit: string | null; // mediumtext
}

//   PRIMARY KEY: ["file_name", "taxon", "module"],
export interface CPdinos_icons {
  file_name: string; // varchar(255) NOT NULL DEFAULT ''
  file_module: string | null; // varchar(25) DEFAULT NULL
  taxon: string; // varchar(255) NOT NULL DEFAULT ''
  module: string; // varchar(255) NOT NULL DEFAULT ''
  rating: number | null; // int DEFAULT NULL
}

//   PRIMARY KEY: ["file_name"],
export interface CPdinos_images {
  file_name: string; // varchar(255) NOT NULL DEFAULT ''
  image_type: string | null; // varchar(255) DEFAULT NULL
  species_f: string | null; // varchar(255) DEFAULT NULL
  taxon_id: number | null; // int DEFAULT NULL
  caption: string | null; // mediumtext
  type_status: string | null; // varchar(255) DEFAULT NULL
  location: string | null; // varchar(255) DEFAULT NULL
  sample: string | null; // varchar(255) DEFAULT NULL
  geol_age: string | null; // varchar(255) DEFAULT NULL
  search_age: string | null; // varchar(100) DEFAULT NULL
  rating: number | null; // decimal(11,2) DEFAULT NULL
  source: string | null; // varchar(125) DEFAULT NULL
  source_refno: number | null; // int DEFAULT NULL
  notes: string | null; // mediumtext
  lat_long: string | null; // varchar(255) DEFAULT NULL
  latitude: number | null; // float(10,6) DEFAULT NULL
  longitude: number | null; // float(10,6) DEFAULT NULL
  water_depth: string | null; // varchar(255) DEFAULT NULL
  collection_details: string | null; // varchar(255) DEFAULT NULL
  path: string | null; // varchar(255) DEFAULT NULL
  path_flag: string | null; // varchar(255) DEFAULT NULL
  width: number | null; // int DEFAULT NULL
  height: string | null; // varchar(11) DEFAULT NULL
  capture_date: string | null; // varchar(255) DEFAULT NULL
  display_field: string | null; // varchar(50) DEFAULT NULL
  uploaded: string | null; // varchar(255) DEFAULT NULL
}

//   PRIMARY KEY: ["id"],
export interface CPdinos_reflinks {
  id: number; // int unsigned NOT NULL
  refno: number | null; // int DEFAULT NULL
  taxon_id: number | null; // int DEFAULT NULL
  category: string | null; // varchar(255) DEFAULT ''
}

//   PRIMARY KEY: ["refno"],
export interface CPdinos_refs {
  refno: number; // int NOT NULL
  abv_ref: string | null; // varchar(255) DEFAULT NULL
  authors: string | null; // mediumtext
  year: number | null; // int DEFAULT NULL
  disambig: string | null; // varchar(255) DEFAULT NULL
  title: string | null; // mediumtext
  journal: string | null; // varchar(255) DEFAULT NULL
  journalid: number | null; // int DEFAULT NULL
  series: string | null; // varchar(255) DEFAULT NULL
  vol: string | null; // varchar(50) DEFAULT NULL
  part: string | null; // varchar(50) DEFAULT NULL
  firstP: string | null; // varchar(50) DEFAULT NULL
  lastP: string | null; // varchar(50) DEFAULT NULL
  publisher: string | null; // varchar(255) DEFAULT ''
  notes: string | null; // mediumtext
  language: string | null; // varchar(50) DEFAULT NULL
  editors: string | null; // mediumtext
  vol_title: string | null; // mediumtext
  ref_type: string | null; // varchar(50) DEFAULT NULL
  DOI: string | null; // varchar(255) DEFAULT NULL
  pdf_name: string | null; // varchar(500) DEFAULT NULL
  pdf_path: string | null; // varchar(500) DEFAULT NULL
  pdf_size: number | null; // int DEFAULT NULL
  pdf_shareable: string | null; // varchar(255) DEFAULT NULL
  pdf_quality: string | null; // varchar(100) DEFAULT NULL
  pdf_upload_date: string | null; // varchar(50) DEFAULT NULL
  full_ref: string | null; // mediumtext
}
