# London / UCL Datapack Conversion

---

## What is this?

---

This subproject is the pipeline we use to convert the UCL London database data maintained for Professor Jeremy Young into a datapack that TSCOnline can use.

At a high level, the pipeline:

1. Connect to the London MySQL database
2. Export the relevant `arkL_*` tables to JSON
3. Convert those JSON exports into a TSC-style `.txt` datapack
4. Generate metadata for that datapack
5. Copy / migrate the generated datapack into the official datapack flow used by TSCOnline

The stable datapack title currently used by the app and admin sync flow is:

```text
UCL TSC Chron
```

---

## Main Files

---

The main London conversion files are:

```text
server/src/db/london/sql-to-json.ts
server/src/db/london/json-to-txt.ts
server/src/upload-london.ts
server/src/london-routes.ts
server/src/add-dev-config.ts
server/src/migrate-cached-datapacks.ts
app/src/admin/LondonDatabaseSync.tsx
```

Generated intermediate and output files are written under:

```text
server/db/london/output/
```

---

## Pipeline Overview

---

### 1. SQL -> JSON export

The first stage is `server/src/db/london/sql-to-json.ts`.

This script connects to the London MySQL database `nannodata_arkL`, regenerates `server/src/db/london/schema.ts`, and exports London tables to JSON files in `server/db/london/output/`.

The main exported tables currently include:

- `arkL_columns`
- `arkL_datasets`
- `arkL_events`
- `arkL_intervals`
- `arkL_subdatasets`

It also exports any table matching the `arkL`, `arkZ`, or `arkz` prefixes that downstream conversion may need.

The database connection depends on these environment variables:

```text
LONDON_DATABASE_HOST
LONDON_DATABASE_PORT
LONDON_DATABASE_USER
LONDON_DATABASE_PASSWORD
```

### 2. JSON -> TSC datapack text

The second stage is `server/src/db/london/json-to-txt.ts`.

This is the main conversion step. It reads the JSON exports from `server/db/london/output/` and converts them into a TSC datapack text file.

The generated file name format is:

```text
UCL_TSC_Chronostrat_<DDMonYYYY>.txt
```

For example:

```text
UCL_TSC_Chronostrat_07Aug2026.txt
```

This script also writes:

- `server/db/london/output/london-config.json`

That config file contains the `DatapackMetadata` used later when syncing the datapack into the official datapack flow.

#### What `json-to-txt.ts` is doing

The converter is column-type driven. It does not do one generic SQL-to-text transform. Instead, it:

1. loads the exported JSON tables
2. validates them against `schema.ts`
3. routes rows into column-family processors
4. emits TSC datapack lines for each supported column family
5. organizes those outputs into the final datapack tree
6. writes the final `.txt` datapack and `london-config.json`

The main entrypoint is:

```ts
generateLondonDatapack()
```

Inside that function, the exporter currently delegates to these column-family processors:

- `processEventColumns(...)`
- `processBlockColumns(...)`
- `processSequenceColumns(...)`
- `processChronColumns(...)`
- `processFaciesColumns(...)`
- `processSeaLevelCurveColumns(...)`
- `processPointDataColumns(...)`
- `processTransectColumns(...)`
- `processFreehandColumns(...)`

Each processor returns `ProcessColumnOutput[]`, with:

- the target path in the datapack tree
- the emitted column header / body lines
- a `sort` value

Those outputs are then merged and organized before the file is written.

### 3. Official datapack sync

The higher-level orchestration lives in `server/src/upload-london.ts`.

`processLondonDatapack()` currently does the following:

1. runs the database export via `connectToDB()`
2. generates the datapack text file via `generateLondonDatapack()`
3. removes stale official London datapacks
4. adds the London datapack metadata into the admin/offical datapack flow
5. migrates cached datapacks so the generated London datapack is available to TSCOnline

This is the main full-pipeline entrypoint.

---

## Commands

---

### Export database tables and generate the datapack text file

```bash
cd server
yarn london:process
```

This runs:

1. `node dist/db/london/sql-to-json.js`
2. `node dist/db/london/json-to-txt.js`

### Run the full London sync pipeline

```bash
cd server
yarn london
```

This runs:

```bash
node dist/upload-london.js
```

This is the end-to-end server-side London sync command.

### Copy London output into the official datapack/admin flow

```bash
cd server
yarn london:upload
```

This runs:

1. `yarn dev:config:overwrite --london`
2. `yarn migrate-datapacks --london`

### Root convenience command

From the repo root there is also:

```bash
yarn london-setup
```

This delegates to:

```bash
yarn workspace @tsconline/server run london
```

---

## Important Build Note

---

Most of the London scripts run the compiled files in `server/dist/`, not the TypeScript source directly.

