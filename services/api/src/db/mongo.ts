import mongoose from "mongoose";
import type { Logger } from "pino";
import { redactMongoUri } from "../config/env.js";
import type { DependencyCheck } from "../ports/health.js";

export interface MongoOptions {
  uri: string;
  serverSelectionTimeoutMS: number;
  maxPoolSize: number;
  retries: number;
  autoIndex: boolean;
  appName?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Owns the single Mongoose connection: connect with exponential backoff, log state changes,
 * expose a timed ping for health checks, and disconnect on shutdown.
 */
export function createMongo(opts: MongoOptions, logger: Logger) {
  const log = logger.child({ component: "mongodb" });
  const conn = mongoose.connection;
  let stopping = false;

  mongoose.set("strictQuery", true);
  conn.on("connected", () => log.info({ host: conn.host, db: conn.name }, "MongoDB connected"));
  conn.on("disconnected", () => !stopping && log.warn("MongoDB disconnected"));
  conn.on("reconnected", () => log.info("MongoDB reconnected"));
  // Message only: connect() logs each failed attempt, so a full stack per retry is noise.
  conn.on("error", (err) => !stopping && log.error({ err: (err as Error).message }, "MongoDB connection error"));

  async function connect(): Promise<void> {
    const target = redactMongoUri(opts.uri);
    for (let attempt = 0; ; attempt++) {
      try {
        log.info({ uri: target, attempt: attempt + 1 }, "connecting to MongoDB");
        await mongoose.connect(opts.uri, {
          serverSelectionTimeoutMS: opts.serverSelectionTimeoutMS,
          maxPoolSize: opts.maxPoolSize,
          autoIndex: opts.autoIndex,
          appName: opts.appName ?? "poultrypilot-api",
        });
        return;
      } catch (err) {
        if (stopping) return;
        if (attempt >= opts.retries) {
          log.error({ err, attempts: attempt + 1 }, "giving up connecting to MongoDB");
          throw err;
        }
        const delay = Math.min(30_000, 500 * 2 ** attempt);
        log.warn({ err: (err as Error).message, retryInMs: delay }, "MongoDB connection failed; retrying");
        await sleep(delay);
      }
    }
  }

  /** Health probe: `ping` with its own timeout so a hung database cannot hang the health endpoint. */
  const check: DependencyCheck = async (timeoutMs = 2000) => {
    if (conn.readyState !== 1 || !conn.db) return { status: "down", error: `not connected (state ${conn.readyState})` };
    const started = performance.now();
    try {
      await Promise.race([
        conn.db.admin().command({ ping: 1 }),
        sleep(timeoutMs).then(() => {
          throw new Error(`ping timed out after ${timeoutMs} ms`);
        }),
      ]);
      return { status: "up", latencyMs: Math.round(performance.now() - started) };
    } catch (err) {
      // /health is public: the driver's message (hosts, replica set names) stays in the log.
      log.warn({ err }, "database ping failed");
      return { status: "down", error: "database did not answer" };
    }
  };

  async function disconnect(): Promise<void> {
    stopping = true;
    if (conn.readyState !== 0) await mongoose.disconnect();
    log.info("MongoDB connection closed");
  }

  return { connect, check, disconnect, connection: conn };
}

export type Mongo = ReturnType<typeof createMongo>;
