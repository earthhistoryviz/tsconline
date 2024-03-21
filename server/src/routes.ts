import type { FastifyRequest, FastifyReply } from "fastify";
import { exec } from "child_process";
import { writeFile, stat, readFile } from "fs/promises";
import { TimescaleItem, assertChartRequest } from "@tsconline/shared";
import { deleteDirectory } from "./util.js";
import { mkdirp } from "mkdirp";
import md5 from "md5";
import { assetconfigs } from "./index.js";
import svgson from "svgson";
import fs from "fs";
import { assertTimescale } from "@tsconline/shared";
import { parseExcelFile } from "./parse-excel-file.js";

export const fetchSettingsXml = async function fetchSettingsJson(
  request: FastifyRequest<{ Params: { settingFile: string } }>,
  reply: FastifyReply
) {
  try {
    const { settingFile } = request.params;
    //TODO: differentiate between preset and user uploaded datpack
    const settingsXml = (await readFile(`${decodeURIComponent(settingFile)}`)).toString();
    reply.send(settingsXml);
  } catch (e) {
    reply.send({ error: e });
  }
};

/**
 * Will attempt to read pdf and return whether it can or not
 * Runs with await
 * TODO: ADD ASSERTS
 */
export const fetchSVGStatus = async function (
  request: FastifyRequest<{ Params: { hash: string } }>,
  reply: FastifyReply
) {
  const { hash } = request.params;
  let isSVGReady = false;
  const directory = `${assetconfigs.chartsDirectory}/${hash}`;
  const filepath = `${directory}/chart.svg`;
  // if hash doesn't exist reply with error
  if (!fs.existsSync(directory)) {
    reply.send({ error: `No directory exists at hash: ${directory}` });
    return;
  }
  try {
    if (fs.existsSync(filepath)) {
      if (svgson.parseSync((await readFile(filepath)).toString())) isSVGReady = true;
    }
  } catch (e) {
    console.log("can't read svg at hash: ", hash);
  }

  console.log("reply: ", { ready: isSVGReady });
  reply.send({ ready: isSVGReady });
};

/**
 * Will fetch a chart with or without the cache
 * Will return the chart path and the hash the chart was saved with
 */
