import fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import process from "process";
import { execSync } from "child_process";
import { deleteDirectory } from "./util.js";
import * as routes from "./routes.js";
import * as loginRoutes from "./login-routes.js";
import { DatapackIndex, MapPackIndex, assertIndexResponse } from "@tsconline/shared";
import fastifyCompress from "@fastify/compress";
import { loadFaciesPatterns, loadIndexes } from "./load-packs.js";
import { loadPresets } from "./preset.js";
import { AssetConfig, assertAssetConfig } from "./types.js";
import { readFile } from "fs/promises";
import fastifyMultipart from "@fastify/multipart";
import { checkFileMetadata, sunsetInterval } from "./file-metadata-handler.js";
import fastifySecureSession from "@fastify/secure-session";
import dotenv from "dotenv";
import { db } from "./database.js";

const server = fastify({
  logger: false,
  bodyLimit: 1024 * 1024 * 100 // 10 mb
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
  const contents = JSON.parse((await readFile("assets/config.json")).toString());
  assertAssetConfig(contents);
  assetconfigs = contents;
} catch (e) {
  console.log("ERROR: Failed to load asset configs from assets/config.json.  Error was: ", e);
  process.exit(1);
}
// this try will run the decryption jar to decrypt all files in the datapack folder
try {
  const datapacks = assetconfigs.activeDatapacks.map(
    (datapack) => '"' + assetconfigs.datapacksDirectory + "/" + datapack + '"'
  );
  const cmd =
    `java -jar ${assetconfigs.decryptionJar} ` +
    // Decrypting these datapacks:
    `-d ${datapacks.join(" ")} ` +
    // Tell it where to send the datapacks
    `-dest ${assetconfigs.decryptionDirectory} `;
  console.log("Calling Java decrypt.jar: ", cmd);
  execSync(cmd);
  console.log("Finished decryption");
} catch (e) {
  console.log("ERROR: Failed to decrypt activeDatapacks in AssetConfig with error: ", e);
  process.exit(1);
}

export const datapackIndex: DatapackIndex = {};
export const mapPackIndex: MapPackIndex = {};
const patterns = await loadFaciesPatterns();
await loadIndexes(datapackIndex, mapPackIndex, assetconfigs.decryptionDirectory, assetconfigs.activeDatapacks);

declare module "@fastify/secure-session" {
  interface SessionData {
    uuid: string;
  }
}
dotenv.config();
const sessionKey = process.env.SESSION_KEY
  ? Buffer.from(process.env.SESSION_KEY, "hex")
  : Buffer.from("d30a7eae1e37a08d6d5c65ac91dfbc75b54ce34dd29153439979364046cc06ae", "hex");
server.register(fastifySecureSession, {
  cookieName: "loginSession",
  key: sessionKey,
  cookie: {
    path: "/",
    httpOnly: true,
    domain: process.env.NODE_ENV === "production" ? "dev.timescalecreator.org" : "localhost",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
});

server.register(fastifyMultipart, {
  limits: {
    fieldNameSize: 100,
    fileSize: 1024 * 1024 * 60 // 60 mb
  }
});

// Serve the main app from /
server.register(fastifyStatic, {
  root: process.cwd() + "/../app/dist",
  prefix: "/"
});

// Serve the generated charts, etc. from server/public/
server.register(fastifyStatic, {
  root: process.cwd() + "/public",
  prefix: "/public/",
  decorateReply: false // first registration above already added the decorator
});

// Helpful for testing locally:
server.register(cors, {
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
});

server.register(fastifyCompress, { global: true });

// removes the cached public/cts directory
server.post("/removecache", async (request, reply) => {
  try {
    const msg = deleteDirectory(assetconfigs.chartsDirectory);
    reply.send({ message: msg });
  } catch (error) {
    reply.send({
      error: `Error deleting directory ${assetconfigs.chartsDirectory} with error: ${error}`
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
server.post<{ Params: { username: string } }>("/upload/:username", routes.uploadDatapack);

//fetches json object of requested settings file
server.get<{ Params: { file: string } }>("/settingsXml/:file", routes.fetchSettingsXml);

server.get("/datapack-index", routes.fetchServerDatapackInfo);
server.get("/map-pack-index", routes.fetchServerMapPackInfo);

server.get("/datapackinfoindex", (_request, reply) => {
  if (!datapackIndex || !mapPackIndex) {
    reply.send({ error: "datapackIndex/mapPackIndex is null" });
  } else {
    const indexResponse = { datapackIndex, mapPackIndex };
    try {
      assertIndexResponse(indexResponse);
      reply.send(indexResponse);
    } catch (e) {
      reply.send({ error: `${e}` });
    }
  }
});

// checks chart.pdf-status
server.get<{ Params: { hash: string } }>("/svgstatus/:hash", routes.fetchSVGStatus);

server.get("/facies-patterns", (_request, reply) => {
  if (!patterns || Object.keys(patterns).length === 0) {
    reply.status(500).send({ error: "Server isn't able to load facies patterns" });
  } else {
    reply.status(200).send({ patterns });
  }
});

server.get("/user-datapacks", routes.fetchUserDatapacks);

server.post("/auth/oauth", loginRoutes.googleLogin);

server.post("/auth/login", loginRoutes.login);

server.post("/auth/signup", loginRoutes.signup);

server.post("/auth/session-check", loginRoutes.sessionCheck);

server.post("/auth/logout", async (request, reply) => {
  request.session.delete();
  reply.send({ message: "Logged out" });
});

server.post("/auth/verify", loginRoutes.verifyEmail);

server.post("/auth/resend", loginRoutes.resendVerificationEmail);

server.post("/auth/send-resetpassword-email", loginRoutes.sendResetPasswordEmail);

server.post("/auth/reset-password", loginRoutes.resetPassword);

server.post("/auth/reset-email", loginRoutes.resetEmail);

server.post("/auth/account-recovery", loginRoutes.accountRecovery);

// generates chart and sends to proper directory
// will return url chart path and hash that was generated for it
server.post<{ Params: { usecache: string; useSuggestedAge: string; username: string } }>(
  "/charts/:usecache/:useSuggestedAge/:username",
  routes.fetchChart
);

// Serve timescale data endpoint
server.get("/timescale", routes.fetchTimescale);

server.get<{ Params: { datapackName: string; imageName: string } }>(
  "/images/:datapackName/:imageName",
  routes.fetchImage
);

setInterval(() => {
  checkFileMetadata(assetconfigs.fileMetadata);
}, sunsetInterval);
setInterval(
  () => {
    db.deleteFrom("verification").where("expiresAt", "<", new Date().toISOString()).execute();
  },
  1000 * 60 * 60 * 24 * 7
); // 1 week
// Start the server...
try {
  await server.listen({
    host: "0.0.0.0", // for this to work in Docker, you need 0.0.0.0
    port: +(process.env.port || 3000)
  });
  const address = server.server.address();
  console.log("Server listening on ", address);
} catch (err) {
  console.log("Server error: " + err);
  server.log.error(err);
  process.exit(1);
}
