import { useQueries } from "@tanstack/react-query";
import { useFarm } from "./auth";
import { authedRequest } from "./client";
import { useFarmQuery } from "./hooks";
import { todayIn } from "../lib/format";

export interface FarmView {
  id: string;
  name: string;
  description?: string;
  countryCode?: string;
  locationLabel?: string;
  location?: { lat: number; lng: number };
  settings: { timezone: string; currency: string; unitSystem: string; workerEditWindowDays: number; visitorDowntimeHours?: number };
  version: number;
  myRole: string;
}

/** The farm's settings (currency, time zone) and today's date there. */
export function useFarmInfo() {
  const q = useFarmQuery<FarmView>("");
  const currency = q.data?.settings.currency ?? "USD";
  const timezone = q.data?.settings.timezone;
  return { farm: q.data, query: q, currency, today: todayIn(timezone), timezone };
}

export interface FlockMetrics {
  ageDays: number | null;
  birdsIn: number;
  currentBirdCount: number;
  mortalityCount: number;
  mortalityRate: number | null;
  survivalRate: number | null;
  averageWeightG: number | null;
  latestWeighingDate: string | null;
  dailyWeightGainG: number | null;
  recentDailyWeightGainG: number | null;
  feedConsumedKg: number;
  feedWastedKg: number;
  feedPerBirdKg: number | null;
  feedCostMinor: number;
  feedCostPerBirdMinor: number | null;
  feedCostPerEggMinor: number | null;
  eggsCollected: number;
  liveWeightKg: number | null;
  weightProducedKg: number | null;
  fcr: number | null;
  revenueMinor: number;
  cost: { chickMinor: number; feedMinor: number; otherMinor: number; totalMinor: number } & Record<string, number>;
  profitMinor: number;
  marginPercent: number | null;
  projectedProfitMinor: number | null;
  costPerBirdMinor: number | null;
  costPerKgProducedMinor: number | null;
  costsComplete: boolean;
  stage: string;
  currency: string;
}

export interface Flock {
  id: string;
  houseId: string;
  name: string;
  flockCode: string;
  type: string;
  breed?: string;
  hatchDate?: string;
  placementDate?: string;
  placementCount?: number;
  chickCost?: { amountMinor: number; currency: string };
  status: "planned" | "active" | "closed" | "archived";
  currentBirdCount?: number;
  closedDate?: string;
  version: number;
  metrics?: FlockMetrics;
}

export const useFlocks = (status?: string) => useFarmQuery<{ items: Flock[] }>(`/flocks${status ? `?status=${status}` : ""}`);

/** Flock details with metrics, for a list of flocks (one request each, cached per flock). */
export function useFlockDetails(ids: string[]) {
  const farm = useFarm();
  return useQueries({
    queries: ids.map((id) => ({ queryKey: ["farm", farm.farmId, `/flocks/${id}`], queryFn: () => authedRequest<Flock & { metrics: FlockMetrics }>(`/farms/${farm.farmId}/flocks/${id}`) })),
  });
}

export const LAYING = new Set(["layer", "breeder", "custom"]);
