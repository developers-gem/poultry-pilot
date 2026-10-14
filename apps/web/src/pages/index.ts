import { lazyRouteComponent } from "@tanstack/react-router";
import type { ComponentType } from "react";

/**
 * Every signed-in route, at the prototype's paths. Each screen is its own chunk, loaded when first visited (and
 * prefetched on hover), so phones download only what they open.
 */
export const pages: Record<string, ComponentType> = {
  "/dashboard": lazyRouteComponent(() => import("./Dashboard"), "DashboardPage"),
  "/flocks": lazyRouteComponent(() => import("./Flocks"), "FlocksPage"),
  "/lifecycle": lazyRouteComponent(() => import("./Lifecycle"), "LifecyclePage"),
  "/weights": lazyRouteComponent(() => import("./Weights"), "WeightsPage"),
  "/chicks": lazyRouteComponent(() => import("./Chicks"), "ChicksPage"),
  "/hatchery": lazyRouteComponent(() => import("./Hatchery"), "HatcheryPage"),
  "/eggs": lazyRouteComponent(() => import("./Eggs"), "EggsPage"),
  "/feed": lazyRouteComponent(() => import("./Feed"), "FeedPage"),
  "/health": lazyRouteComponent(() => import("./Health"), "HealthPage"),
  "/biosecurity": lazyRouteComponent(() => import("./Biosecurity"), "BiosecurityPage"),
  "/calendar": lazyRouteComponent(() => import("./Calendar"), "CalendarPage"),
  "/weather": lazyRouteComponent(() => import("./Weather"), "WeatherPage"),
  "/money": lazyRouteComponent(() => import("./Money"), "MoneyPage"),
  "/expenses": lazyRouteComponent(() => import("./Expenses"), "ExpensesPage"),
  "/market": lazyRouteComponent(() => import("./Market"), "MarketPage"),
  "/training": lazyRouteComponent(() => import("./Training"), "TrainingPage"),
  "/facts": lazyRouteComponent(() => import("./Facts"), "FactsPage"),
  "/news": lazyRouteComponent(() => import("./News"), "NewsPage"),
  "/glossary": lazyRouteComponent(() => import("./Glossary"), "GlossaryPage"),
  "/farm-profile": lazyRouteComponent(() => import("./FarmProfile"), "FarmProfilePage"),
  "/alerts": lazyRouteComponent(() => import("./Alerts"), "AlertsPage"),
};
