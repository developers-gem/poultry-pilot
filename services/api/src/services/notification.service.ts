import { can, CATEGORY_FOR_RULE, NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORY_INFO, type NotificationCategory } from "@poultrypilot/constants";
import { localDateOf } from "../domain/index.js";
import { AppError, notFound } from "../lib/errors.js";
import { newId, type Clock } from "../lib/util.js";
import type { NotificationProvider } from "../ports/external.js";
import type { Repositories, Tx } from "../ports/repositories.js";
import type { AlertRecord, NotificationPreferenceRecord, NotificationRecord, OrderPaymentRecord, OrderRecord, PushDeviceRecord } from "../ports/records.js";
import type { FarmContext, RequestContext } from "./context.js";
import type { EffectiveRule } from "./rules.service.js";
import { RULE_FOR_ALERT } from "../domain/index.js";

const RANK = { info: 0, warning: 1, critical: 2 } as const;
type Severity = keyof typeof RANK;
type Channel = "in_app" | "push" | "email";
/** Retry delays after each failed attempt; after the last, the notification is marked failed. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000];
/** How long a worker holds a claimed notification; if it crashes mid-send, another worker retries after this. */
const LEASE_MS = 5 * 60_000;

const DEFAULT_PREFS = (userId: string, now: Date): NotificationPreferenceRecord => ({
  id: newId(), userId, pushEnabled: true, emailEnabled: true, pushMinSeverity: "warning", emailMinSeverity: "warning", createdAt: now, updatedAt: now,
});

/** Minutes past midnight of "HH:MM". */
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** If `now` is inside the person's quiet hours, when they end; otherwise null. */
export function quietUntil(now: Date, q: { start: string; end: string; timezone: string } | undefined): Date | null {
  if (!q || q.start === q.end) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: q.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const t = Number(parts.find((p) => p.type === "hour")!.value) * 60 + Number(parts.find((p) => p.type === "minute")!.value);
  const s = minutesOf(q.start);
  const e = minutesOf(q.end);
  const inside = s < e ? t >= s && t < e : t >= s || t < e;
  if (!inside) return null;
  const wait = (e - t + 1440) % 1440;
  return new Date(Math.floor(now.getTime() / 60_000) * 60_000 + wait * 60_000);
}

export interface NotifyInput {
  farmId?: string;
  category: NotificationCategory;
  /** Identifies the event. The same event gives the same keys, so it is never stored or sent twice. */
  eventKey: string;
  userIds: string[];
  title: string;
  body?: string;
  severity: Severity;
  link?: { entity?: string; id?: string; path?: string };
  /** Channels the source allows (an alert: its rule). In-app is always included. */
  channels?: Channel[];
  /** Alerts honour each person's minimum severity; events (tasks, orders, payments) follow the category switch. */
  severityThreshold?: boolean;
  alertId?: string;
  ruleKey?: NotificationRecord["ruleKey"];
  /** Skip a person on a channel (an alert re-sent within its cooldown). */
  skip?: (userId: string, channel: Channel) => Promise<boolean>;
}

/**
 * Notification infrastructure. In-app notifications are stored at once; push and email are queued and sent by the
 * delivery worker through replaceable providers (FCM for push), with retries and backoff.
 *
 * No duplicates: every notification has a dedupe key (event, person, channel), checked before insert and unique in
 * the database, so re-running the hourly job, retrying a request or two servers evaluating at once cannot notify
 * anyone twice. Push retries go only to the devices that have not received the message, and every push carries its
 * notification id as the collapse key, so a device that gets it twice shows it once.
 */
