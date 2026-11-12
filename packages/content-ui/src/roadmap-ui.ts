import type { RoadmapStatus, RoadmapItemStatus, RoadmapPriority } from "@jas/content-core";

export const ROADMAP_STATUS_BADGE_CONFIG: Record<RoadmapStatus, { label: string; className: string; dotClassName: string }> = {
  active: {
    label: "进行中",
    className: "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
    dotClassName: "bg-[var(--color-primary)]",
  },
  completed: {
    label: "已完成",
    className: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
    dotClassName: "bg-[var(--color-success)]",
  },
  paused: {
    label: "已暂停",
    className: "bg-[var(--color-surface-dark)] text-[var(--color-text-muted)]",
    dotClassName: "bg-[var(--color-text-subtle)]",
  },
};

export const ROADMAP_ITEM_STATUS_BADGE_CONFIG: Record<RoadmapItemStatus, { label: string; className: string; dotClassName: string }> = {
  todo: { label: "待开始", className: "bg-[var(--color-surface-dark)] text-[var(--color-text-muted)]", dotClassName: "bg-[var(--color-border)]" },
  in_progress: { label: "进行中", className: "bg-[var(--color-primary)] text-[var(--color-on-primary)]", dotClassName: "bg-[var(--color-primary)]" },
  done: { label: "已完成", className: "bg-[var(--color-success-bg)] text-[var(--color-success)]", dotClassName: "bg-[var(--color-success)]" },
};

export const ROADMAP_PRIORITY_CONFIG: Record<RoadmapPriority, { className: string; label: string }> = {
  high: { className: "bg-[var(--color-primary)]", label: "高" },
  medium: { className: "bg-[var(--color-secondary)]", label: "中" },
  low: { className: "bg-[var(--color-text-subtle)]", label: "低" },
};
