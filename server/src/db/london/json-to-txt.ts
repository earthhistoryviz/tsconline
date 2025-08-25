import {
  arkL_columns,
  arkL_datasets,
  arkL_events,
  arkL_intervals,
  arkL_subdatasets,
  assertarkL_columnsArray,
  assertarkL_datasetsArray,
  assertarkL_eventsArray,
  assertarkL_intervalsArray,
  assertarkL_subdatasetsArray
} from "./schema.js";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";

const outputDir = join("db", "london", "output");

async function loadJSONS() {
  const datasetsFilePath = join(outputDir, "arkL_datasets.json");
  const eventsFilePath = join(outputDir, "arkL_events.json");
  const intervalsFilePath = join(outputDir, "arkL_intervals.json");
  const columnsFilePath = join(outputDir, "arkL_columns.json");
  const subdatasetsFilePath = join(outputDir, "arkL_subdatasets.json");
  const datasets = JSON.parse(await readFile(datasetsFilePath, "utf8"));
  assertarkL_datasetsArray(datasets);
  const events = JSON.parse(await readFile(eventsFilePath, "utf8"));
  assertarkL_eventsArray(events);
  const intervals = JSON.parse(await readFile(intervalsFilePath, "utf8"));
  assertarkL_intervalsArray(intervals);
  const columns = JSON.parse(await readFile(columnsFilePath, "utf8"));
  assertarkL_columnsArray(columns);
  const subdatasets = JSON.parse(await readFile(subdatasetsFilePath, "utf8"));
  assertarkL_subdatasetsArray(subdatasets);
  return { datasets, events, intervals, columns, subdatasets };
}

type StringDict = { [key: string]: string[] };
type StringDictSet = { [key: string]: Set<string> };
type ProcessColumnOutput = { path: string; column: string; lines: string[]; sort: number };

