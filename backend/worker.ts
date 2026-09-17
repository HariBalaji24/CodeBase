// Standalone worker process: `npm run worker`.
// Keeps CPU-heavy embedding off the API's event loop.
import { startRepoWorker } from "./workers/repo.worker.ts";

const worker = startRepoWorker();

const shutdown = async () => {
  console.log("[worker] shutting down…");
  await worker.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
