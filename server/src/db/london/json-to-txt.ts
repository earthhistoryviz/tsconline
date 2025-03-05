import { arkL_datasets, arkL_events } from "./schema";

async function processZoneColumns(datasets: arkL_datasets[], events: arkL_events[]) {
  const lines = [];
  for (const dataset of datasets) {
    if (dataset.main_interval_type === "zone") {
      let line = `${dataset.dataset}\tblock\t${dataset.width || ""}\t${dataset.colour || ""}\tnotitle`;
      lines.push(line);
      line = "\tTOP 66.04";
      lines.push(line);
      for (const event of events) {
        if (event.dataset === dataset.dataset) {
          line = `\t${event.eventx}\t${event.age}\t${event.event_display || ""}\t${event.notes_2020 || ""}`;
          lines.push(line);
        }
      }
    }
  }
}