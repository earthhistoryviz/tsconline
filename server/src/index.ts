import fastify, { FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import process from "process";
import { deleteDirectory, checkFileExists, assetconfigs, loadAssetConfigs } from "./util.js";
import * as routes from "./routes/routes.js";
import * as loginRoutes from "./routes/login-routes.js";
import fastifyCompress from "@fastify/compress";
import { collectDefaultMetrics, Gauge, Counter, register } from "prom-client";
import { loadFaciesPatterns } from "./load-packs.js";
import { loadPresets } from "./preset.js";
import { CommentsEmail, Email, User } from "./types.js";
import fastifyMultipart from "@fastify/multipart";
import { checkFileMetadata, sunsetInterval } from "./file-metadata-handler.js";
import fastifySecureSession from "@fastify/secure-session";
import fastifyRateLimit from "@fastify/rate-limit";
import "dotenv/config";
import { db, findIp, createIp, updateIp, initializeDatabase, findRecentDatapackComments } from "./database.js";
import { sendCommentsEmail, sendEmail } from "./send-email.js";
import cron from "node-cron";
import path from "path";
import { adminRoutes } from "./admin/admin-auth.js";
import PQueue from "p-queue";
import { userRoutes } from "./routes/user-auth.js";
import { fetchWorkshopCoverImage } from "./workshop/workshop-routes.js";
import { uploadExternalDatapack } from "./routes/user-routes.js";
import logger from "./error-logger.js";
import { workshopRoutes } from "./workshop/workshop-auth.js";
import { fetchAllWorkshops } from "./workshop/workshop-routes.js";
import { adminFetchPrivateOfficialDatapacksMetadata } from "./admin/admin-routes.js";
import { crossPlotRoutes } from "./crossplot/crossplot-auth.js";
import { deleteAllUserDatapacks } from "./user/user-handler.js";
import { fetchMarkdownFiles } from "./help/help-routes.js";
import { CommentType, assertCommentType } from "@tsconline/shared";
import fastifyWebsocket from "@fastify/websocket";
import { MAX_CONCURRENCY_SIZE } from "./constants.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}
const server = fastify({
  logger: false,
  trustProxy: true,
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
// predefine "user" property on request to stabilize object shape for JS engine optimizations (per Fastify docs)
server.decorateRequest("user", undefined);

collectDefaultMetrics();
const httpMetricsLabelNames = ["method", "path", "status"];
const totalHttpRequestCount = new Counter({
  name: "nodejs_http_total_count",
  help: "total request number",
  labelNames: httpMetricsLabelNames
});
const totalHttpRequestDuration = new Gauge({
  name: "nodejs_http_total_duration",
  help: "the last duration or response time of last request",
  labelNames: httpMetricsLabelNames
});
const activeUsers = new Gauge({
  name: "nodejs_active_users",
  help: "number of active users"
});

const ipSet = new Set<string>();
server.addHook("onRequest", async (request: FastifyRequest & { startTime?: [number, number] }) => {
  request.startTime = process.hrtime();
  const ip = request.ip;
  if (!ipSet.has(ip)) {
    ipSet.add(ip);
    setTimeout(
      () => {
        ipSet.delete(ip);
        activeUsers.set(ipSet.size);
      },
      15 * 60 * 1000
    );
  }
  activeUsers.set(ipSet.size);
});

// hook to track http request metrics
// calculates request duration and increments the request count
server.addHook("onResponse", async (request: FastifyRequest & { startTime?: [number, number] }, reply) => {
  const duration = process.hrtime(request.startTime);
  const durationInMs = duration[0] * 1000 + duration[1] / 1e6;
  // get route path if available for metrics, otherwise use "unknown"
  const routePath = request.routeOptions?.url || "unknown";
  totalHttpRequestCount.labels(request.method, routePath, reply.statusCode.toString()).inc();
  totalHttpRequestDuration.labels(request.method, routePath, reply.statusCode.toString()).set(durationInMs);
});

// Expose the metrics endpoint
server.get("/metrics", async (request, reply) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token !== process.env.METRICS_AUTH) {
    reply.code(403).send({ error: "Forbidden" });
    return;
  }
  try {
    const metrics = await register.metrics();
    reply.header("Content-Type", register.contentType).send(metrics);
  } catch (e) {
    console.error("Error loading configs: ", e);
    reply.status(500).send(e);
  }
});

// Load up all the chart configs found in presets:
const presets = await loadPresets();
try {
  // Load the current asset config:
  await loadAssetConfigs();
} catch (e) {
  console.error("Error loading configs: ", e);
  process.exit(1);
}
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
const patterns = await loadFaciesPatterns();

declare module "@fastify/secure-session" {
  interface SessionData {
    uuid: string;
  }
}
const sessionKey = process.env.SESSION_KEY
  ? Buffer.from(process.env.SESSION_KEY, "hex")
  : Buffer.from("d30a7eae1e37a08d6d5c65ac91dfbc75b54ce34dd29153439979364046cc06ae", "hex");
server.register(fastifySecureSession, {
  cookieName: "loginSession",
  key: sessionKey,
  cookie: {
    path: "/",
    httpOnly: true,
    domain: process.env.DOMAIN ?? "localhost",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
});

await server.register(fastifyRateLimit, {
  global: true,
  max: 500,
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
  methods: ["GET", "POST", "DELETE", "PATCH"],
  credentials: true
});

server.register(fastifyCompress, { global: false, threshold: 1024 * 20 });

await server.register(fastifyWebsocket);

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

server.get("/official/datapack/:name", routes.fetchPublicOfficialDatapack);
server.get("/public/metadata", routes.fetchPublicDatapacksMetadata);

server.get("/facies-patterns", (_request, reply) => {
  if (!patterns || Object.keys(patterns).length === 0) {
    reply.status(500).send({ error: "Server isn't able to load facies patterns" });
  } else {
    reply.status(200).send({ patterns });
  }
});

const isTestEnv = process.env.NODE_ENV === "test";
const rateLimitConfig = (max: number) => ({
  config: {
    rateLimit: {
      max: isTestEnv ? 100000 : max,
      timeWindow: 1000 * 60 * (isTestEnv ? 60 : 1)
    }
  }
});

const strictRateLimit = rateLimitConfig(10);
const moderateRateLimit = rateLimitConfig(20);
const looseRateLimit = rateLimitConfig(30);

//fetches json object of requested settings file
server.get<{ Params: { file: string } }>("/settingsXml/:file", looseRateLimit, routes.fetchSettingsXml);

server.get<{ Params: { title: string; uuid: string; img: string } }>(
  "/map-image/:title/:uuid/:img",
  moderateRateLimit,
  routes.fetchMapImages
);

server.get<{ Params: { title: string; uuid: string } }>(
  "/datapack-images/:title/:uuid",
  {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: 1000 * 30
      }
    }
  },
  routes.fetchDatapackCoverImage
);

