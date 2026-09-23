import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/routes.ts";
import { createBullBoardRouter } from "./services/board.service.ts";
import { requireBasicAuth } from "./services/auth.middleware.ts";
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Free hosting tiers (e.g. Render's free plan) often don't offer a separate
// "background worker" service type - only a web service, which needs a port.
// RUN_WORKER_INLINE=true runs the queue worker in this same process instead
// of a dedicated one, so no second (paid) service is required. Uses more
// memory per instance (the embedding model + API together) - fine for a
// single-user/demo deploy; split it back into workers/repo.worker.ts run via
// `npm run worker` as its own service once you outgrow this.
if (process.env.RUN_WORKER_INLINE === "true") {
  startRepoWorker();
}
