import type { FarmContext } from "../services/context.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      auth?: { userId: string };
      farmCtx?: FarmContext;
    }
  }
}

export {};
