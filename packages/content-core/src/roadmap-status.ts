export type RoadmapStatus = "active" | "completed" | "paused";

export function normalizeRoadmapStatus(value: unknown): {
  status: RoadmapStatus;
  error?: string;
} {
  if (value === undefined || value === null || value === "") {
    return { status: "active" };
  }

  if (value === "active" || value === "completed" || value === "paused") {
    return { status: value };
  }

  return {
    status: "active",
    error: `roadmap status 非法：${String(value)}，已按 active 处理`,
  };
}
