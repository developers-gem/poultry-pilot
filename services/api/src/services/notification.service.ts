import { can } from "@poultrypilot/constants";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { NotificationProvider } from "../ports/external.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { AlertRecord, NotificationPreferenceRecord, NotificationRecord, PushDeviceRecord } from "../ports/records.js";
import type { FarmContext, RequestContext } from "./context.js";
import type { EffectiveRule } from "./rules.service.js";
import { RULE_FOR_ALERT } from "../domain/index.js";

const RANK = { info: 0, warning: 1, critical: 2 } as const;
/** Retry delays after each failed attempt; after the last, the notification is marked failed. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000];

const DEFAULT_PREFS = (userId: string, now: Date): NotificationPreferenceRecord => ({
  id: newId(), userId, pushEnabled: true, emailEnabled: true, pushMinSeverity: "warning", emailMinSeverity: "warning", createdAt: now, updatedAt: now,
});

/**
 * Notification infrastructure. In-app notifications are stored at once; push and email are queued and sent by the
 * delivery worker through replaceable providers (one per channel), with retries and backoff. Who is told follows the
 * alert rule (roles, channels, cooldown) and each person's preferences.
 */
export function createNotificationService(d: { repos: Repositories; clock: Clock; providers: NotificationProvider[] }) {
  const { repos, clock } = d;
  const providerFor = (channel: string) => d.providers.find((p) => p.channel === channel);

  async function prefsOf(userId: string) {
    return (await repos.notificationPreferences.get(userId)) ?? DEFAULT_PREFS(userId, clock.now());
  }

  async function preferencesView(userId: string) {
    const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...p } = await prefsOf(userId);
    return p;
  }

  return {
    /**
     * Fan an alert out to the people the rule names. Cooldown: a reopened alert is not re-sent on a channel within the
     * rule's cooldown; an escalation always is. Muted rules and severities below a person's threshold skip push and email.
     */
    async onAlert(ctx: FarmContext, alert: AlertRecord, rule: EffectiveRule | undefined, reason: "new" | "reopened" | "escalated", tx?: Tx) {
      const roles = rule?.notifyRoles ?? ["owner", "admin", "farm_manager"];
      const channels = new Set(rule?.channels ?? ["in_app"]);
      channels.add("in_app");
      const cooldownMs = (rule?.cooldownHours ?? 24) * 3_600_000;
      const ruleKey = RULE_FOR_ALERT[alert.ruleType];
      const members = (await repos.memberships.findByFarm(ctx.farmId, tx)).filter((m) => m.status === "active" && m.userId && roles.includes(m.role));
      const now = clock.now();
      const out: NotificationRecord[] = [];
      for (const m of members) {
        const userId = m.userId!;
        // Money alerts go only to people who may see money.
        if (alert.ruleType === "payment_overdue" && !can(m.role, "money.read")) continue;
        const prefs = await prefsOf(userId);
        const muted = !!ruleKey && !!prefs.mutedRuleKeys?.includes(ruleKey);
        for (const channel of channels) {
          if (channel !== "in_app" && channel !== "push" && channel !== "email") continue;
          if (channel === "push" && (muted || !prefs.pushEnabled || RANK[alert.severity] < RANK[prefs.pushMinSeverity])) continue;
          if (channel === "email" && (muted || !prefs.emailEnabled || RANK[alert.severity] < RANK[prefs.emailMinSeverity])) continue;
          if (reason !== "escalated") {
            const last = await repos.notifications.lastForAlert(alert.id, userId, channel);
            if (last && now.getTime() - last.createdAt.getTime() < cooldownMs) continue;
          }
          out.push({
            id: newId(),
            userId,
            farmId: ctx.farmId,
            channel,
            status: channel === "in_app" ? "delivered" : "queued",
            title: alert.title,
            ...(alert.message ? { body: alert.message } : {}),
            link: { entity: "alert", id: alert.id, path: `/farms/${ctx.farmId}/alerts/${alert.id}` },
            alertId: alert.id,
            ...(ruleKey ? { ruleKey } : {}),
            severity: alert.severity,
            ...(channel === "in_app" ? { deliveredAt: now } : { nextAttemptAt: now }),
            attempts: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      await repos.notifications.insertMany(out, tx);
    },

    /** The delivery worker: sends queued push and email notifications that are due. Safe to run often. */
    async deliverDue(limit = 100): Promise<{ sent: number; failed: number; retrying: number }> {
      const now = clock.now();
      const due = await repos.notifications.due(now, limit);
      let sent = 0;
      let failed = 0;
      let retrying = 0;
      for (const n of due) {
        const provider = providerFor(n.channel);
        const fail = async (error: string, retryable: boolean) => {
          const attempts = n.attempts + 1;
          if (!retryable || attempts > BACKOFF_MS.length) {
            await repos.notifications.update(n.id, { status: "failed", attempts, error, updatedAt: now });
            failed++;
          } else {
            await repos.notifications.update(n.id, { attempts, error, nextAttemptAt: new Date(now.getTime() + BACKOFF_MS[attempts - 1]!), updatedAt: now });
            retrying++;
          }
        };
        if (!provider) {
          await fail(`No provider for ${n.channel}`, false);
          continue;
        }
        let pushTokens: string[] | undefined;
        let email: string | undefined;
        if (n.channel === "push") {
          pushTokens = (await repos.pushDevices.activeForUser(n.userId)).map((x) => x.token);
          if (!pushTokens.length) {
            await fail("No registered devices", false);
            continue;
          }
        } else {
          email = (await repos.users.findById(n.userId))?.email;
          if (!email) {
            await fail("No email address", false);
            continue;
          }
        }
        try {
          const r = await provider.send({ notificationId: n.id, userId: n.userId, title: n.title, body: n.body ?? "", ...(n.severity ? { severity: n.severity } : {}), ...(n.link ? { link: n.link } : {}), ...(email ? { email } : {}), ...(pushTokens ? { pushTokens } : {}) });
          if (r.invalidTokens?.length) await repos.pushDevices.disableTokens(r.invalidTokens, now);
          await repos.notifications.update(n.id, { status: "sent", sentAt: now, attempts: n.attempts + 1, ...(r.providerMessageId ? { providerMessageId: r.providerMessageId } : {}), error: undefined, updatedAt: now });
          sent++;
        } catch (e) {
          await fail((e as Error).message.slice(0, 500), (e as { retryable?: boolean }).retryable !== false);
        }
      }
      return { sent, failed, retrying };
    },

    // ---- the person's side

    async inbox(ctx: RequestContext, q: { unreadOnly?: boolean; limit: number }) {
      const rows = await repos.notifications.forUser(ctx.userId, q);
      return {
        unread: await repos.notifications.unreadCount(ctx.userId),
        items: rows.map(({ createdAt, updatedAt: _u, deliveredAt: _d, readAt, sentAt: _s, nextAttemptAt: _n, attempts: _a, providerMessageId: _p, error: _e, ...r }) => ({ ...r, createdAt: createdAt.toISOString(), readAt: readAt?.toISOString() ?? null })),
      };
    },

    async markRead(ctx: RequestContext, ids: string[] | "all") {
      return { marked: await repos.notifications.markRead(ctx.userId, ids, clock.now()), unread: await repos.notifications.unreadCount(ctx.userId) };
    },

    async registerDevice(ctx: RequestContext, r: { platform: PushDeviceRecord["platform"]; token: string; deviceName?: string }) {
      const now = clock.now();
      const d0 = await repos.pushDevices.upsertByToken({ id: newId(), userId: ctx.userId, platform: r.platform, token: r.token, ...(r.deviceName ? { deviceName: r.deviceName } : {}), lastSeenAt: now, createdAt: now, updatedAt: now });
      return { id: d0.id, platform: d0.platform, deviceName: d0.deviceName ?? null, lastSeenAt: d0.lastSeenAt.toISOString() };
    },

    async removeDevice(ctx: RequestContext, id: string) {
      if (!(await repos.pushDevices.remove(ctx.userId, id))) throw notFound("Device");
    },

    preferences: (ctx: RequestContext) => preferencesView(ctx.userId),

    async setPreferences(ctx: RequestContext, r: { pushEnabled: boolean; emailEnabled: boolean; pushMinSeverity: NotificationPreferenceRecord["pushMinSeverity"]; emailMinSeverity: NotificationPreferenceRecord["emailMinSeverity"]; mutedRuleKeys?: NotificationPreferenceRecord["mutedRuleKeys"] }) {
      const cur = await prefsOf(ctx.userId);
      if (r.mutedRuleKeys?.some((k) => !k)) throw new AppError("VALIDATION_FAILED", "Unknown rule");
      await repos.notificationPreferences.put({ ...cur, ...r, ...(r.mutedRuleKeys ? {} : { mutedRuleKeys: undefined }), updatedAt: clock.now() });
      return preferencesView(ctx.userId);
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
