/**
 * The signed-in session on this device.
 *  - The access token (15 minutes) lives in memory only.
 *  - The refresh token lives in localStorage so a reload keeps you signed in. The API rotates it on every use and
 *    revokes the session if an old one is replayed, which limits the damage if it is ever stolen.
 *  - The chosen farm is remembered per device.
 */
const REFRESH_KEY = "poultrypilot.refresh";
const FARM_KEY = "poultrypilot.farm";

let accessToken: string | null = null;

const store = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function getRefreshToken(): string | null {
  return store()?.getItem(REFRESH_KEY) ?? null;
}
export function setTokens(t: { accessToken: string; refreshToken: string } | null): void {
  accessToken = t?.accessToken ?? null;
  if (t) store()?.setItem(REFRESH_KEY, t.refreshToken);
  else store()?.removeItem(REFRESH_KEY);
}
export function getSelectedFarm(): string | null {
  return store()?.getItem(FARM_KEY) ?? null;
}
export function setSelectedFarm(id: string | null): void {
  if (id) store()?.setItem(FARM_KEY, id);
  else store()?.removeItem(FARM_KEY);
}
