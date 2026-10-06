import { hash, verify } from "@node-rs/argon2";
import { OAuth2Client } from "google-auth-library";
import type { Logger } from "pino";
import type { EmailMessage, EmailSender, GoogleTokenVerifier, PasswordHasher } from "../ports/external.js";

/** Argon2id with OWASP-recommended baseline parameters (19 MiB, 2 iterations). */
export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, algorithm: 2 }),
  verify: (h, password) => verify(h, password).catch(() => false),
};

/** Development email sender: logs that a message was sent, never the token. Replace with SES/SendGrid adapter. */
export function logEmailSender(logger: Logger): EmailSender {
  return {
    async send(m: EmailMessage) {
      logger.info({ to: m.to, kind: m.kind, subject: m.subject }, "email queued (dev sender)");
    },
  };
}

/** Collects messages in memory; used by tests to read invite and reset tokens. */
export function memoryEmailSender(): EmailSender & { outbox: EmailMessage[] } {
  const outbox: EmailMessage[] = [];
  return { outbox, async send(m) { outbox.push(m); } };
}

export function googleVerifier(clientIds: string[]): GoogleTokenVerifier {
  const client = new OAuth2Client();
  return {
    async verify(idToken) {
      const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email) throw new Error("Google token missing subject or email");
      return { sub: p.sub, email: p.email, emailVerified: p.email_verified === true, ...(p.name ? { name: p.name } : {}) };
    },
  };
}