export function createNotificationService(d: { repos: Repositories; clock: Clock; providers: NotificationProvider[] }) {
  const { repos, clock } = d;
  const providerFor = (channel: string) => d.providers.find((p) => p.channel === channel);

  async function prefsOf(userId: string) {
    return (await repos.notificationPreferences.get(userId)) ?? DEFAULT_PREFS(userId, clock.now());
  }

  async function preferencesView(userId: string) {
    const p = await prefsOf(userId);
    return {
      pushEnabled: p.pushEnabled,
      emailEnabled: p.emailEnabled,
      pushMinSeverity: p.pushMinSeverity,
      emailMinSeverity: p.emailMinSeverity,
      ...(p.mutedRuleKeys ? { mutedRuleKeys: p.mutedRuleKeys } : {}),
      quietHours: p.quietHours ?? null,
      categories: NOTIFICATION_CATEGORIES.map((key) => ({
        key,
        ...NOTIFICATION_CATEGORY_INFO[key],
        push: p.categories?.[key]?.push !== false,
        email: p.categories?.[key]?.email !== false,
      })),
    };
  }

  /** The single way notifications are created. Returns the ones stored (duplicates are skipped). */
  async function notify(n: NotifyInput, tx?: Tx): Promise<NotificationRecord[]> {
    const now = clock.now();
    const channels = new Set<Channel>(n.channels ?? ["in_app", "push"]);
    channels.add("in_app");
    const candidates: NotificationRecord[] = [];
    for (const userId of [...new Set(n.userIds)]) {
      const prefs = await prefsOf(userId);
      const legacyMuted = !!n.ruleKey && !!prefs.mutedRuleKeys?.includes(n.ruleKey);
      const cat = prefs.categories?.[n.category];
      for (const channel of channels) {
        if (channel === "push" && (!prefs.pushEnabled || cat?.push === false || legacyMuted || (n.severityThreshold && RANK[n.severity] < RANK[prefs.pushMinSeverity]))) continue;
        if (channel === "email" && (!prefs.emailEnabled || cat?.email === false || legacyMuted || (n.severityThreshold && RANK[n.severity] < RANK[prefs.emailMinSeverity]))) continue;
        if (n.skip && (await n.skip(userId, channel))) continue;
        // Quiet hours delay push (not critical ones); nothing is dropped.
        const wait = channel === "push" && n.severity !== "critical" ? quietUntil(now, prefs.quietHours) : null;
        candidates.push({
          id: newId(),
          userId,
          ...(n.farmId ? { farmId: n.farmId } : {}),
          channel,
          status: channel === "in_app" ? "delivered" : "queued",
          title: n.title.slice(0, 200),
          ...(n.body ? { body: n.body.slice(0, 2000) } : {}),
          ...(n.link ? { link: n.link } : {}),
          ...(n.alertId ? { alertId: n.alertId } : {}),
          ...(n.ruleKey ? { ruleKey: n.ruleKey } : {}),
          category: n.category,
          dedupeKey: `${n.eventKey}:${userId}:${channel}`,
          severity: n.severity,
          ...(channel === "in_app" ? { deliveredAt: now } : { nextAttemptAt: wait ?? now }),
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    if (!candidates.length) return [];
    const existing = await repos.notifications.existingDedupeKeys(candidates.map((c) => c.dedupeKey!), tx);
    const fresh = candidates.filter((c) => !existing.has(c.dedupeKey!));
    if (fresh.length) await repos.notifications.insertMany(fresh, tx);
    return fresh;
  }

  const activeMembers = async (farmId: string, tx?: Tx) => (await repos.memberships.findByFarm(farmId, tx)).filter((m) => m.status === "active" && m.userId);
  const money = (m: { amountMinor: number; currency: string }) => `${(m.amountMinor / 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${m.currency}`;

  return {
    notify,

    /**
     * Fan an alert out to the people the rule names, under the rule's category. A new alert notifies once; an
     * escalation once per severity; a reopened alert at most once per cooldown window (and never within the cooldown
     * of the last notification for it).
     */
    async onAlert(ctx: FarmContext, alert: AlertRecord, rule: EffectiveRule | undefined, reason: "new" | "reopened" | "escalated", tx?: Tx) {
      const roles = rule?.notifyRoles ?? ["owner", "admin", "farm_manager"];
      const ruleKey = RULE_FOR_ALERT[alert.ruleType];
      const category: NotificationCategory = ruleKey ? CATEGORY_FOR_RULE[ruleKey] : "inventory_low";
      const cooldownMs = (rule?.cooldownHours ?? 24) * 3_600_000;
      const now = clock.now();
      const members = (await activeMembers(ctx.farmId, tx)).filter((m) => roles.includes(m.role) && (alert.ruleType !== "payment_overdue" || can(m.role, "money.read")));
      const eventKey = reason === "new" ? `alert:${alert.id}:new` : reason === "escalated" ? `alert:${alert.id}:escalated:${alert.severity}` : `alert:${alert.id}:reopened:${Math.floor(now.getTime() / cooldownMs)}`;
      return notify(
        {
          farmId: ctx.farmId,
          category,
          eventKey,
          userIds: members.map((m) => m.userId!),
          title: alert.title,
          ...(alert.message ? { body: alert.message } : {}),
          severity: alert.severity,
          link: { entity: "alert", id: alert.id, path: `/farms/${ctx.farmId}/alerts/${alert.id}` },
          channels: (rule?.channels ?? ["in_app"]).filter((c): c is Channel => c === "in_app" || c === "push" || c === "email"),
          severityThreshold: true,
          alertId: alert.id,
          ...(ruleKey ? { ruleKey } : {}),
          skip:
            reason === "reopened"
              ? async (userId, channel) => {
                  const last = await repos.notifications.lastForAlert(alert.id, userId, channel);
                  return !!last && now.getTime() - last.createdAt.getTime() < cooldownMs;
                }
              : undefined,
        },
        tx,
      );
    },

    /** Hourly: tasks due today, and overdue tasks, told once each to the assignee (or everyone who can do tasks). */
    async notifyTasksDue(ctx: FarmContext, tx?: Tx) {
      const farm = await repos.farms.findById(ctx.farmId, tx);
      if (!farm) return 0;
      const today = localDateOf(clock.now(), farm.settings.timezone);
      const tasks = (await repos.tasks.find(ctx.farmId, { where: { status: ["open", "in_progress"] } as never }, tx)).filter((t) => t.dueDate && t.dueDate <= today);
      if (!tasks.length) return 0;
      const members = await activeMembers(ctx.farmId, tx);
      const doers = members.filter((m) => can(m.role, "task.complete")).map((m) => m.userId!);
      let sent = 0;
      for (const t of tasks) {
        const overdue = t.dueDate! < today;
        const assignee = t.assigneeUserId && members.some((m) => m.userId === t.assigneeUserId) ? [t.assigneeUserId] : null;
        sent += (
          await notify(
            {
              farmId: ctx.farmId,
              category: "task_due",
              eventKey: overdue ? `task:${t.id}:overdue` : `task:${t.id}:due:${t.dueDate}`,
              userIds: assignee ?? doers,
              title: `${overdue ? "Overdue" : "Due today"}: ${t.title}`,
              ...(t.description ? { body: t.description } : {}),
              severity: overdue || t.priority === "urgent" ? "warning" : "info",
              link: { entity: "task", id: t.id, path: "/tasks" },
            },
            tx,
          )
        ).length;
      }
      return sent;
    },

    /**
     * Orders and payments, told to the other side (never to the person who made the change): the selling farm's
     * people who handle orders (or money, for payments) and the buyer who placed the order.
     */
    async onOrderEvent(ctx: FarmContext, order: OrderRecord, event: { kind: "placed" } | { kind: "status"; to: OrderRecord["status"]; actor: "seller" | "buyer" } | { kind: "payment"; payment: OrderPaymentRecord }, tx?: Tx) {
      const members = await activeMembers(order.farmId, tx);
      const line = order.lines[0];
      const what = line ? `${line.quantity} ${line.unit} ${line.description}` : "the order";
      const others = (ids: (string | undefined)[]) => ids.filter((id): id is string => !!id && id !== ctx.userId);
      const sellers = (perm: "market.manage" | "money.read") => members.filter((m) => can(m.role, perm)).map((m) => m.userId!);
      const link = { entity: "order", id: order.id, path: "/market" };
      if (event.kind === "placed") {
        return notify({ farmId: order.farmId, category: "order_update", eventKey: `order:${order.id}:placed`, userIds: others(sellers("market.manage")), title: `New order #${order.orderNumber}`, body: `${order.buyerName ?? "A buyer"} ordered ${what}.`, severity: "warning", link }, tx);
      }
      if (event.kind === "status") {
        const label: Record<string, string> = { accepted: "accepted", preparing: "being prepared", dispatched: "on its way", delivered: "delivered", completed: "completed", cancelled: "cancelled" };
        const toBuyer = event.actor === "seller";
        return notify(
          {
            farmId: order.farmId,
            category: "order_update",
            eventKey: `order:${order.id}:${event.to}`,
            userIds: toBuyer ? others([order.buyerUserId]) : others(sellers("market.manage")),
            title: toBuyer ? `Your order #${order.orderNumber} is ${label[event.to] ?? event.to}` : `Order #${order.orderNumber} ${event.to === "cancelled" ? "cancelled by the buyer" : `marked ${label[event.to] ?? event.to} by the buyer`}`,
            body: what,
            severity: event.to === "cancelled" ? "warning" : "info",
            link,
          },
          tx,
        );
      }
      const p = event.payment;
      const refund = p.kind === "refund";
      return notify(
        {
          farmId: order.farmId,
          category: "payment_update",
          eventKey: `payment:${p.id}`,
          userIds: others([...sellers("money.read"), order.buyerUserId]),
          title: `${refund ? "Refund" : "Payment"} of ${money(p.amount)} on order #${order.orderNumber}`,
          body: what,
          severity: "info",
          link,
        },
        tx,
      );
    },

    /** The delivery worker: sends queued push and email notifications that are due. Safe to run often and in parallel runs (a notification is sent at most once per device). */
    async deliverDue(limit = 100): Promise<{ sent: number; failed: number; retrying: number }> {
      const now = clock.now();
      const due = await repos.notifications.due(now, limit);
      let sent = 0;
      let failed = 0;
      let retrying = 0;
      for (const n of due) {
        // Several API instances run this worker: only the one that claims a notification sends it.
        if (!n.nextAttemptAt || !(await repos.notifications.claim(n.id, n.nextAttemptAt, new Date(now.getTime() + LEASE_MS)))) continue;
        const provider = providerFor(n.channel);
        const fail = async (error: string, retryable: boolean, extra: Partial<NotificationRecord> = {}) => {
          const attempts = n.attempts + 1;
          if (!retryable || attempts > BACKOFF_MS.length) {
            await repos.notifications.update(n.id, { ...extra, status: "failed", attempts, error, updatedAt: now });
            failed++;
          } else {
            await repos.notifications.update(n.id, { ...extra, attempts, error, nextAttemptAt: new Date(now.getTime() + BACKOFF_MS[attempts - 1]!), updatedAt: now });
            retrying++;
          }
        };
        if (!provider) {
          await fail(`No provider for ${n.channel}`, false);
          continue;
        }
        let pushTokens: string[] | undefined;
        let email: string | undefined;
        const already = new Set(n.sentTokens ?? []);
        if (n.channel === "push") {
          // Only devices that have not had this notification yet.
          pushTokens = (await repos.pushDevices.activeForUser(n.userId)).map((x) => x.token).filter((t) => !already.has(t));
          if (!pushTokens.length) {
            if (already.size) {
              await repos.notifications.update(n.id, { status: "sent", sentAt: now, updatedAt: now });
              sent++;
            } else await fail("No registered devices", false);
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
          const r = await provider.send({ notificationId: n.id, userId: n.userId, title: n.title, body: n.body ?? "", ...(n.severity ? { severity: n.severity } : {}), ...(n.link ? { link: n.link } : {}), ...(n.category ? { category: n.category } : {}), ...(email ? { email } : {}), ...(pushTokens ? { pushTokens } : {}) });
          if (r.invalidTokens?.length) await repos.pushDevices.disableTokens(r.invalidTokens, now);
          const delivered = pushTokens ? [...already, ...(r.sentTokens ?? pushTokens.filter((t) => !r.retryTokens?.includes(t) && !r.invalidTokens?.includes(t)))] : undefined;
          if (r.retryTokens?.length) {
            await fail(`${r.retryTokens.length} device(s) could not be reached`, true, delivered ? { sentTokens: delivered } : {});
            continue;
          }
          await repos.notifications.update(n.id, { status: "sent", sentAt: now, attempts: n.attempts + 1, ...(delivered ? { sentTokens: delivered } : {}), ...(r.providerMessageId ? { providerMessageId: r.providerMessageId } : {}), error: undefined, updatedAt: now });
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
        items: rows.map(({ createdAt, updatedAt: _u, deliveredAt: _d, readAt, sentAt: _s, nextAttemptAt: _n, attempts: _a, providerMessageId: _p, error: _e, dedupeKey: _k, sentTokens: _t, ...r }) => ({ ...r, createdAt: createdAt.toISOString(), readAt: readAt?.toISOString() ?? null })),
      };
    },

    async markRead(ctx: RequestContext, ids: string[] | "all") {
      return { marked: await repos.notifications.markRead(ctx.userId, ids, clock.now()), unread: await repos.notifications.unreadCount(ctx.userId) };
    },

    /** A device token belongs to one person: registering it moves it to whoever is signed in on that phone. */
    async registerDevice(ctx: RequestContext, r: { platform: PushDeviceRecord["platform"]; token: string; deviceName?: string }) {
      const now = clock.now();
      const d0 = await repos.pushDevices.upsertByToken({ id: newId(), userId: ctx.userId, platform: r.platform, token: r.token, ...(r.deviceName ? { deviceName: r.deviceName } : {}), lastSeenAt: now, createdAt: now, updatedAt: now });
      return { id: d0.id, platform: d0.platform, deviceName: d0.deviceName ?? null, lastSeenAt: d0.lastSeenAt.toISOString() };
    },

    async removeDevice(ctx: RequestContext, id: string) {
      if (!(await repos.pushDevices.remove(ctx.userId, id))) throw notFound("Device");
    },

    preferences: (ctx: RequestContext) => preferencesView(ctx.userId),

    async setPreferences(
      ctx: RequestContext,
      r: {
        pushEnabled: boolean;
        emailEnabled: boolean;
        pushMinSeverity: NotificationPreferenceRecord["pushMinSeverity"];
        emailMinSeverity: NotificationPreferenceRecord["emailMinSeverity"];
        mutedRuleKeys?: NotificationPreferenceRecord["mutedRuleKeys"];
        categories?: Partial<Record<NotificationCategory, { push?: boolean; email?: boolean }>>;
        quietHours?: { start: string; end: string; timezone: string } | null;
      },
    ) {
      const cur = await prefsOf(ctx.userId);
      if (r.mutedRuleKeys?.some((k) => !k)) throw new AppError("VALIDATION_FAILED", "Unknown rule");
      if (r.quietHours) {
        try {
          new Intl.DateTimeFormat("en", { timeZone: r.quietHours.timezone });
        } catch {
          throw new AppError("VALIDATION_FAILED", "Unknown time zone", [{ path: "quietHours.timezone", message: "Unknown time zone" }]);
        }
      }
      const { categories, quietHours, ...rest } = r;
      await repos.notificationPreferences.put({
        ...cur,
        ...rest,
        ...(r.mutedRuleKeys ? {} : { mutedRuleKeys: undefined }),
        categories: categories === undefined ? cur.categories : { ...(cur.categories ?? {}), ...categories },
        quietHours: quietHours === undefined ? cur.quietHours : (quietHours ?? undefined),
        updatedAt: clock.now(),
      });
      return preferencesView(ctx.userId);
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
