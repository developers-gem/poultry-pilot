import type { Schema } from "mongoose";

/**
 * Safety net for tenancy: any find/update/delete/count on a farm-scoped model must filter on farmId.
 * A query without it throws instead of silently reading across farms.
 * Opt out per query with `.setOptions({ crossFarm: true })` for vetted system jobs only.
 */
export function requireFarmScope(schema: Schema): void {
  const ops = ["find", "findOne", "findOneAndUpdate", "updateOne", "updateMany", "deleteOne", "deleteMany", "countDocuments"] as const;
  for (const op of ops) {
    schema.pre(op, function () {
      const opts = this.getOptions() as { crossFarm?: boolean };
      if (opts.crossFarm) return;
      const filter = this.getFilter() as Record<string, unknown>;
      if (filter["farmId"] === undefined) {
        throw new Error(`Tenancy violation: ${op} on ${this.model.modelName} without farmId`);
      }
    });
  }
}
