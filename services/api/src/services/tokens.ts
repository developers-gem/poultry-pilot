import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { AppError } from "../lib/errors.js";
import { newId } from "../lib/util.js";

export interface AccessTokenConfig {
  secret: string;
  issuer: string;
  ttlSeconds: number;
}

export interface AccessClaims {
  sub: string;
  /** Session id; checked on every request so a revoked session stops working immediately. */
  sid: string;
  jti: string;
}

export function createAccessTokens(cfg: AccessTokenConfig) {
  const key = new TextEncoder().encode(cfg.secret);
  return {
    async sign(userId: string, sessionId: string, now: Date): Promise<{ token: string; expiresAt: Date }> {
      const iat = Math.floor(now.getTime() / 1000);
      const exp = iat + cfg.ttlSeconds;
      const token = await new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(userId)
        .setJti(newId())
        .setIssuer(cfg.issuer)
        .setAudience("poultrypilot")
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .sign(key);
      return { token, expiresAt: new Date(exp * 1000) };
    },
    async verify(token: string, now?: Date): Promise<AccessClaims> {
      try {
        const { payload } = await jwtVerify(token, key, {
          issuer: cfg.issuer,
          audience: "poultrypilot",
          algorithms: ["HS256"],
          ...(now ? { currentDate: now } : {}),
        });
        const sid = payload["sid"];
        if (!payload.sub || !payload.jti || typeof sid !== "string") throw new AppError("UNAUTHENTICATED", "Invalid access token");
        return { sub: payload.sub, sid, jti: payload.jti };
      } catch (e) {
        if (e instanceof joseErrors.JWTExpired) throw new AppError("TOKEN_EXPIRED", "Access token expired");
        if (e instanceof AppError) throw e;
        throw new AppError("UNAUTHENTICATED", "Invalid access token");
      }
    },
  };
}

export type AccessTokens = ReturnType<typeof createAccessTokens>;
