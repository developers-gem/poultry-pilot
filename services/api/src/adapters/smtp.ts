import nodemailer from "nodemailer";
import type { Logger } from "pino";
import type { EmailMessage, EmailSender } from "../ports/external.js";

/**
 * Email over SMTP (any provider: SES, SendGrid, Postmark, Mailgun, a mail server). SMTP_URL carries the server and
 * credentials, e.g. smtps://user:password@smtp.example.com:465. Failures throw (notification emails are retried).
 */
export function smtpEmailSender(cfg: { url: string; from: string }, transport = nodemailer.createTransport(cfg.url)): EmailSender {
  return {
    async send(m: EmailMessage) {
      await transport.sendMail({ from: cfg.from, to: m.to, subject: m.subject, text: m.text });
    },
  };
}

/**
 * For sign-in emails (reset, verification, invitations, security notices): a failure is logged, never surfaced.
 * Otherwise "forgot password" would answer differently for real accounts when mail is down (account
 * enumeration), and a password change would look failed because its courtesy email failed. The person can retry.
 */
export function bestEffortEmail(inner: EmailSender, logger: Logger): EmailSender {
  return {
    async send(m: EmailMessage) {
      try {
        await inner.send(m);
      } catch (err) {
        logger.error({ err, kind: m.kind }, "email could not be sent"); // address and token are not logged
      }
    },
  };
}
