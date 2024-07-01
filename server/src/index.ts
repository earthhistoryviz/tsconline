import fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import process from "process";
import { execSync } from "child_process";
import { deleteDirectory, checkFileExists, assetconfigs, loadAssetConfigs } from "./util.js";
import * as routes from "./routes.js";
import * as loginRoutes from "./login-routes.js";
import { DatapackIndex, MapPackIndex, assertIndexResponse } from "@tsconline/shared";
import fastifyCompress from "@fastify/compress";
import { loadFaciesPatterns, loadIndexes } from "./load-packs.js";
import { loadPresets } from "./preset.js";
import { Email } from "./types.js";
import fastifyMultipart from "@fastify/multipart";
import { checkFileMetadata, sunsetInterval } from "./file-metadata-handler.js";
import fastifySecureSession from "@fastify/secure-session";
import fastifyRateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { db, findIp, createIp, updateIp, initializeDatabase } from "./database.js";
import { sendEmail } from "./send-email.js";
import cron from "node-cron";
import path from "path";

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
await loadAssetConfigs();
// Check if the required JAR files exist
const activeJarPath = path.join(assetconfigs.activeJar);
const decryptionJarPath = path.join(assetconfigs.decryptionJar);

if (!(await checkFileExists(activeJarPath))) {
  console.error("ERROR: Required active JAR file does not exist:", activeJarPath);
  process.exit(1);
}
if (!(await checkFileExists(decryptionJarPath))) {
  console.error("ERROR: Required decryption JAR file does not exist:", decryptionJarPath);
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
  execSync(cmd, { stdio: "inherit" });
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

await server.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute",
  onExceeded: async (_request, key) => {
    const clientIp = key;
    const ip = (await findIp(clientIp))[0];
    if (!ip) {
      await createIp(clientIp);
    } else {
      await updateIp(clientIp, ip.count + 1);
    }
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

server.register(fastifyStatic, {
  root: path.join(process.cwd(), assetconfigs.datapackImagesDirectory),
  prefix: "/datapack-images/",
  decorateReply: false
});

// Serve user profile images
server.register(fastifyStatic, {
  root: path.join(process.cwd(), assetconfigs.uploadDirectory),
  prefix: "/profile-images/",
  allowedPath: (pathName, _root, req) => {
    const uuid = req.session.get("uuid");
    if (!uuid) {
      return false;
    }
    const uuidFolder = pathName.split("/")[1];
    return uuidFolder === uuid;
  },
  decorateReply: false
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

server.get("/facies-patterns", (_request, reply) => {
  if (!patterns || Object.keys(patterns).length === 0) {
    reply.status(500).send({ error: "Server isn't able to load facies patterns" });
  } else {
    reply.status(200).send({ patterns });
  }
});


const strictRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 1000 * 60
    }
  }
};

const moderateRateLimit = {
  config: {
    rateLimit: {
      max: 20,
      timeWindow: 1000 * 60
    }
  }
};
const looseRateLimit = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: 1000 * 60
    }
  }
};

server.get("/user-datapacks", moderateRateLimit, routes.fetchUserDatapacks);
// checks chart.pdf-status
server.get<{ Params: { hash: string } }>("/svgstatus/:hash", looseRateLimit, routes.fetchSVGStatus);

//fetches json object of requested settings file
server.get<{ Params: { file: string } }>("/settingsXml/:file", looseRateLimit, routes.fetchSettingsXml);
//download datapack
server.get<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>(
  "/download/user-datapacks/:filename",
  moderateRateLimit,
  routes.requestDownload
);
// uploads datapack
server.post("/upload", moderateRateLimit, routes.uploadDatapack);
server.post("/auth/oauth", strictRateLimit, loginRoutes.googleLogin);
server.post("/auth/login", strictRateLimit, loginRoutes.login);
server.post("/auth/signup", strictRateLimit, loginRoutes.signup);
server.post("/auth/session-check", moderateRateLimit, loginRoutes.sessionCheck);
server.post("/auth/logout", moderateRateLimit, async (request, reply) => {
  request.session.delete();
  reply.send({ message: "Logged out" });
});
server.post("/auth/verify", strictRateLimit, loginRoutes.verifyEmail);
server.post("/auth/resend", moderateRateLimit, loginRoutes.resendVerificationEmail);
server.post("/auth/send-forgot-password-email", strictRateLimit, loginRoutes.sendForgotPasswordEmail);
server.post("/auth/forgot-password", strictRateLimit, loginRoutes.forgotPassword);
server.post("/auth/change-email", strictRateLimit, loginRoutes.changeEmail);
server.post("/auth/change-username", moderateRateLimit, loginRoutes.changeUsername);
server.post("/auth/change-password", strictRateLimit, loginRoutes.changePassword);
server.post("/auth/account-recovery", strictRateLimit, loginRoutes.accountRecovery);
server.post("/auth/delete-profile", moderateRateLimit, loginRoutes.deleteProfile);
server.post("/upload-profile-picture", moderateRateLimit, loginRoutes.uploadProfilePicture);

// generates chart and sends to proper directory
// will return url chart path and hash that was generated for it
server.post<{ Params: { usecache: string; useSuggestedAge: string; username: string } }>(
  "/charts/:usecache/:useSuggestedAge/:username",
  looseRateLimit,
  routes.fetchChart
);

// Serve timescale data endpoint
server.get("/timescale", looseRateLimit, routes.fetchTimescale);

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
dotenv.config();
if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.NODE_ENV === "production") {
  const emailUser = process.env.EMAIL_USER as string;
  cron.schedule(
    "0 0 * * 0", // every Sunday at midnight
    async () => {
      try {
        const allIps = await db.selectFrom("ip").selectAll().execute();
        if (allIps.length === 0) return;
        const ipMessages = allIps
          .map((ip) => `IP: ${ip.ip}, Count: ${ip.count}`)
          .join("<br>")
          .trim();
        const notificationEmail: Email = {
          from: emailUser,
          to: emailUser,
          subject: "Timescale Creator IP Notification",
          preHeader: "Timescale Creator IP Notification",
          title: "Timescale Creator IP Notification",
          message: `The following IPs have been rate limited:<br>${ipMessages}`,
          action: "Ip Notification"
        };
        await sendEmail(notificationEmail);
        await db.deleteFrom("ip").execute();
      } catch (e) {
        console.error("Error sending email: ", e);
      }
    }
  );
}

server.setNotFoundHandler((request, reply) => {
  void reply.sendFile("index.html");
});

//Start the server...
try {
  await initializeDatabase();
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
