import { JWT } from "google-auth-library";
import type { NotificationMessage, NotificationProvider } from "../ports/external.js";

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** FCM error codes: the device is gone (disable it) or the failure is temporary (try that device again later). */
const GONE = new Set(["UNREGISTERED", "SENDER_ID_MISMATCH"]);
const TEMPORARY = new Set(["QUOTA_EXCEEDED", "UNAVAILABLE", "INTERNAL"]);

class FcmConfigError extends Error {
  readonly retryable = false;
}

/** The FCM v1 message for one device. The notification id is the collapse key, so a repeat replaces, never doubles. */
export function fcmMessage(m: NotificationMessage, token: string) {
  const critical = m.severity === "critical";
  const data = Object.fromEntries(
    Object.entries({ notificationId: m.notificationId, category: m.category, severity: m.severity, path: m.link?.path, entity: m.link?.entity, entityId: m.link?.id }).filter(([, v]) => typeof v === "string" && v.length > 0),
  ) as Record<string, string>;
  return {
    message: {
      token,
      notification: { title: m.title, body: m.body },
      data,
      android: {
        priority: critical || m.severity === "warning" ? "high" : "normal",
        collapse_key: m.notificationId,
        // The tag makes a repeat replace the shown notification instead of adding a second one.
        notification: { tag: m.notificationId },
      },
      apns: {
        headers: { "apns-collapse-id": m.notificationId.slice(0, 64), "apns-priority": critical || m.severity === "warning" ? "10" : "5" },
        payload: { aps: { "thread-id": m.category ?? "general", sound: "default" } },
      },
    },
  };
}

/**
 * Push through Firebase Cloud Messaging (HTTP v1), one request per device, results per device:
 * sent, try again later (quota, outage), gone (unregistered: the device is disabled) or dropped (a bad request
 * that would fail again; the device is not disabled). Credentials: a service account with the Firebase Messaging role.
 */
export function fcmPushProvider(cfg: FcmConfig, deps: { fetchImpl?: typeof fetch; accessToken?: () => Promise<string> } = {}): NotificationProvider {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const jwt = new JWT({ email: cfg.clientEmail, key: cfg.privateKey, scopes: ["https://www.googleapis.com/auth/firebase.messaging"] });
  const accessToken =
    deps.accessToken ??
    (async () => {
      const t = await jwt.getAccessToken();
      if (!t.token) throw new Error("Could not get an FCM access token");
      return t.token;
    });
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/messages:send`;

  return {
    channel: "push",
    name: "fcm",
    async send(m) {
      const token = await accessToken(); // a failure here is retried (thrown, retryable)
      const sentTokens: string[] = [];
      const retryTokens: string[] = [];
      const invalidTokens: string[] = [];
      let providerMessageId: string | undefined;
      for (const device of m.pushTokens ?? []) {
        let res: Response;
        try {
          res = await fetchImpl(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(fcmMessage(m, device)) });
        } catch {
          retryTokens.push(device); // network: try this device again later
          continue;
        }
        if (res.ok) {
          sentTokens.push(device);
          providerMessageId = ((await res.json().catch(() => ({}))) as { name?: string }).name ?? providerMessageId;
          continue;
        }
        const err = ((await res.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } }).error;
        const code = err?.details?.find((x) => x.errorCode)?.errorCode ?? err?.status ?? String(res.status);
        if (GONE.has(code) || res.status === 404) invalidTokens.push(device);
        else if (TEMPORARY.has(code) || res.status === 429 || res.status >= 500) retryTokens.push(device);
        else if (res.status === 401 || res.status === 403 || code === "THIRD_PARTY_AUTH_ERROR") throw new FcmConfigError(`FCM refused the credentials (${code}): check the service account and APNs key`);
        // Anything else (e.g. INVALID_ARGUMENT) would fail again: dropped for this device, which stays enabled.
      }
      return { sentTokens, retryTokens, invalidTokens, ...(providerMessageId ? { providerMessageId } : {}) };
    },
  };
}
