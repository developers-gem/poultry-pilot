import { createRootRoute, createRoute, createRouter, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import { useAuth } from "./api/auth";
import { AppShell } from "./components/AppShell";
import { Toaster } from "./components/toast";
import { Backdrop, LinkButton } from "./components/ui";
import { pages } from "./pages";
import { AuthPage } from "./pages/Auth";
import { CreateFarm } from "./pages/CreateFarm";
import { Landing } from "./pages/Landing";
import { SystemStatus } from "./pages/SystemStatus";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import DeleteAccount from "./pages/DeleteAccount";

function Root() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

function FullPageMessage({ title, body }: { title: string; body?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <Backdrop />
      <div className="prism-glass prism-edge relative z-10 rounded-2xl p-6 text-center" role="status">
        <p className="font-display text-lg font-semibold">{title}</p>
        {body ? <p className="mt-1 text-[13px] text-inksoft">{body}</p> : null}
      </div>
    </div>
  );
}

/** Signed-in area: waits for the session, sends visitors to sign in (and back afterwards), asks for a farm if needed. */
function SignedIn() {
  const { status, me, farm } = useAuth();
  const { pathname } = useLocation();
  if (status === "loading") return <FullPageMessage title="Opening your farm…" />;
  if (status === "signedOut") return <Navigate to="/auth" search={{ redirect: pathname }} replace />;
  if (me && !me.memberships.length) return <CreateFarm />;
  if (!farm) return <FullPageMessage title="Opening your farm…" />;
  return <AppShell />;
}

/** Any unexpected crash in a screen: say so plainly, offer a retry and a way back (never a blank or raw error page). */
function RouteError({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <Backdrop />
      <div role="alert" className="prism-glass prism-edge relative z-10 max-w-md rounded-2xl p-6 text-center">
        <p className="text-[12px] tracking-[0.2em] text-inksoft uppercase">Something broke</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">This screen couldn't load</h1>
        <p className="mt-2 text-[13px] text-inksoft">Your data is safe. Try again, or go back to the dashboard.</p>
        {import.meta.env?.DEV && error instanceof Error ? <p className="mt-3 rounded-lg bg-rose/10 p-2 text-left text-[11px] text-rose-ink">{error.message}</p> : null}
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={reset} className="rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white">Try again</button>
          <LinkButton to="/dashboard" variant="glass">Dashboard</LinkButton>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <Backdrop />
      <div className="prism-glass prism-edge relative z-10 max-w-md rounded-2xl p-6 text-center">
        <p className="text-[12px] tracking-[0.2em] text-inksoft uppercase">Not found</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">This page doesn't exist</h1>
        <div className="mt-5"><LinkButton to="/dashboard">Go to your dashboard</LinkButton></div>
      </div>
    </div>
  );
}

const root = createRootRoute({ component: Root, notFoundComponent: NotFound, errorComponent: RouteError });
const landing = createRoute({ getParentRoute: () => root, path: "/", component: Landing });
const auth = createRoute({ getParentRoute: () => root, path: "/auth", component: AuthPage });
const status = createRoute({ getParentRoute: () => root, path: "/status", component: SystemStatus });
const app = createRoute({ getParentRoute: () => root, id: "app", component: SignedIn });
const appRoutes = Object.entries(pages).map(([path, component]) => createRoute({ getParentRoute: () => app, path, component: component as () => JSX.Element }));
const privacyPolicy = createRoute({ getParentRoute: () => root, path: "/privacy-policy", component: PrivacyPolicy, });
const terms = createRoute({ getParentRoute: () => root, path: "/terms-and-conditions", component: TermsAndConditions, });
const deleteAccount = createRoute({ getParentRoute: () => root, path: "/delete",  component: DeleteAccount,});

export const router = createRouter({ routeTree: root.addChildren([landing, auth, status, privacyPolicy, terms, deleteAccount, app.addChildren(appRoutes)]), defaultPreload: "intent", scrollRestoration: true });

// Routes are built from the page registry, so links are checked by a test (every nav link resolves to a page)
// rather than by the router's path types.
