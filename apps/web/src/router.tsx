import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell, NotFound } from "./components/AppShell";
import { News } from "./pages/News";
import { SystemStatus } from "./pages/SystemStatus";

const root = createRootRoute({ component: AppShell, notFoundComponent: NotFound });
const index = createRoute({ getParentRoute: () => root, path: "/", component: SystemStatus });
const news = createRoute({ getParentRoute: () => root, path: "/news", component: News });

export const router = createRouter({ routeTree: root.addChildren([index, news]), defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
