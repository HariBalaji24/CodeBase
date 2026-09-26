import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/routes.ts";
import { createBullBoardRouter } from "./services/board.service.ts";
import { requireBasicAuth } from "./services/auth.middleware.ts";
import { ensureQueueReady, repoQueue } from "./services/queue.service.ts";
import { ensureChromaReady, chromaTarget } from "./services/vectorstore.service.ts";
import { redisTarget } from "./services/redis.service.ts";
import { startRepoWorker } from "./workers/repo.worker.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://code-base-xi.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

// Visual dashboard for the repo-indexing queue: job list, live progress, logs, retry/remove.
// Protected by basic auth when BULLBOARD_USER/PASSWORD are set (always set them in production).
app.use(
  "/admin/queues",
  requireBasicAuth("Bull Board"),
  createBullBoardRouter("/admin/queues"),
);

app.use("/", router);

// Prints once at startup whether the services analysis depends on are reachable.
const reportDependencies = async () => {
  const [redis, chroma] = await Promise.allSettled([ensureQueueReady(8000), ensureChromaReady(8000)]);
  console.log(
    redis.status === "fulfilled"
      ? `[api] Redis: connected (${redisTarget})`
      : `[api] Redis: NOT reachable - ${(redis.reason as Error).message}`,
  );
  console.log(
    chroma.status === "fulfilled"
      ? `[api] Chroma: connected (${chromaTarget})`
      : `[api] Chroma: NOT reachable - ${(chroma.reason as Error).message}`,
  );
};

app.listen(PORT, () => {
  console.log(`[api] Server is running on port ${PORT}`);
  void reportDependencies();
});

// By default this process also runs the queue worker, so `npm run dev` / `npm start`
// is all it takes for jobs to be processed - one service on free hosting tiers.
// Set RUN_WORKER=false only if you run a separate `npm run worker` process instead.
const worker = process.env.RUN_WORKER === "false" ? null : startRepoWorker();
if (!worker) {
  console.log("[api] RUN_WORKER=false - jobs are processed only by a separate `npm run worker` process.");
}

const shutdown = async () => {
  // Don't wait for a running job: it is picked up again after restart.
  await Promise.race([
    Promise.all([worker?.stop(), repoQueue.close()]),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
