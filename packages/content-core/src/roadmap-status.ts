export type RoadmapStatus = "active" | "completed" | "paused";

export function normalizeRoadmapStatus(value: unknown): RoadmapStatus {
  if (value === undefined) return "active";
  if (value === "active" || value === "completed" || value === "paused") return value;
  throw new Error("status 必须为 active、completed 或 paused。");
}