That means you should build first if the server output is stale:

```bash
yarn build
```

or at minimum:

```bash
cd server
yarn build
```

---

## Outputs

---

The London pipeline produces three main output types:

### Generated schema

```text
server/src/db/london/schema.ts
```

### Exported JSON tables

```text
server/db/london/output/*.json
```

### Generated datapack + metadata

```text
server/db/london/output/UCL_TSC_Chronostrat_<DDMonYYYY>.txt
server/db/london/output/london-config.json
```

The datapack generator also prunes old generated London datapacks and keeps a limited history of recent files.

---

## App / Admin Integration

---

There are two main integration points after generation:

### Backend route

The server exposes:

```text
GET /migrate-london
```

This route regenerates the London datapack on demand, returns the datapack as a downloadable text file, and returns the associated metadata in the `X-Config` response header.

Implementation:

```text
server/src/london-routes.ts
```

### Admin UI sync

The admin UI includes a London sync button in:

```text
app/src/admin/LondonDatabaseSync.tsx
```

That flow:

1. calls `/migrate-london`
2. retrieves the generated datapack file plus metadata
3. deletes existing official London datapacks with the legacy/current titles
4. re-uploads the new datapack into the official datapack system

The current legacy title cleanup list includes:

- `UCL TSC Chron`
- `UCL TSC Facies`

---

## Automated Server Sync

---

The main backend also schedules an automatic London sync in `server/src/index.ts`.

Current behavior:

- runs every day at midnight server time
- calls `processLondonDatapack()`

So the London datapack is intended to refresh automatically even if nobody triggers the admin UI sync manually.

---

## Supported Column Families

---

Current implemented families:

- event columns
- block columns
- sequence columns
- chron columns
- facies columns
- sea-level curve columns
- point-data columns

---

## Missing / Incomplete Column Families

---

Still missing or incomplete:

- range chart
- blank
- bar chart
- stacked filled curve transect geometry
- graphic / images freehand geometry

In particular, `json-to-txt.ts` currently skips:

- transect-like London columns when there is no exported transect source geometry
- freehand / image-like columns when there is no exported image-placement source data

## Extending `json-to-txt.ts`

---

When adding a missing column type, the usual workflow is:

1. Find the real London source rows
2. Decide the TSC output format first
3. Add a dedicated processor in `json-to-txt.ts`
4. Register that processor in `generateLondonDatapack()`
5. Export any missing JSON tables in `sql-to-json.ts`
6. Rebuild and inspect the emitted `.txt` datapack

The normal processor pattern is:

1. filter `arkL_columns` by `column_type` / `column_subtype`
2. load the supporting rows
3. transform them into TSC datapack lines
4. return `ProcessColumnOutput[]`

Useful existing examples:

- `processEventColumns(...)`
- `processBlockColumns(...)`
- `processSequenceColumns(...)`
- `processPointDataColumns(...)`

Two things are easy to miss:

- if a processor is not added to `generateLondonDatapack()`, it will never affect output
- some missing types need new JSON export data first, not just a new formatter

In particular:

- `range chart`, `blank`, and `bar chart` are likely formatter work if the source rows already exist
- `stacked filled curve` / transect work probably starts in `sql-to-json.ts`
- `graphic` / `images` / freehand work probably also needs new exported placement data

When extending the converter, pay close attention to:

- shared helper functions for text, popup, age, and color normalization
- emitted `path` and `sort` values
- the final organization step after all processor outputs are merged

---

## Practical Workflow For Developers

---

If you are working on the London datapack conversion itself, the normal workflow is:

1. Update the conversion logic in `server/src/db/london/`
2. Build the server
3. Run `yarn london:process`
4. Inspect the generated JSON and `.txt` datapack in `server/db/london/output/`
5. If the datapack output looks correct, run `yarn london` or `yarn london:upload`
6. Verify the datapack appears correctly in the official datapack/admin flow
7. If needed, verify the admin sync button and `/migrate-london` behavior

---

## Things To Be Careful About

---

- The London pipeline depends on a live external MySQL database.
- The pipeline regenerates `server/src/db/london/schema.ts`, so schema changes in the source DB can affect the codegen output.
- The datapack title used for TSCOnline sync is intentionally stable even though the generated file name is date-stamped.
- The admin sync flow deletes earlier official London datapacks before uploading the newly generated one.
- The generated datapack text file is only one part of the flow; `london-config.json` is also required for the metadata/admin side.
- Some London-specific logic also appears in:
  - `server/src/add-dev-config.ts`
  - `server/src/migrate-cached-datapacks.ts`
  - `server/src/pull-supporting-files.ts`

If the conversion pipeline changes, these supporting files should be reviewed as well.
