import type { Logger } from "pino";
import type { Container } from "../container.js";
import type { FarmContext } from "../services/context.js";

/** The identity system jobs act as. Alerts it raises carry createdBy "system". */
export const systemContext = (farmId: string): FarmContext => ({ userId: "system", farmId, role: "owner", membershipId: "system" });

/**
 * Re-evaluates stock alerts for every farm. Needed because expiry alerts depend on the date passing, not on
 * anyone touching stock. One farm's failure is logged and does not stop the others.
 */
export async function runAlertJob(c: Pick<Container, "repos" | "alerts" | "flockHealth" | "hatchery" | "finance">, logger?: Logger): Promise<{ farms: number; failed: number }> {
  const ids = await c.repos.farms.listIds();
  let failed = 0;
  for (const farmId of ids) {
    try {
      await c.repos.tx.run(async (tx) => {
        await c.alerts.evaluateInventory(systemContext(farmId), tx);
        await c.flockHealth.evaluateAlerts(systemContext(farmId), tx);
        await c.hatchery.evaluateAlerts(systemContext(farmId), tx);
        await c.finance.runScheduled(systemContext(farmId), tx);
      });
    } catch (err) {
      failed++;
      logger?.error({ err, farmId }, "alert job failed for farm");
    }
  }
  return { farms: ids.length, failed };
}

/** Starts the hourly job. Returns a stop function for graceful shutdown. */
export function scheduleAlertJob(c: Pick<Container, "repos" | "alerts" | "flockHealth" | "hatchery" | "finance">, logger: Logger, everyMs = 60 * 60 * 1000): () => void {
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