async function processSequenceColumns(events: arkL_events[], columns: arkL_columns[], datasets: arkL_datasets[]) {
  const sequenceColumns: ProcessColumnOutput[] = [];
  for (const column of columns) {
    const lines = [];
    if (column.column_type === "sequence") {
      const dataset = datasets.find((dataset) => dataset.id === column.dataset_id);
      if (!dataset) {
        console.log(chalk.yellow("missing dataset id for " + column.columnx));
        continue;
      }
      // Add other column types (intervals but they have sequence types, but no info on SB, MFS, Major, Minor, etc.)
      let sequenceEvents = [];
      if (column.sub_columnE !== "" && column.sub_columnE !== null) {
        const regex = new RegExp(column.sub_columnE!, "i");
        sequenceEvents = events
          .filter((event) => event.dataset_id === column.dataset_id && event.sub_columnE.match(regex) && event.age)
          .sort((a, b) => a.age! - b.age!);
      } else {
        sequenceEvents = events
          .filter((event) => event.dataset_id === column.dataset_id && event.age)
          .sort((a, b) => a.age! - b.age!);
      }
      if (sequenceEvents.length === 0) {
        console.log(chalk.yellow("missing sequence events for " + column.columnx));
        continue;
      }
      const colour = dataset.colour;
      // which notes to use? Cenoz, Jur, Cret, multi?
      const popup = dataset.notes_Cenoz;
      let line = `${column.columnx}\tsequence\t${column.width || ""}\t${colour || ""}\tnotitle\toff\t${popup !== null ? popup.replace(/[\r\n]+/g, " ") : ""}`;
      lines.push(line);
      for (const event of sequenceEvents) {
        const sequenceType =
          event.event_type === "seq bdy" ? "SB" : event.event_type === "mfs" ? "MFS" : event.event_type;
        let label = sequenceType === "MFS" ? "" : event.eventx != null ? event.eventx : "";
        if (sequenceType === "SB" && label) {
          label = label.replace(/seqbdy/gi, "").trim();
        }
        line = `\t${label}\t${sequenceType}\t${event.age}\t${event.seq_scale}${event.notes_2020 !== null ? `\t${event.notes_2020?.replace(/[\r\n]+/g, " ")}` : ""}`;
        lines.push(line);
      }
      // for blank space between columns for tscreator to parse
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
  }
  return sequenceColumns;
}

async function processEventColumns(datasets: arkL_datasets[], columns: arkL_columns[], events: arkL_events[]) {
  const eventColumns: ProcessColumnOutput[] = [];
  for (const column of columns) {
    const columnLines: string[] = [];
    if (column.column_type === "events") {
      const dataset = datasets.find((dataset) => dataset.id === column.dataset_id);
      if (!dataset) {
        console.log(chalk.yellow("missing dataset id for " + column.columnx));
        continue;
      }
      let dbEvents = [];
      if (column.sub_columnE !== "" && column.sub_columnE !== null) {
        const regex = new RegExp(column.sub_columnE!, "i");
        dbEvents = events
          .filter((event) => event.dataset_id === column.dataset_id && event.sub_columnE.match(regex) && event.age)
          .sort((a, b) => a.age! - b.age!);
      } else {
        dbEvents = events
          .filter((event) => event.dataset_id === column.dataset_id && event.age)
          .sort((a, b) => a.age! - b.age!);
      }
      const lads = [];
      const fads = [];
      //add other event types (ex. turnover?)
      for (const event of dbEvents) {
        if (event.event_type === "LAD") {
          lads.push(event);
        } else if (event.event_type === "FAD") {
          fads.push(event);
        }
      }

      //look at only lads and fads for now, include others later
      if (lads.length === 0 && fads.length === 0) {
        console.log(chalk.yellow("missing LAD and FAD for " + column.columnx));
        continue;
      }

      //some datatsets don't have event color even with event column (ex. calpionellids)
      const colour = dataset.event_colour;
      //which notes to use? (Jur, Cret, etc.)
      const popup = dataset.notes_Jur;
      let line = `${column.columnx}\tevent\t${column.width || ""}\t${colour || ""}\tnotitle\toff\t${popup !== null ? popup.replace(/[\r\n]+/g, " ") : ""}`;
      columnLines.push(line);

      //TODO trim "LAD", "FAD" from beginning of titles
      if (lads.length > 0) {
        columnLines.push("LAD");
        for (const lad of lads) {
          line = `\t${lad.eventx}\t${lad.age}\t${lad.event_display || ""}${lad.notes_2020 !== null ? `\t${lad.notes_2020?.replace(/[\r\n]+/g, " ")}` : ""}`;
          columnLines.push(line);
        }
      }
      if (fads.length > 0) {
        columnLines.push("FAD");
        for (const fad of fads) {
          line = `\t${fad.eventx}\t${fad.age}\t${fad.event_display || ""}${fad.notes_2020 !== null ? `\t${fad.notes_2020?.replace(/[\r\n]+/g, " ")}` : ""}`;
          columnLines.push(line);
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

async function processBlockColumns(
  datasets: arkL_datasets[],
  columns: arkL_columns[],
  intervals: arkL_intervals[],
  subdatasets: arkL_subdatasets[]
) {
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
      let regex = new RegExp(column.interval_type!, "i");
      //% in sql is wildcard, so match anything
      if (column.interval_type === "%") {
        regex = new RegExp(".*", "i");
      }
      let dbIntervals = [];
      if (column.colshare) {
        const subs = subdatasets.filter((subdataset) => subdataset.colshare === column.colshare).map((item) => item.id);
        dbIntervals = intervals
          .filter(
            (interval) =>
              interval.subdataset_id && subs.includes(interval.subdataset_id) && interval.interval_type?.match(regex)
          )
          .sort((a, b) => a.base_age2020! - b.base_age2020!);
      } else if (column.subdataset_id) {
        dbIntervals = intervals
          .filter(
            (interval) =>
              interval.dataset_id === column.dataset_id &&
              interval.interval_type?.match(regex) &&
              interval.subdataset_id === column.subdataset_id
          )
          .sort((a, b) => a.base_age2020! - b.base_age2020!);
      } else {
        dbIntervals = intervals
          .filter(
            (interval) =>
              interval.dataset_id === column.dataset_id &&
              interval.interval_type?.match(regex) &&
              interval.subdataset === ""
          )
          .sort((a, b) => a.base_age2020! - b.base_age2020!);
      }
      if (dbIntervals.length === 0) {
        console.log(chalk.yellow("no blocks found for " + column.columnx));
        continue;
      }
      const popup = dataset.notes_Jur;
      let line = `${column.columnx}\tblock\t${column.width || ""}\t${dataset.colour || ""}\tnotitle\toff\t${popup !== null ? popup.replace(/[\r\n]+/g, " ") : ""}`;
      columnLines.push(line);
      line = `\tTOP\t${dbIntervals[0]!.top_age === null ? 0 : dbIntervals[0]!.top_age}`;
      columnLines.push(line);
      for (const inter of dbIntervals) {
        //london database is missing data
        if (inter.base_age === null) continue;
        //if col_if_not_intvx is defined, it indicates the label that appears on TSC.
        //ex. block_label
        if (column.col_if_not_intvx !== "" && column.col_if_not_intvx !== null) {
          //ex. CN Zone name
          if (inter[column.col_if_not_intvx as keyof arkL_intervals] === null) {
            continue;
          }
          line = `\t${inter[column.col_if_not_intvx as keyof arkL_intervals]}\t${inter.base_age}\t\t${inter.interval_notes !== null ? inter.interval_notes.replace(/[\r\n]+/g, " ") : ""}\t${inter.colour || ""}`;
        } else
          line = `\t${inter.intervalx}\t${inter.base_age}\t\t${inter.interval_notes !== null ? inter.interval_notes.replace(/[\r\n]+/g, " ") : ""}\t${inter.colour || ""}`;
        columnLines.push(line);
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

      const regex = new RegExp(column.interval_type!, "i");
      const path = column.path || "";
      if (path === null || path === "") {
        console.log(chalk.yellow("missing path for " + column.columnx));
        continue;
      }

      chronIntervals = intervals
        .filter(
          (interval) =>
            interval.dataset_id === column.dataset_id &&
            interval.interval_type?.match(regex) &&
            (interval.subdataset === "" || interval.subdataset === null)
        )
        .sort((a, b) => a.base_age2020! - b.base_age2020!);
      if (chronIntervals.length === 0) {
        console.log(chalk.yellow("no chron intervals found for " + column.columnx));
        continue;
      }

      chronLabelIntervals = chronLabelColumn
        ? intervals
            .filter(
              (interval) =>
                interval.dataset_id === column.dataset_id &&
                interval.interval_type?.match(chronLabelColumn.interval_type!) &&
                interval.subdataset === "" &&
                interval[column.col_if_not_intvx as keyof arkL_intervals] !== null
            )
            .sort((a, b) => a.base_age2020! - b.base_age2020!)
        : [];
      if (chronLabelIntervals.length === 0 && chronLabelColumn) {
        console.log(chalk.yellow("no chron label intervals found for " + column.columnx));
        continue;
      }

      chronSeriesIntervals = chronSeriesColumn
        ? intervals
            .filter(
              (interval) =>
                interval.dataset_id === column.dataset_id &&
                interval.interval_type?.match(chronSeriesColumn.interval_type!) &&
                interval.subdataset === "" &&
                interval[column.col_if_not_intvx as keyof arkL_intervals] !== null
            )
            .sort((a, b) => a.base_age2020! - b.base_age2020!)
        : [];
      if (chronSeriesIntervals.length === 0 && chronSeriesColumn) {
        console.log(chalk.yellow("no chron series intervals found for " + column.columnx));
        continue;
      }

      const popup = dataset.notes_Jur;
      let line = `${column.columnx}\tchron\t${column.width || ""}\t${dataset.colour || ""}\tnotitle\toff\t${
        popup !== null ? popup.replace(/[\r\n]+/g, " ") : ""
      }`;
      columnLines.push(line);

      let topWritten = false;
      let prevSeries = "";

      for (const chronInter of chronIntervals) {
        // london database is missing data
        if (chronInter.base_age === null) continue;
        if (chronInter.polarity === null) continue;
        if (chronInter.intervalx === null) continue;

        const chronLabel = chronLabelIntervals.find(
          (inter) =>
            inter.top_age2020 != null &&
            inter.base_age2020 != null &&
            inter.base_age2020 >= chronInter.base_age2020! &&
            inter.top_age2020 <= chronInter.base_age2020!
        );
        if (!chronLabel) {
          console.log(
            chalk.yellow(`No chron label found for interval ${chronInter.intervalx} in column ${column.columnx}`)
          );
          continue;
        }
        const chronSeries = chronSeriesIntervals.find((inter) => {
          const interBase = inter.base_age != null ? inter.base_age : inter.base_age2020;
          const interTop = inter.top_age != null ? inter.top_age : inter.top_age2020;
          return (
            interTop != null &&
            interBase != null &&
            interBase >= chronInter.base_age2020! &&
            interTop <= chronInter.base_age2020!
          );
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
            columnLines.push(
              `\tTOP\t\t${chronIntervals[0]!.top_age2020 === null ? 0 : Number(chronIntervals[0]!.top_age2020.toFixed(3))}`
            );
            topWritten = true;
          }
        }

        const polarity = chronInter.polarity === "n" ? "N" : chronInter.polarity === "r" ? "R" : "U";

        // If top event and base event are the same, use chronInter.intervalx as label
        let label = "";
        if (
          chronInter.top_event &&
          chronInter.base_event &&
          chronInter.top_event
            .replace(/^top\s+/i, "")
            .replace(/^base\s+/i, "")
            .trim() ===
            chronInter.base_event
              .replace(/^top\s+/i, "")
              .replace(/^base\s+/i, "")
              .trim()
        ) {
          label = chronInter.has_added_abv === "yes" ? chronInter.intervalx.split(" ")[0]! : chronInter.intervalx;
        } else {
          label = chronLabel.has_added_abv === "yes" ? chronLabel.intervalx.split(" ")[0]! : chronLabel.intervalx;
        }

        // Remove any " (word continued)" at the end of the label, e.g. "C1r.2r (Matuyama continued)" -> "C1r.2r"
        let chronPopup = "";
        if (
          chronInter.preset_duration_notes !== null &&
          chronInter.preset_duration_notes !== undefined &&
          chronInter.preset_duration_notes !== ""
        ) {
          chronPopup = String(chronInter.preset_duration_notes).replace(/[\r\n]+/g, " ");
        } else {
          chronPopup = chronInter.intervalx.replace(/[\r\n]+/g, " ") || "";
          chronPopup = chronInter.has_added_abv
            ? chronPopup.split(" ")[0]!
            : chronPopup.replace(/\s*\([^)]+continued\)$/i, "");
        }

        line = `\t${polarity}\t${label}\t${Number(chronInter.base_age2020?.toFixed(3))}\t${chronPopup}`;
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

const organizeColumn = (entries: ProcessColumnOutput[], pathDict: StringDictSet, linesDict: StringDict) => {
  for (const entry of entries) {
    const { path, column, lines } = entry;
    const pathArray = customSplit(path);
    for (let i = 0; i < pathArray.length; i++) {
      const currentPath = pathArray[i]!;
      if (!currentPath) continue;
      if (!pathDict[currentPath]) {
        pathDict[currentPath] = new Set<string>();
      }
      if (i === pathArray.length - 1) {
        pathDict[currentPath]?.add(column);
        linesDict[currentPath] = [...(linesDict[currentPath] || []), ...lines];
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
    if (linesDict[path]) {
      lines = [...lines, ...(linesDict[path] || [])];
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

try {
  const { datasets, events, intervals, columns, subdatasets } = await loadJSONS();
  const filePath = join(outputDir, "group_organized_test_datapack.txt");
  const pathDict: StringDictSet = {}; // dictionary to stucture groups and their children
  const linesDict: StringDict = {}; // dictionary to link groups to their columns in the form of lines
  const eventColumns = await processEventColumns(datasets, columns, events);
  const blockColumns = await processBlockColumns(datasets, columns, intervals, subdatasets);
  const sequenceColumns = await processSequenceColumns(events, columns, datasets);
  const chronColumns = await processChronColumns(datasets, columns, intervals);
  const allColumns = [...eventColumns, ...blockColumns, ...sequenceColumns, ...chronColumns].sort(
    (a, b) => a.sort - b.sort
  );
  organizeColumn(allColumns, pathDict, linesDict);
  const lines = await linesFromDicts(pathDict, linesDict);
  await writeFile(filePath, lines.join("\n"));
  console.log(chalk.green("Processed columns"));
} catch (error) {
  console.error(chalk.red(`Failed to create test_datapack.txt: ${error}`));
}
