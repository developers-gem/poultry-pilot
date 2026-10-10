export interface DependencyStatus {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

export type DependencyCheck = (timeoutMs?: number) => Promise<DependencyStatus>;

export interface HealthChecks {
  mongodb: DependencyCheck;
}
