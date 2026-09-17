import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { repoQueue } from "./queue.service.ts";

// Mounts a live BullMQ dashboard (job list, progress, logs, retry/remove) at basePath.
export const createBullBoardRouter = (basePath: string) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [new BullMQAdapter(repoQueue)],
    serverAdapter,
  });

  return serverAdapter.getRouter();
};
