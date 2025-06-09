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

async function processEventColumns(datasets: arkL_datasets[], columns: arkL_columns[], events: arkL_events[]) {
  const lines = [];
  for (const column of columns) {
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
        console.log("missing LAD and FAD for " + column.columnx);
        continue;
      }

      //some datatsets don't have event color even with event column (ex. calpionellids)
      const colour = dataset.event_colour;
      //which notes to use? (Jur, Cret, etc.)
      const popup = dataset.notes_Jur;
      let line = `${column.columnx}\tevent\t${column.width || ""}\t${colour || ""}\tnotitle\toff\t${popup !== undefined && popup !== null ? popup.replace(/[\r\n]+/g, " ") : ""}`;
      lines.push(line);

      //TODO trim "LAD", "FAD" from beginning of titles
      if (lads.length > 0) {
        lines.push("LAD");
        for (const lad of lads) {
          line = `\t${lad.eventx}\t${lad.age}\t${lad.event_display || ""}${lad.notes_2020 !== null ? `\t${lad.notes_2020?.replace(/[\r\n]+/g, " ")}` : ""}`;
          lines.push(line);
        }
      }
      if (fads.length > 0) {
        lines.push("FAD");
        for (const fad of fads) {
          line = `\t${fad.eventx}\t${fad.age}\t${fad.event_display || ""}${fad.notes_2020 !== null ? `\t${fad.notes_2020?.replace(/[\r\n]+/g, " ")}` : ""}`;
          lines.push(line);
        }
      }
      //for blank space between columns for tscreator to parse
      lines.push("");
    }
  }
  return lines;
}

async function processBlockColumns(
  datasets: arkL_datasets[],
  columns: arkL_columns[],
  intervals: arkL_intervals[],
  subdatasets: arkL_subdatasets[]
) {
  const lines = [];
  for (const column of columns) {
    if (
      column.column_type?.includes("interval") &&
      !column.interval_type?.includes("sequence") &&
      !column.interval_type?.includes("chron")
    ) {
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
        console.log("no blocks found for " + column.columnx);
        continue;
      }
      let line = `${column.columnx}\tblock`;
      lines.push(line);
      line = `\tTOP\t${dbIntervals[0]!.top_age === null ? 0 : dbIntervals[0]!.top_age}`;
      lines.push(line);
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
          line = `\t${inter[column.col_if_not_intvx as keyof arkL_intervals]}\t${inter.base_age}\t`;
        } else line = `\t${inter.intervalx}\t${inter.base_age}\t`;
        lines.push(line);
      }
      lines.push("");
    }
  }
  return lines;
}

try {
  const { datasets, events, intervals, columns, subdatasets } = await loadJSONS();
  const filePath = join(outputDir, "test_datapack.txt");
  const eventLines = await processEventColumns(datasets, columns, events);
  const blockLines = await processBlockColumns(datasets, columns, intervals, subdatasets);
  await writeFile(filePath, eventLines.concat(blockLines).join("\n"));
  console.log(chalk.green("Processed columns"));
} catch (error) {
  console.error(chalk.red(`Failed to create test_datapack.txt: ${error}`));
}
