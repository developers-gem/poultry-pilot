import type { Logger } from "pino";
import type { EmailSender, NotificationMessage, NotificationProvider } from "../ports/external.js";

/** Email notifications through whatever EmailSender is configured (log in development, an email service in production). */
export function emailNotificationProvider(email: EmailSender): NotificationProvider {
  return {
    channel: "email",
    name: "email-sender",
    async send(m) {
      if (!m.email) throw Object.assign(new Error("No email address"), { retryable: false });
      await email.send({ to: m.email, subject: m.title, text: `${m.body}${m.link?.path ? `\n\nOpen in PoultryPilot: ${m.link.path}` : ""}`, kind: "notification" });
      return {};
    },
  };
}

/** Development push provider: logs what would be sent. Replace with an FCM/APNs adapter behind the same port. */
export function logPushProvider(logger: Logger): NotificationProvider {
  return {
    channel: "push",
    name: "log",
    async send(m) {
      logger.info({ notificationId: m.notificationId, userId: m.userId, devices: m.pushTokens?.length ?? 0, title: m.title }, "push (log provider)");
      return {};
    },
  };
}

/** Test provider: records messages; can be told to fail or to report invalid tokens. */
export function recordingProvider(channel: "push" | "email"): NotificationProvider & { sent: NotificationMessage[]; failTimes: number; invalid: string[] } {
  const p = {
    channel,
    name: `recording-${channel}`,
    sent: [] as NotificationMessage[],
    failTimes: 0,
    invalid: [] as string[],
    async send(m: NotificationMessage) {
      if (p.failTimes > 0) {
        p.failTimes--;
        throw new Error(`${channel} provider unavailable`);
      }
      p.sent.push(m);
      return { providerMessageId: `${channel}-${p.sent.length}`, ...(p.invalid.length ? { invalidTokens: p.invalid } : {}) };
    },
  };
  return p;
}
