import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest, authedRequest, refreshSession, setSignedOutHandler } from "./client";
import { getRefreshToken, getSelectedFarm, setSelectedFarm, setTokens } from "./session";

export interface Membership {
  membershipId: string;
  farmId: string;
  farmName: string;
  role: string;
  permissions: string[];
}
export interface Me {
  user: { id: string; email: string; fullName: string; phone?: string; emailVerified: boolean; hasPassword: boolean; googleLinked: boolean; platformRoles?: string[] };
  memberships: Membership[];
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  status: "loading" | "signedOut" | "signedIn";
  me: Me | null;
  /** The farm being worked on (remembered per device). */
  farm: Membership | null;
  selectFarm(id: string): void;
  can(permission: string): boolean;
  login(email: string, password: string): Promise<void>;
  register(r: { email: string; password: string; fullName: string; farm: { name: string; timezone: string; currency: string; countryCode?: string } }): Promise<void>;
  google(idToken: string): Promise<void>;
  logout(): Promise<void>;
  reload(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [farmId, setFarmId] = useState<string | null>(getSelectedFarm());

  const signedOut = useCallback(() => {
    setTokens(null);
    setMe(null);
    setStatus("signedOut");
    qc.clear();
  }, [qc]);

  const loadMe = useCallback(async () => {
    const m = await authedRequest<Me>("/me");
    setMe(m);
    setFarmId((cur) => {
      const keep = cur && m.memberships.some((x) => x.farmId === cur) ? cur : (m.memberships[0]?.farmId ?? null);
      setSelectedFarm(keep);
      return keep;
    });
    setStatus("signedIn");
  }, []);

  useEffect(() => {
    setSignedOutHandler(signedOut);
    if (!getRefreshToken()) {
      setStatus("signedOut");
      return;
    }
    refreshSession()
      .then((ok) => (ok ? loadMe() : getRefreshToken() ? loadMe() : signedOut()))
      .catch(() => (getRefreshToken() ? setStatus("signedIn") : signedOut()));
  }, [loadMe, signedOut]);

  const startSession = useCallback(
    async (tokens: Tokens) => {
      setTokens(tokens);
      qc.clear();
      await loadMe();
    },
    [loadMe, qc],
  );

  const value = useMemo<AuthState>(() => {
    const farm = me?.memberships.find((m) => m.farmId === farmId) ?? null;
    return {
      status,
      me,
      farm,
      selectFarm(id) {
        setSelectedFarm(id);
        setFarmId(id);
      },
      can: (p) => !!farm?.permissions.includes(p),
      async login(email, password) {
        const r = await apiRequest<{ tokens: Tokens }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        await startSession(r.data.tokens);
      },
      async register(body) {
        const r = await apiRequest<{ tokens: Tokens }>("/auth/register", { method: "POST", body: JSON.stringify(body) });
        await startSession(r.data.tokens);
      },
      async google(idToken) {
        const r = await apiRequest<{ tokens: Tokens }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) });
        await startSession(r.data.tokens);
      },
      async logout() {
        const refreshToken = getRefreshToken();
        await authedRequest("/auth/logout", { method: "POST", body: JSON.stringify(refreshToken ? { refreshToken } : {}) }).catch(() => undefined);
        signedOut();
      },
      reload: loadMe,
    };
  }, [status, me, farmId, startSession, signedOut, loadMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

/** The current farm; screens under the signed-in shell can rely on it. */
export function useFarm(): Membership {
  const { farm } = useAuth();
  if (!farm) throw new Error("No farm selected");
  return farm;
}
