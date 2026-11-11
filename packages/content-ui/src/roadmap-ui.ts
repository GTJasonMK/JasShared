import type { RoadmapStatus, RoadmapItemStatus, RoadmapPriority } from "@jas/content-core";

export const ROADMAP_STATUS_BADGE_CONFIG: Record<RoadmapStatus, { label: string; className: string; dotClassName: string }> = {
  active: {
    label: "进行中",
    className: "bg-[var(--color-vermilion)] text-white",
    dotClassName: "bg-[var(--color-vermilion)]",
  },
  completed: {
    label: "已完成",
    className: "bg-green-100 text-green-700",
    dotClassName: "bg-green-500",
  },
  paused: {
    label: "已暂停",
    className: "bg-gray-100 text-gray-600",
    dotClassName: "bg-gray-400",
  },
};

export const ROADMAP_ITEM_STATUS_BADGE_CONFIG: Record<RoadmapItemStatus, { label: string; className: string; dotClassName: string }> = {
  todo: { label: "待开始", className: "bg-gray-100 text-gray-600", dotClassName: "bg-gray-300" },
  in_progress: { label: "进行中", className: "bg-[var(--color-vermilion)] text-white", dotClassName: "bg-[var(--color-vermilion)]" },
  done: { label: "已完成", className: "bg-green-100 text-green-700", dotClassName: "bg-green-500" },
};

export const ROADMAP_PRIORITY_CONFIG: Record<RoadmapPriority, { className: string; label: string }> = {
  high: { className: "bg-[var(--color-vermilion)]", label: "高" },
  medium: { className: "bg-[var(--color-gold)]", label: "中" },
  low: { className: "bg-gray-300", label: "低" },
};
