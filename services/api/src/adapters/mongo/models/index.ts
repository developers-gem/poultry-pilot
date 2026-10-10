/**
 * Every PoultryPilot collection. Importing this module registers all models and fills `registry`,
 * which the data dictionary generator and the schema tests read.
 */
export * from "./identity.js";
export * from "./production.js";
export * from "./feed.js";
export * from "./inventory.js";
export * from "./health.js";
export * from "./hatchery.js";
export * from "./biosecurity.js";
export * from "./finance.js";
export * from "./market.js";
export * from "./operations.js";
export * from "./content.js";
export * from "./system.js";
export { registry, type CollectionMeta, type IndexSpec } from "./base.js";

// Names used by the repositories before the full model existed.
export { AuditLogModel as AuditModel, SyncOperationModel as ProcessedMutationModel } from "./system.js";
