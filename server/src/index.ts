import fastify, { FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import process from "process";
import { exec, ChildProcess } from "child_process";
import { readFile } from "fs/promises";
import { loadPresets } from "./preset.js";
import { AssetConfig, assertAssetConfig } from "./types.js";
import { deleteDirectory } from "./util.js";
import * as routes from "./routes.js";

const server = fastify({
  logger: false,
  bodyLimit: 1024 * 1024 * 100, // 10 mb
  /*{  // uncomment for detailed logs from fastify
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    }
  }*/
});

// Load up all the chart configs found in presets:
const chartconfigs = await loadPresets();
// Load the current asset config:
let assetconfigs: AssetConfig;
try {
  const contents = JSON.parse(
    (await readFile("assets/config.json")).toString()
  );
  assertAssetConfig(contents);
  assetconfigs = contents;
} catch (e: any) {
  console.log(
    "ERROR: Failed to load asset configs from assets/config.json.  Error was: ",
    e
  );
  process.exit(1);
}
// so routes.ts can handle this
export default assetconfigs;
// this try will run the decryption jar to decrypt all files in the datapack folder
try {
  const datapacks = assetconfigs.activeDatapacks.map(
    (datapack) => "\"" + assetconfigs.datapacksDirectory + "/" + datapack + "\""
  );
  const cmd =
    `java -jar ${assetconfigs.decryptionJar} ` +
    // Decrypting these datapacks:
    `-d ${datapacks.join(" ")} ` +
    // Tell it where to send the datapacks
    `-dest ${assetconfigs.decryptionDirectory} `;
  console.log("Calling Java decrypt.jar: ", cmd);
  exec(cmd, function (error, stdout, stderror) {
    console.log("Decryption finished");
    console.log("Decryption error param: " + error);
    console.log("Decryption stdout: " + stdout.toString());
    console.log("Decryption stderr: " + stderror.toString());
  });
} catch (e: any) {
  console.log(
    "ERROR: Failed to decrypt activeDatapacks in AssetConfig with error: ",
    e
  );
  process.exit(1);
}

// Serve the main app from /
// @ts-ignore
server.register(fastifyStatic, {
  root: process.cwd() + "/../app/dist",
  prefix: "/",
});

// Serve the generated charts, etc. from server/public/
// @ts-ignore
server.register(fastifyStatic, {
  root: process.cwd() + "/public",
  prefix: "/public/",
  decorateReply: false, // first registration above already added the decorator
});

// Helpful for testing locally:
// @ts-ignore
server.register(cors, {
  origin: "*",
  methods: ["GET", "POST"],
});

// removes the cached public/charts directory
server.post("/removecache", async (request, reply) => {
  try {
    const msg = deleteDirectory(assetconfigs.chartsDirectory);
    reply.send({ message: msg });
  } catch (error) {
    reply.send({
      error: `Error deleting directory ${assetconfigs.chartsDirectory} with error: ${error}`,
    });
  }
});

// Handle browser request for charts list:
// TODO: make this a websocket so we can try to report progress
// Note the "_" on the front of "request" tells TS that we aren't going to use it
server.get("/presets", async (_request, reply) => {
  reply.send(chartconfigs);
});

//fetches json object of requested settings file
server.get<{ Params: { settingFile: string } }>(
  "/settingsJson/:settingFile",
  routes.fetchSettingsJson
);

// handles chart columns and age ranges requests
server.get<{ Params: { files: string } }>(
  "/datapackinfo/:files",
  routes.fetchDatapackInfo
);

// checks chart.pdf-status
server.get<{ Params: { hash: string } }>(
  "/pdfstatus/:hash",
  routes.fetchPdfStatus
);

// generates chart and sends to proper directory
// will return url chart path and hash that was generated for it
server.post<{ Params: { usecache: string } }>(
  "/charts/:usecache",
  routes.fetchChart
);

// Start the server...
try {
  await server.listen({
    host: "0.0.0.0", // for this to work in Docker, you need 0.0.0.0
    port: +(process.env.port || 3000),
  });
  const address = server.server.address();
  console.log("Server listening on ", address);
} catch (err) {
  console.log("Server error: " + err);
  server.log.error(err);
  process.exit(1);
}
