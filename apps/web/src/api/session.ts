/**
 * The signed-in session's access token, kept in memory only (never localStorage, so it is not readable by injected
 * scripts after a reload). The sign-in screen sets it; requests read it.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}
