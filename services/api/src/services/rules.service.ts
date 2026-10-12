import { RULE_DEFINITIONS, RULE_FOR_ALERT, effectiveParams, validateRuleParams, type RuleKey } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { AlertRecord, AlertRuleRecord } from "../ports/records.js";
import type { AuditService } from "./audit.service.js";
import { assertCan, type FarmContext } from "./context.js";

export interface EffectiveRule {
  key: RuleKey;
  enabled: boolean;
  params: Record<string, number>;
  severity?: AlertRecord["severity"];
  channels: NonNullable<AlertRuleRecord["channels"]>;
  notifyRoles: NonNullable<AlertRuleRecord["notifyRoles"]>;
  cooldownHours: number;
  flockIds?: string[];
  houseIds?: string[];
}

/**
 * Alert rule settings per farm. Every rule comes from the catalog (domain/intelligence.ts); a farm may switch it off,
 * change its parameters, scope it to flocks or houses, set severity, recipients, channels and cooldown.
 */
export function createRulesService(d: { repos: Repositories; clock: Clock; audit: AuditService }) {
  const { repos, clock } = d;

  async function stored(ctx: FarmContext, key: RuleKey, tx?: Tx) {
    return (await repos.alertRules.find(ctx.farmId, { where: { ruleKey: key }, limit: 1 }, tx))[0] ?? null;
  }

  function merge(key: RuleKey, r: AlertRuleRecord | null): EffectiveRule {
    const def = RULE_DEFINITIONS[key];
    return {
      key,
      enabled: r?.enabled ?? true,
      params: effectiveParams(key, r?.parameters),
      ...(r?.severity ? { severity: r.severity } : {}),
      channels: r?.channels?.length ? r.channels : def.defaultChannels,
      notifyRoles: r?.notifyRoles?.length ? r.notifyRoles : def.defaultRoles,
      cooldownHours: r?.cooldownHours ?? 24,
      ...(r?.flockIds?.length ? { flockIds: r.flockIds } : {}),
      ...(r?.houseIds?.length ? { houseIds: r.houseIds } : {}),
    };
  }

  async function config(ctx: FarmContext, key: RuleKey, tx?: Tx): Promise<EffectiveRule> {
    return merge(key, await stored(ctx, key, tx));
  }

  return {
    config,

    /** The rule governing an alert type (undefined for alert types outside the catalog, e.g. biosecurity). */
    async forAlertType(ctx: FarmContext, alertType: AlertRecord["ruleType"], tx?: Tx): Promise<EffectiveRule | undefined> {
      const key = RULE_FOR_ALERT[alertType];
      return key ? config(ctx, key, tx) : undefined;
    },

    async list(ctx: FarmContext) {
      assertCan(ctx, "farm.read");
      const rows = await repos.alertRules.find(ctx.farmId);
      return (Object.keys(RULE_DEFINITIONS) as RuleKey[]).map((key) => {
        const def = RULE_DEFINITIONS[key];
        const r = rows.find((x) => x.ruleKey === key) ?? null;
        const eff = merge(key, r);
        return {
          ...eff,
          label: def.label,
          description: def.description,
          baseline: def.baseline,
          alertTypes: def.alertTypes,
          customised: !!r,
          defaultSeverity: def.defaultSeverity,
          parameters: def.params.map((p) => ({ ...p, value: eff.params[p.key] ?? null, setByFarm: r?.parameters?.[p.key] !== undefined })),
        };
      });
    },

    async update(ctx: FarmContext, key: RuleKey, body: { enabled: boolean; parameters?: Record<string, number>; severity?: AlertRecord["severity"]; channels?: AlertRuleRecord["channels"]; notifyRoles?: AlertRuleRecord["notifyRoles"]; cooldownHours?: number; flockIds?: string[]; houseIds?: string[] }) {
      assertCan(ctx, "alert.manage");
      if (!RULE_DEFINITIONS[key]) throw notFound("Rule");
      try {
        validateRuleParams(key, body.parameters ?? {});
      } catch (e) {
        throw new AppError("VALIDATION_FAILED", (e as Error).message);
      }
      if (body.channels && !body.channels.includes("in_app")) throw new AppError("VALIDATION_FAILED", "In-app is always kept, so the alert list stays complete");
      for (const f of body.flockIds ?? []) if (!(await repos.flocks.findById(ctx.farmId, f))) throw notFound("Flock");
      for (const h of body.houseIds ?? []) if (!(await repos.houses.findById(ctx.farmId, h))) throw notFound("House");
      return repos.tx.run(async (tx) => {
        const cur = await stored(ctx, key, tx);
        const now = clock.now();
        const fields = {
          enabled: body.enabled,
          parameters: body.parameters && Object.keys(body.parameters).length ? body.parameters : undefined,
          severity: body.severity,
          channels: body.channels,
          notifyRoles: body.notifyRoles,
          cooldownHours: body.cooldownHours ?? 24,
          flockIds: body.flockIds?.length ? body.flockIds : undefined,
          houseIds: body.houseIds?.length ? body.houseIds : undefined,
        };
        if (cur) await repos.alertRules.update(ctx.farmId, cur.id, { ...fields, updatedBy: ctx.userId, updatedAt: now }, { expectedVersion: cur.version }, tx);
        else await repos.alertRules.insert({ id: newId(), farmId: ctx.farmId, ruleKey: key, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), enabled: body.enabled, cooldownHours: fields.cooldownHours, createdBy: ctx.userId, createdAt: now, updatedAt: now, version: 0 } as AlertRuleRecord, tx);
        await d.audit.record(ctx, { action: "alert_rule.updated", entity: "alert_rule", entityId: key, before: cur ? { enabled: cur.enabled, parameters: cur.parameters } : undefined, after: { enabled: body.enabled, parameters: body.parameters } }, tx);
        return merge(key, await stored(ctx, key, tx));
      });
    },

    /** Back to catalog defaults. */
    async reset(ctx: FarmContext, key: RuleKey) {
      assertCan(ctx, "alert.manage");
      const cur = await stored(ctx, key);
      if (cur) await repos.alertRules.update(ctx.farmId, cur.id, { enabled: true, parameters: undefined, severity: undefined, channels: undefined, notifyRoles: undefined, cooldownHours: 24, flockIds: undefined, houseIds: undefined, updatedBy: ctx.userId, updatedAt: clock.now() }, { expectedVersion: cur.version });
      return merge(key, null);
    },
  };
}

export type RulesService = ReturnType<typeof createRulesService>;
