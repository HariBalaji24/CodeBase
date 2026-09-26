// Standalone worker process: `npm run worker`.
// Only needed if you run the worker separately from the API (then start the API
// with RUN_WORKER=false). By default the API process runs a worker itself.
import { startRepoWorker } from "./workers/repo.worker.ts";
import { ensureChromaReady, chromaTarget } from "./services/vectorstore.service.ts";

const { stop } = startRepoWorker();

ensureChromaReady()
  .then(() => console.log(`[worker] Chroma: connected (${chromaTarget})`))
  .catch((err: Error) => console.error(`[worker] Chroma: NOT reachable - ${err.message}`));

const shutdown = async () => {
  console.log("[worker] Shutting down…");
  await stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
