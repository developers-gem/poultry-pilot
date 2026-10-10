import { describe, expect, it } from "vitest";
import { argon2Hasher } from "../adapters/external.js";
import { bearer, farmInput, makeApp, register } from "./harness.js";

describe("auth", () => {
  it("health check is public", async () => {
    const { api } = makeApp();
    const res = await api().get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("registers a user with a first farm and owner permissions", async () => {
    const { api, store } = makeApp();
    const r = await register(api, "Asha@Example.com");
    expect(r.body.user.email).toBe("asha@example.com");
    expect(r.body.farm.settings).toMatchObject({ timezone: "Asia/Kolkata", currency: "INR", unitSystem: "metric" });
    expect(r.body.farm.myRole).toBe("owner");
    expect(r.body.farm.myPermissions).toContain("member.invite");
    expect(JSON.stringify(r.body)).not.toContain("passwordHash");
    const actions = store.audit.all().map((a) => a.action).sort();
    expect(actions).toEqual(["farm.created", "user.registered"]);
  });

  it("rejects duplicate email and invalid input with the error envelope", async () => {
    const { api } = makeApp();
    await register(api, "dup@example.com");
    const dup = await api().post("/api/v1/auth/register").send({ email: "DUP@example.com", password: "goodpass123", fullName: "X", farm: farmInput });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("EMAIL_TAKEN");

    const bad = await api()
      .post("/api/v1/auth/register")
      .send({ email: "a@b.co", password: "short", fullName: "X", farm: { ...farmInput, timezone: "Mars/Olympus", currency: "XXX1" } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_FAILED");
    expect(bad.body.error.requestId).toBeTruthy();
    const paths = bad.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["password", "farm.timezone", "farm.currency"]));
  });

  it("gives the same error for unknown email and wrong password", async () => {
    const { api } = makeApp();
    await register(api, "farmer@example.com");
    const wrong = await api().post("/api/v1/auth/login").send({ email: "farmer@example.com", password: "nope" });
    const unknown = await api().post("/api/v1/auth/login").send({ email: "ghost@example.com", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.body.error).toMatchObject({ code: wrong.body.error.code, message: wrong.body.error.message });
    const ok = await api().post("/api/v1/auth/login").send({ email: "farmer@example.com", password: "goodpass123" });
    expect(ok.status).toBe(200);
    const me = await api().get("/api/v1/auth/me").set(bearer(ok.body.tokens.accessToken));
    expect(me.body.email).toBe("farmer@example.com");
  });

  it("rotates refresh tokens and revokes the family when an old token is reused", async () => {
    const { api } = makeApp();
    const r = await register(api, "rotate@example.com");
    const first = await api().post("/api/v1/auth/refresh").send({ refreshToken: r.refresh });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(r.refresh);

    const reuse = await api().post("/api/v1/auth/refresh").send({ refreshToken: r.refresh });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("TOKEN_REUSED");

    const afterTheft = await api().post("/api/v1/auth/refresh").send({ refreshToken: first.body.refreshToken });
    expect(afterTheft.body.error.code).toBe("TOKEN_REUSED");
  });

  it("logout revokes the session", async () => {
    const { api } = makeApp();
    const r = await register(api, "bye@example.com");
    expect((await api().post("/api/v1/auth/logout").send({ refreshToken: r.refresh })).status).toBe(204);
    const res = await api().post("/api/v1/auth/refresh").send({ refreshToken: r.refresh });
    expect(res.status).toBe(401);
  });

  it("password reset does not reveal accounts, works once and signs out other sessions", async () => {
    const { api, email } = makeApp();
    const r = await register(api, "reset@example.com");
    const ghost = await api().post("/api/v1/auth/password-reset").send({ email: "ghost@example.com" });
    expect(ghost.status).toBe(202);
    expect(email.outbox).toHaveLength(0);

    await api().post("/api/v1/auth/password-reset").send({ email: "reset@example.com" });
    const token = email.outbox[0]!.token!;
    const confirm = await api().post("/api/v1/auth/password-reset/confirm").send({ token, newPassword: "newpass4567" });
    expect(confirm.status).toBe(204);
    expect((await api().post("/api/v1/auth/password-reset/confirm").send({ token, newPassword: "another999x" })).status).toBe(422);
    expect((await api().post("/api/v1/auth/refresh").send({ refreshToken: r.refresh })).status).toBe(401);
    expect((await api().post("/api/v1/auth/login").send({ email: "reset@example.com", password: "newpass4567" })).status).toBe(200);
  });

  it("requires a valid bearer token and rejects malformed JSON", async () => {
    const { api } = makeApp();
    const none = await api().get("/api/v1/farms");
    expect(none.status).toBe(401);
    expect(none.body.error.code).toBe("UNAUTHENTICATED");
    const forged = await api().get("/api/v1/farms").set(bearer("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad"));
    expect(forged.status).toBe(401);
    const badJson = await api().post("/api/v1/auth/login").set("Content-Type", "application/json").send("{not json");
    expect(badJson.status).toBe(400);
    expect(badJson.body.error.code).toBe("INVALID_JSON");
  });

  it("rate-limits auth endpoints", async () => {
    const { api } = makeApp({ rateLimit: 3 });
    for (let i = 0; i < 3; i++) await api().post("/api/v1/auth/login").send({ email: "x@example.com", password: "y" });
    const res = await api().post("/api/v1/auth/login").send({ email: "x@example.com", password: "y" });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });

  it("works with real Argon2id hashing", async () => {
    const { api, store } = makeApp({ hasher: argon2Hasher });
    await register(api, "argon@example.com");
    expect(store.users.all()[0]!.passwordHash).toMatch(/^\$argon2id\$/);
    expect((await api().post("/api/v1/auth/login").send({ email: "argon@example.com", password: "goodpass123" })).status).toBe(200);
    expect((await api().post("/api/v1/auth/login").send({ email: "argon@example.com", password: "wrongpass1" })).status).toBe(401);
  });
});
