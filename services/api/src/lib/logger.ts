import { pino, type Logger } from "pino";

/**
 * Structured JSON logs in production (one object per line, ready for any log pipeline);
 * human-readable output locally with LOG_FORMAT=pretty. Secrets are redacted at the source.
 */
export function createLogger(opts: { level: string; format: "json" | "pretty"; service?: string; version?: string }): Logger {
  return pino({
    level: opts.level,
    base: { service: opts.service ?? "poultrypilot-api", version: opts.version },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.newPassword",
        "*.refreshToken",
        "*.accessToken",
        "*.token",
        "*.idToken",
      ],
      censor: "[redacted]",
    },
    ...(opts.format === "pretty"
      ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service,version" } } }
      : {}),
  });
}
