import type { HealthResponse } from "@poultrypilot/types";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./client";

/** Polls GET /api/v1/health. A 503 still carries a health body, so it is data, not an error. */
export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiRequest<HealthResponse>("/health", { acceptStatuses: [503], timeoutMs: 8_000 }),
    refetchInterval: 15_000,
    retry: false,
  });
}
