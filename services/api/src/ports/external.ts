/** Outbound ports. Real adapters live in adapters/; tests use fakes. */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  kind: "password_reset" | "password_changed" | "farm_invite" | "email_verification" | "notification";
  /** Raw token, for adapters that template links. Never logged. */
  token?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface GoogleTokenVerifier {
  verify(idToken: string): Promise<GoogleIdentity>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

/** Object storage for uploaded photos. Local disk in development, S3-compatible storage in production. */
export interface MediaStorage {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ bytes: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

// ---- notifications ----------------------------------------------------------------

/** One message to one person on one channel. Providers turn it into an email, a push, or a stored in-app item. */
export interface NotificationMessage {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical";
  link?: { entity?: string; id?: string; path?: string };
  /** Filled in by the dispatcher for the channel: the address or the device tokens. */
  email?: string;
  pushTokens?: string[];
}

/**
 * A replaceable delivery provider for one channel (e.g. SMTP or an email API for "email"; FCM/APNs for "push").
 * Throws on a failure worth retrying; reports tokens the provider says are no longer valid.
 */
export interface NotificationProvider {
  channel: "push" | "email";
  name: string;
  send(message: NotificationMessage): Promise<{ providerMessageId?: string; invalidTokens?: string[] }>;
}

// ---- weather ----------------------------------------------------------------------

export interface ProviderDay {
  date: string;
  tempMaxC?: number;
  tempMinC?: number;
  rainMm?: number;
  windMaxKph?: number;
  humidityMaxPercent?: number;
  humidityMinPercent?: number;
}

export interface WeatherReport {
  current: { observedAt: string; temperatureC?: number; humidityPercent?: number; rainMm?: number; windKph?: number };
  /** Days before today (observed) and from today on (forecast), in the location's time zone. */
  daily: ProviderDay[];
  today: string;
}

/** A replaceable weather source. Only the backend calls it; clients never do. */
export interface WeatherProvider {
  name: string;
  fetch(lat: number, lng: number, opts: { forecastDays: number; pastDays: number }): Promise<WeatherReport>;
}