server.get<{ Params: { workshopId: number } }>(
  "/workshop-images/:workshopId",
  {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: 1000 * 30
      }
    }
  },
  fetchWorkshopCoverImage
);

server.post("/bug-report", strictRateLimit, routes.submitBugReport);

server.register(adminRoutes, { prefix: "/admin" });
server.register(crossPlotRoutes, { prefix: "/crossplot" });
// these are seperate from the admin routes because they don't require recaptcha
server.get("/admin/official/private/metadata", looseRateLimit, adminFetchPrivateOfficialDatapacksMetadata);

server.register(workshopRoutes, { prefix: "/workshop" });
// these are seperate from the workshop routes because they don't require recaptcha
server.get("/workshop", looseRateLimit, fetchAllWorkshops);

server.register(userRoutes, { prefix: "/user" });
// these are seperate from the user routes because they don't require recaptcha
server.post("/auth/oauth", strictRateLimit, loginRoutes.googleLogin);
server.post("/auth/login", strictRateLimit, loginRoutes.login);
server.post("/auth/signup", strictRateLimit, loginRoutes.signup);
server.post("/auth/session-check", strictRateLimit, loginRoutes.sessionCheck);
server.post("/auth/logout", moderateRateLimit, loginRoutes.logout);
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
server.post("/external-chart", moderateRateLimit, uploadExternalDatapack);
server.get("/markdown-tree", moderateRateLimit, fetchMarkdownFiles);

// generates chart and sends to proper directory
// will return url chart path and hash that was generated for it
server.get("/chart", { websocket: true }, routes.handleChartGeneration);

// Serve timescale data endpoint
server.get("/timescale", looseRateLimit, routes.fetchTimescale);

server.post(
  "/images",
  {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: 1000 * 60
      }
    },
    schema: {
      body: {
        type: "object",
        properties: {
          datapackTitle: { type: "string" },
          datapackFilename: { type: "string" },
          uuid: { type: "string" },
          imageName: { type: "string" },
          isPublic: { type: "boolean" }
        },
        required: ["datapackTitle", "imageName", "datapackFilename", "isPublic", "uuid"]
      }
    }
  },
  routes.fetchImage
);
setInterval(async () => {
  await checkFileMetadata(assetconfigs.fileMetadata)
    .catch((e) => {
      console.error("Error checking file metadata: ", e);
    })
    .finally(() => console.log("Successfully checked file metadata"));
}, sunsetInterval);
// delete all temp datapacks after one day
setInterval(
  async () => {
    try {
      await deleteAllUserDatapacks("temp");
    } catch (e) {
      logger.error("Error deleting verification: ", e);
    }
  },
  1000 * 60 * 60 * 24
); // 1 day
setInterval(
  () => {
    try {
      db.deleteFrom("verification").where("expiresAt", "<", new Date().toISOString()).execute();
    } catch (e) {
      logger.error("Error deleting verification: ", e);
    }
  },
  1000 * 60 * 60 * 24 * 7
); // 1 week
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
        logger.error("Error sending email: ", e);
      }
    }
  );
  // schedule for daily comments email
  cron.schedule(
    "0 5 * * *", // every day at 5 AM server time
    async () => {
      try {
        const datapackComments = await findRecentDatapackComments();
        const newDatapackComments: CommentType[] = [];
        for (const com of datapackComments) {
          assertCommentType(com);
          newDatapackComments.push(com);
        }
        // only send email if there are new comments
        if (newDatapackComments.length) {
          const today = new Date();
          const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
          const recipients = process.env.DAILY_COMMENTS_EMAIL_RECIPIENTS?.split(",").map((email) => email.trim()) || [];
          for (const recipient of recipients) {
            const newEmail: CommentsEmail = {
              from: process.env.EMAIL_USER as string,
              to: recipient,
              subject: "Daily Datapack Comments Report",
              title: "Daily Datapack Comments Report",
              message: `Here are the latest updates from today, ${formattedDate}.`,
              comments: newDatapackComments,
              link: `${process.env.APP_URL || "http://localhost:5173"}/datapacks`,
              buttonText: "View Datapacks"
            };
            await sendCommentsEmail(newEmail);
          }
        }
      } catch (e) {
        logger.error("Error fetching recent datapack comments", e);
      }
    }
  );
}

server.setNotFoundHandler((_request, reply) => {
  void reply.sendFile("index.html");
});

export const queue = new PQueue({ concurrency: MAX_CONCURRENCY_SIZE });

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