export const fetchChart = async function fetchChart(
  request: FastifyRequest<{
    Params: { usecache: string; useSuggestedAge: string };
  }>,
  reply: FastifyReply
) {
  //TODO change this to be in request body
  const usecache = request.params.usecache === "true";
  const useSuggestedAge = request.params.useSuggestedAge === "true";
  let chartrequest;
  try {
    chartrequest = JSON.parse(request.body as string);
    assertChartRequest(chartrequest);
  } catch (e) {
    console.log("ERROR: chart request is not valid.  Request was: ", chartrequest, ".  Error was: ", e);
    reply.send({
      error: "ERROR: chart request is not valid.  Error was: " + e
    });
    return;
  }
  const settingsXml = chartrequest.settings;
  //console.log(settingsXml);
  // const settingsXml = jsonToXml(
  //   chartrequest.settings,
  //   chartrequest.columnSettings
  // );
  // Compute the paths: chart directory, chart file, settings file, and URL equivalent for chart
  const hash = md5(settingsXml + chartrequest.datapacks.join(","));
  const chartDirUrlPath = `/${assetconfigs.chartsDirectory}/${hash}`;
  const chartUrlPath = chartDirUrlPath + "/chart.svg";

  const chartDirFilePath = chartDirUrlPath.slice(1); // no leading slash
  const chartFilePath = chartUrlPath.slice(1);
  const settingsFilePath = chartDirFilePath + "/settings.tsc";

  // If this setting already has a chart, just return that
  try {
    await stat(chartFilePath);
    if (!usecache) {
      console.log("Deleting chart filepath since it already exists and cache is not being used");
      deleteDirectory(chartFilePath);
    } else {
      console.log("Request for chart that already exists (hash:", hash, ".  Returning cached version");
      reply.send({ chartpath: chartUrlPath, hash: hash }); // send the browser back the URL equivalent...
      return;
    }
  } catch (e) {
    // Doesn't exist, so make one
    console.log("Request for chart", chartUrlPath, ": chart does not exist, creating...");
  }

  // Create the directory and save the settings there for java:
  try {
    await mkdirp(chartDirFilePath);
    await writeFile(settingsFilePath, settingsXml);
    console.log("Successfully created and saved chart settings at", settingsFilePath);
  } catch (e) {
    console.log("ERROR: failed to save settings at", settingsFilePath, "  Error was:", e);
    reply.send({ error: "ERROR: failed to save settings" });
    return;
  }
  const datapacks = chartrequest.datapacks.map(
    (datapack) => '"' + assetconfigs.datapacksDirectory + "/" + datapack + '"'
  );
  for (const datapack of chartrequest.datapacks) {
    if (!assetconfigs.activeDatapacks.includes(datapack)) {
      console.log("ERROR: datapack: ", datapack, " is not included in activeDatapacks");
      console.log("assetconfig.activeDatapacks:", assetconfigs.activeDatapacks);
      console.log("chartrequest.datapacks: ", chartrequest.datapacks);
      reply.send({ error: "ERROR: failed to load datapacks" });
      return;
    }
  }
  // Call the Java monster...
  //const jarArgs: string[] = ['xvfb-run', '-jar', './jar/TSC.jar', '-node', '-s', `../files/${title}settings.tsc`, '-ss', `../files/${title}settings.tsc`, '-d', `../files/${title}datapack.txt`, '-o', `../files/${title}save.pdf`];
  //const jarArgs: string[] = ['-jar', './jar/TSC.jar', '-d', `./files/${title}datapack.txt`, '-s', `./files/${title}settings.tsc`];
  // extractedNames.forEach(path => {
  //   // Since we've filtered out null values, 'path' is guaranteed to be a string here
  //   const fullPath = `../assets/decrypted/${name}/datapacks`;
  //   const datapackInfo = parseDefaultAges(fullPath);
  //   console.log(datapackInfo);
  // });
  const cmd =
    `java -Xmx512m -XX:MaxDirectMemorySize=64m -XX:MaxRAM=1g -jar ${assetconfigs.activeJar} ` +
    // Turns off GUI (e.g Suggested Age pop-up (defaults to yes if -a flag is not passed))
    `-node ` +
    // Add settings:
    `-s ${settingsFilePath} -ss ${settingsFilePath} ` +
    // Add datapacks:
    `-d ${datapacks.join(" ")} ` +
    // Tell it where to save chart
    `-o ${chartFilePath} ` +
    // Don't use datapacks suggested age (if useSuggestedAge is true then ignore datapack ages)
    `${!useSuggestedAge ? "-a" : ""}`;

  // Exec Java command and send final reply to browser
  await new Promise<void>((resolve) => {
    console.log("Calling Java: ", cmd);
    exec(cmd, function (error, stdout, stderror) {
      console.log("Java finished, sending reply to browser");
      console.log("Java error param: " + error);
      console.log("Java stdout: " + stdout.toString());
      console.log("Java stderr: " + stderror.toString());
      resolve();
    });
  });
  console.log("Sending reply to browser: ", {
    chartpath: chartUrlPath,
    hash: hash
  });
  reply.send({ chartpath: chartUrlPath, hash: hash });
};

// Serve timescale data endpoint
export const fetchTimescale = async function (_request: FastifyRequest, reply: FastifyReply) {
  try {
    const filePath = assetconfigs.timescaleFilepath;

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error("Error: Excel file not found");
      reply.status(404).send({ error: "Excel file not found" });
      return;
    }

    const excelData: string[][] = await parseExcelFile(filePath);
    const timescaleData: TimescaleItem[] = excelData
      .map(([, , stage, ma]) => ({
        key: stage as string,
        value: parseFloat(ma as string)
      }))
      .filter((item) => item.key);
    timescaleData.forEach((data) => assertTimescale(data));

    reply.send({ timescaleData });
  } catch (error) {
    console.error("Error reading Excel file:", error);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};
