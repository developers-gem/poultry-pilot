import type { FarmContext } from "../services/context.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      /** Set by authenticate: the signed-in user and the session (device) the token belongs to. */
      auth?: { userId: string; sessionId: string };
      /** Set by requireFarm: the caller's active membership on the farm in the URL. */
      farmCtx?: FarmContext;
      /** Set by requireFarmResource: records loaded from the caller's farm, keyed by name. */
      resources?: Record<string, unknown>;
    }
  }
}

export {};
