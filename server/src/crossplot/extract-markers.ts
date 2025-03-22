import { AutoPlotMarker, getMarkerTypeFromNum } from "@tsconline/shared";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { verifyFilepath } from "../util";

export const getMarkersFromTextFile = async function getMarkersFromTextFile(
  filepath: string
): Promise<AutoPlotMarker[]> {
  if (!(await verifyFilepath(filepath))) {
    throw new Error("File does not exist");
  }
  const fileStream = createReadStream(filepath);
  fileStream.setEncoding("utf-8");
  fileStream.on("error", (err) => {
    throw new Error("Error reading file: " + err);
  });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let firstLine = true;
  const markers: AutoPlotMarker[] = [];
  for await (const line of rl) {
    if (firstLine) {
      firstLine = false;
      continue;
    }
    const split = line.split("\t");
    if (split.length < 7 || split.some((item) => item === "")) {
      throw new Error("Invalid file format");
    }
    const x = parseFloat(split[0]!);
    const y = parseFloat(split[1]!);
    const age = parseFloat(split[2]!);
    const depth = parseFloat(split[3]!);
    const comment = split[4]!;
    // this tells us what type of column the marker is in, but not really needed atm
    // const colType = parseInt(split[5]!);
    const type = parseInt(split[6]!);

    markers.push({
      x,
      y,
      age,
      depth,
      comment,
      selected: false,
      type: getMarkerTypeFromNum(type),
      color: "#FF0000",
      id: `${x}-${y}-${age}-${depth}-${comment}-${type}`
    });
  }
  return markers;
};
