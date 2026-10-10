/** Outbound ports. Real adapters live in adapters/; tests use fakes. */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  kind: "password_reset" | "password_changed" | "farm_invite" | "email_verification";
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
