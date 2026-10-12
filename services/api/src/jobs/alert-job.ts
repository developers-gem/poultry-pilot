import type { Logger } from "pino";
import type { Container } from "../container.js";
import type { FarmContext } from "../services/context.js";

/** The identity system jobs act as. Alerts it raises carry createdBy "system". */
export const systemContext = (farmId: string): FarmContext => ({ userId: "system", farmId, role: "owner", membershipId: "system" });

type JobDeps = Pick<Container, "repos" | "alerts" | "flockHealth" | "hatchery" | "finance" | "intelligence" | "weather">;

/** Every scheduled check for one farm, in one transaction: stock, health, hatchery, recurring bills and the rule engine. */
export async function runFarmChecks(c: JobDeps, ctx: FarmContext) {
  return c.repos.tx.run(async (tx) => {
    await c.alerts.evaluateInventory(ctx, tx);
    await c.flockHealth.evaluateAlerts(ctx, tx);
    await c.hatchery.evaluateAlerts(ctx, tx);
    await c.finance.runScheduled(ctx, tx);
    return c.intelligence.evaluate(ctx, tx);
  });
}

/**
 * Hourly for every farm: weather first (outside any transaction; the cache makes it one call per location), then the
 * checks. One farm's failure is logged and does not stop the others.
 */
export async function runAlertJob(c: JobDeps, logger?: Logger): Promise<{ farms: number; failed: number }> {
  await c.weather.refreshAll().catch((err) => logger?.error({ err }, "weather refresh failed"));
  const ids = await c.repos.farms.listIds();
  let failed = 0;
  for (const farmId of ids) {
    try {
      await runFarmChecks(c, systemContext(farmId));
    } catch (err) {
      failed++;
      logger?.error({ err, farmId }, "alert job failed for farm");
    }
  }
  return { farms: ids.length, failed };
}

/** Starts the hourly job. Returns a stop function for graceful shutdown. */
export function scheduleAlertJob(c: JobDeps, logger: Logger, everyMs = 60 * 60 * 1000): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await runAlertJob(c, logger);
      logger.info(r, "alert job finished");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), everyMs);
  timer.unref();
  return () => clearInterval(timer);
}

/** Sends queued push and email notifications every 30 seconds. */
export function scheduleDelivery(c: Pick<Container, "notifications">, logger: Logger, everyMs = 30_000): () => void {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const r = await c.notifications.deliverDue();
      if (r.sent || r.failed || r.retrying) logger.info(r, "notifications delivered");
    } catch (err) {
      logger.error({ err }, "notification delivery failed");
    } finally {
      running = false;
    }
  }, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
