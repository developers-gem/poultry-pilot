import {
  GoogleLoginRequest,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  RefreshRequest,
  RegisterRequest,
} from "@poultrypilot/contracts";
import { Router, type Request, type RequestHandler } from "express";
import type { AuthService } from "../../services/auth.service.js";
import type { AccessTokens } from "../../services/tokens.js";
import { authenticate, validate } from "../middleware/core.js";

const meta = (req: Request) => ({
  requestId: req.requestId,
  ...(req.header("user-agent") ? { userAgent: req.header("user-agent")! } : {}),
  ...(req.ip ? { ip: req.ip } : {}),
});

export function authRoutes(auth: AuthService, tokens: AccessTokens, limiter: RequestHandler): Router {
  const r = Router();
  r.post("/register", limiter, validate("body", RegisterRequest), async (req, res) => {
    res.status(201).json(await auth.register(req.body, meta(req)));
  });
  r.post("/login", limiter, validate("body", LoginRequest), async (req, res) => {
    res.json(await auth.login(req.body.email, req.body.password, meta(req)));
  });
  r.post("/google", limiter, validate("body", GoogleLoginRequest), async (req, res) => {
    res.json(await auth.loginWithGoogle(req.body.idToken, meta(req)));
  });
  r.post("/refresh", limiter, validate("body", RefreshRequest), async (req, res) => {
    res.json(await auth.refresh(req.body.refreshToken, meta(req)));
  });
  r.post("/logout", validate("body", RefreshRequest), async (req, res) => {
    await auth.logout(req.body.refreshToken);
    res.status(204).end();
  });
  r.post("/password-reset", limiter, validate("body", PasswordResetRequest), async (req, res) => {
    await auth.requestPasswordReset(req.body.email);
    res.status(202).json({ message: "If an account exists for that email, a reset link has been sent." });
  });
  r.post("/password-reset/confirm", limiter, validate("body", PasswordResetConfirm), async (req, res) => {
    await auth.confirmPasswordReset(req.body.token, req.body.newPassword, meta(req));
    res.status(204).end();
  });
  r.get("/me", authenticate(tokens), async (req, res) => {
    res.json(await auth.me(req.auth!.userId));
  });
  return r;
}
