import { AutoPlotMarker, getMarkerTypeFromNum } from "@tsconline/shared";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { verifyFilepath } from "../util.js";

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
    if (split.length < 5 || split.some((item) => item === "")) {
      throw new Error("Invalid file format");
    }
    const age = parseFloat(split[0]!);
    const depth = parseFloat(split[1]!);
    const comment = split[2]!;
    // this tells us what type of column the marker is in, but not really needed atm
    // const colType = parseInt(split[3]!);
    const type = parseInt(split[4]!);
    if (isNaN(age) || isNaN(depth) || isNaN(type)) {
      throw new Error("Invalid file format");
    }

    markers.push({
      age,
      depth,
      comment,
      selected: false,
      type: getMarkerTypeFromNum(type),
      color: "#FF0000",
      id: `${age}-${depth}-${comment}-${type}`
    });
  }
  return markers;
};
