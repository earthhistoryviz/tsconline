import { arkL_datasets, arkL_events, arkL_intervals, assertarkL_datasetsArray, assertarkL_eventsArray, assertarkL_intervalsArray } from "./schema.js";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";

const outputDir = join("db", "london", "output");

async function loadJson() {
  const datasetsFilePath = join(outputDir, "arkL_datasets.json");
  const eventsFilePath = join(outputDir, "arkL_events.json");
  const intervalsFilePath = join(outputDir, "arkL_intervals.json");
  const datasets = JSON.parse(await readFile(datasetsFilePath, "utf8"));
  assertarkL_datasetsArray(datasets);
  const events = JSON.parse(await readFile(eventsFilePath, "utf8"));
  assertarkL_eventsArray(events);
  const intervals = JSON.parse(await readFile(intervalsFilePath, "utf8"));
  assertarkL_intervalsArray(intervals);
  return { datasets, events, intervals };
}

async function processZoneColumns(datasets: arkL_datasets[], events: arkL_events[], intervals: arkL_intervals[]) {
  const lines = [];
  for (const dataset of datasets) {
    if (dataset.main_interval_type === "zone") {
      const datasetEvents = events.filter(event => event.dataset_id === dataset.id && event.age).sort((a, b) => a.age! - b.age!);
      if (!datasetEvents.length || !datasetEvents[0] || !datasetEvents[0].id) continue;
      const topAge = intervals.find(interval => interval.base_id === datasetEvents[0]!.id);
      if (!topAge) {
        console.log(chalk.red(`No interval found for dataset ${dataset.dataset}`));
        continue;
      }
      let line = `${dataset.dataset}\tblock\t${dataset.width || ""}\t${dataset.colour || ""}\tnotitle`;
      lines.push(line);
      line = `\tTOP ${topAge.top_age}`;
      lines.push(line);
      datasetEvents.map(event => {
        line = `\t${event.eventx}\t${event.age}\t${event.event_display || ""}\t${event.notes_2020 || ""}`;
        lines.push(line);
      });
      lines.push("");
    }
  }
  return lines;
}

try { 
  const { datasets, events, intervals } = await loadJson();
  const lines = await processZoneColumns(datasets, events, intervals);
  const filePath = join(outputDir, "zone_columns.txt");
  await writeFile(filePath, lines.join("\n"));
  console.log(chalk.green("Processed zone columns"));
} catch (error) {
  console.error(chalk.red(`Failed to create zone_columns.txt: ${error}`));
}