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
type ProcessColumnOutput = { path: string; column: string; lines: string[] };

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
          lines
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
          lines: columnLines
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
          lines: columnLines
        });
      }
    }
  }
  return blockColumns;
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

export async function generateAndWriteConfig(fileName: string) {
  const niceTitle = fileName.replace(/_/g, " ").replace(/\.txt$/i, "");
  const config = [
    {
      title: "UCL TSC Chron",
      description: "A test datapack created by a group",
      originalFileName: fileName,
      storedFileName: fileName,
      date: new Date().toISOString().split("T")[0],
      size: "1.00 MB",
      authoredBy: "Group Testers",
      references: [],
      tags: [],
      notes: "here 20",
      type: "official",
      isPublic: true,
      priority: 1,
      hasFiles: false
    }
  ];
  const configPath = join(outputDir, "london-config.json");
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  console.log()
}

export async function generateLondonDatapack(): Promise<File | undefined> {
  try {
    const { datasets, events, intervals, columns, subdatasets } = await loadJSONS();
    const date = new Date();
    const formattedDate = `${date.getDate().toString().padStart(2, "0")}${date.toLocaleString("en-US", { month: "short" })}${date.getFullYear()}`;
    const fileName = `UCL_TSC_Chronostrat_${formattedDate}.txt`;
    const filePath = join(outputDir, fileName);

    const pathDict: StringDictSet = {};
    const linesDict: StringDict = {};
    const eventColumns = await processEventColumns(datasets, columns, events);
    const blockColumns = await processBlockColumns(datasets, columns, intervals, subdatasets);
    const sequenceColumns = await processSequenceColumns(events, columns, datasets);
    organizeColumn([...eventColumns, ...blockColumns, ...sequenceColumns], pathDict, linesDict);
    const lines = await linesFromDicts(pathDict, linesDict);
    await writeFile(filePath, lines.join("\n"));
    await generateAndWriteConfig(fileName);

    // Read the file back and return as a File object (browser-compatible)
    const buffer = Buffer.from(lines.join("\n"), "utf8");
    // @ts-ignore
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
