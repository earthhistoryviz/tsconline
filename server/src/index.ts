import fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import process from "process";
import { execSync } from "child_process";
import { readFile } from "fs/promises";
import { loadPresets } from "./preset.js";
import { AssetConfig, assertAssetConfig } from "./types.js";
import { deleteDirectory } from "./util.js";
import * as routes from "./routes.js";
import { DatapackIndex, MapPackIndex, assertDatapackParsingPack, assertIndexResponse, assertMapPack } from "@tsconline/shared";
import { parseDatapacks } from "./parse-datapacks.js";
import { parseMapPacks } from "./parse-map-packs.js";
import fastifyCompress from "@fastify/compress";

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
const presets = await loadPresets();
// Load the current asset config:
export let assetconfigs: AssetConfig;
try {
  const contents = JSON.parse(
    (await readFile("assets/config.json")).toString()
  );
  assertAssetConfig(contents);
  assetconfigs = contents;
} catch (e) {
  console.log(
    "ERROR: Failed to load asset configs from assets/config.json.  Error was: ",
    e
  );
  process.exit(1);
}
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
  execSync(cmd)
  console.log("Finished decryption")
} catch (e) {
  console.log(
    "ERROR: Failed to decrypt activeDatapacks in AssetConfig with error: ",
    e
  );
  process.exit(1);
}

export let datapackIndex: DatapackIndex = {}
export let mapPackIndex: MapPackIndex = {}
try {
  console.log(`\nParsing datapacks: ${assetconfigs.activeDatapacks}\n`)
  for (const datapack of assetconfigs.activeDatapacks) {
    parseDatapacks(assetconfigs.decryptionDirectory, [datapack])
    .then(
      (datapackParsingPack) => {
        assertDatapackParsingPack(datapackParsingPack)
        datapackIndex[datapack] = datapackParsingPack
        console.log(`Successfully parsed ${datapack}`)
      })
    .catch((e) => {
      console.log(`Cannot create a datapackParsingPack with datapack ${datapack} and error: ${e}`)
    })
    parseMapPacks([datapack])
    .then((mapPack) => {
      assertMapPack(mapPack)
      mapPackIndex[datapack] = mapPack
    })
    .catch((e) => {
      console.log(`Cannot create a mapPack with datapack ${datapack} and error: ${e}`)
    })
  }
} catch (e) {
  console.log(
    "ERROR: Failed to parse datapacks of activeDatapacks in AssetConfig with error: ",
    e
  );
  process.exit(1);
}
// Serve the main app from /
// @ts-expect-error
// server.register doesn't accept the proper types. open bug-report asap to fastify
server.register(fastifyStatic, {
  root: process.cwd() + "/../app/dist",
  prefix: "/",
});

// Serve the generated charts, etc. from server/public/
// @ts-expect-error
// server.register doesn't accept the proper types. open bug-report asap to fastify
server.register(fastifyStatic, {
  root: process.cwd() + "/public",
  prefix: "/public/",
  decorateReply: false, // first registration above already added the decorator
});

// Helpful for testing locally:
// @ts-expect-error
// server.register doesn't accept the proper types. open bug-report asap to fastify
server.register(cors, {
  origin: "*",
  methods: ["GET", "POST"],
});

// @ts-expect-error
// server.register doesn't accept the proper types. open bug-report asap to fastify
server.register(fastifyCompress, {global: true})

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
  reply.send(presets);
});
// uploads datapack
server.post("/upload", () => {
  console.log("upload")
});

//fetches json object of requested settings file
server.get<{ Params: { settingFile: string } }>(
  "/settingsJson/:settingFile",
  routes.fetchSettingsJson
);

// handles chart columns and age ranges requests
server.post<{ Params: { files: string } }>(
  "/mapimages/:files",
  routes.refreshMapImages
);
server.get(
  "/datapackinfoindex",
  (request, reply) => {
    if (!datapackIndex || !mapPackIndex) {
      reply.send({error: "datapackIndex/mapPackIndex is null"})
    }
    else {
      const indexResponse = {datapackIndex, mapPackIndex}
      try {
      assertIndexResponse(indexResponse)
      reply.send(indexResponse)
      } catch(e) {
        reply.send({error: `${e}`})
      }
    }
  }
);

// checks chart.pdf-status
server.get<{ Params: { hash: string } }>(
  "/svgstatus/:hash",
  routes.fetchSVGStatus
);

// generates chart and sends to proper directory
// will return url chart path and hash that was generated for it
server.post<{ Params: { usecache: string, useSuggestedAge: string } }>(
  "/charts/:usecache/:useSuggestedAge",
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
