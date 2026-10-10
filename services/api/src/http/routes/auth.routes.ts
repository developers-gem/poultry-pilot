import {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "@poultrypilot/validation";
import { Router, type Request, type RequestHandler } from "express";
import type { AuthService, ClientMeta } from "../../services/auth.service.js";
import { authenticate, authenticateOptional, validate } from "../middleware/core.js";

export const clientMeta = (req: Request): ClientMeta => ({
  requestId: req.requestId,
  ...(req.header("user-agent") ? { userAgent: req.header("user-agent")! } : {}),
  ...(req.ip ? { ip: req.ip } : {}),
  ...((req.body as { device?: ClientMeta["device"] } | undefined)?.device ? { device: (req.body as { device: ClientMeta["device"] }).device } : {}),
});

/**
 * /api/v1/auth — public endpoints are rate limited per IP (`limiter`); password checks are additionally
 * limited per account by the lockout in AuthService.login.
 */
export function authRoutes(auth: AuthService, limiter: RequestHandler): Router {
  const r = Router();
  const authed = authenticate(auth);

  r.post("/register", limiter, validate("body", RegisterRequest), async (req, res) => {
    res.status(201).json(await auth.register(req.body, clientMeta(req)));
  });
  r.post("/verify-email", limiter, validate("body", VerifyEmailRequest), async (req, res) => {
    res.json({ user: await auth.verifyEmail(req.body.token, clientMeta(req)) });
  });
  r.post("/resend-verification", limiter, authed, async (req, res) => {
    res.status(202).json(await auth.resendVerification(req.auth!.userId));
  });
  r.post("/login", limiter, validate("body", LoginRequest), async (req, res) => {
    res.json(await auth.login(req.body.email, req.body.password, clientMeta(req)));
  });
  r.post("/google", limiter, validate("body", GoogleLoginRequest), async (req, res) => {
    res.json(await auth.loginWithGoogle(req.body.idToken, clientMeta(req)));
  });
  r.post("/refresh", limiter, validate("body", RefreshRequest), async (req, res) => {
    res.json(await auth.refresh(req.body.refreshToken, clientMeta(req)));
  });
  r.post("/logout", authenticateOptional(auth), validate("body", LogoutRequest), async (req, res) => {
    await auth.logout({ ...(req.body.refreshToken ? { refreshToken: req.body.refreshToken } : {}), ...(req.auth ? { principal: req.auth } : {}) }, clientMeta(req));
    res.status(204).end();
  });
  r.post("/forgot-password", limiter, validate("body", ForgotPasswordRequest), async (req, res) => {
    await auth.forgotPassword(req.body.email);
    res.status(202).json({ message: "If an account exists for that email, a reset link has been sent." });
  });
  r.post("/reset-password", limiter, validate("body", ResetPasswordRequest), async (req, res) => {
    await auth.resetPassword(req.body.token, req.body.newPassword, clientMeta(req));
    res.status(204).end();
  });
  r.post("/change-password", limiter, authed, validate("body", ChangePasswordRequest), async (req, res) => {
    res.json(await auth.changePassword(req.auth!, req.body.currentPassword, req.body.newPassword, clientMeta(req)));
  });
  return r;
}
