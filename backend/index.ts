import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/routes.ts";
import { createBullBoardRouter } from "./services/board.service.ts";
import { requireBasicAuth } from "./services/auth.middleware.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "https://code-base-xi.vercel.app/"],
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
