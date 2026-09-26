import net from "node:net";
import { Redis } from "ioredis";
import dotenv from "dotenv";
dotenv.config();

// Node gives each resolved address only 250ms to connect before trying the
// next one. Remote Redis hosts (e.g. Upstash) resolve to several addresses and
// often need longer on slower networks, so every attempt times out and ioredis
// reports "AggregateError [ETIMEDOUT]". Give each attempt 5s instead.
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

export const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// host:port only - never echo the password from the URL into logs or responses.
export const redisTarget = (() => {
  try {
    const url = new URL(REDIS_URL);
    return `${url.hostname}:${url.port || 6379}`;
  } catch {
    return "an invalid REDIS_URL";
  }
})();

export class ServiceUnavailableError extends Error {
  constructor(
    message: string,
    readonly code: "REDIS_UNAVAILABLE" | "CHROMA_UNAVAILABLE",
  ) {
    super(message);
  }
}

export const redisUnavailableMessage = () =>
  `Redis is not reachable at ${redisTarget}. Start it locally with \`npm run redis\` (needs Docker), ` +
  `or set REDIS_URL in backend/.env to a hosted Redis such as Upstash (rediss://...).`;

// Keep reconnecting in the background, backing off to one attempt every 10s.
const retryStrategy = (times: number) => Math.min(times * 500, 10_000);

// For the API (adding jobs, reading status). Commands fail immediately while
// Redis is down instead of waiting forever, so requests can return an error.
export const createQueueConnection = () =>
  new Redis(REDIS_URL, {
    connectTimeout: 10_000,
    retryStrategy,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

// For BullMQ workers. Their blocking commands require maxRetriesPerRequest: null.
export const createWorkerConnection = () =>
  new Redis(REDIS_URL, { connectTimeout: 10_000, retryStrategy, maxRetriesPerRequest: null });

// Resolves once the connection is usable; rejects after timeoutMs otherwise.
export const waitForRedis = (client: Redis, timeoutMs = 5000) =>
  new Promise<void>((resolve, reject) => {
    if (client.status === "ready") return resolve();

    const onReady = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      client.off("ready", onReady);
      reject(new ServiceUnavailableError(redisUnavailableMessage(), "REDIS_UNAVAILABLE"));
    }, timeoutMs);
    client.once("ready", onReady);
  });

// Logs an error once, then at most once a minute while the same error repeats,
// instead of a stack trace on every reconnect attempt.
export const throttledErrorLogger = (label: string, hint: (() => string) | null = redisUnavailableMessage) => {
  let last = { message: "", at: 0 };
  return (err: Error) => {
    const message = err.message || (err as { code?: string }).code || String(err);
    const now = Date.now();
    if (message === last.message && now - last.at < 60_000) return;
    last = { message, at: now };
    console.error(`[${label}] ${message}${hint ? ` - ${hint()}` : ""}`);
  };
};
