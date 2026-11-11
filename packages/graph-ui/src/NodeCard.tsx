"use client";
import type { CSSProperties } from "react";
import { getNodeColor, nodeColorConfig, type KnowledgeNodeData } from "@jas/graph-core";

export function NodeCard({ data, className = "", style }: { data: KnowledgeNodeData; className?: string; style?: CSSProperties }) {
  const color = nodeColorConfig[getNodeColor(data.color)];
  const lockScope = data.lockMode === "transitive" ? "所有子节点" : data.lockMode === "level" ? `前 ${Math.max(1, Math.floor(data.lockDepth || 1))} 级子节点` : "直接子节点";
  return <div className={`jas-graph relative px-4 py-3 rounded-xl border-2 min-w-[120px] max-w-[200px] transition-all duration-200 hover:shadow-md ${className}`} style={{ backgroundColor: color.bg, borderColor: color.border, ...style }}>
    <div className="font-semibold text-sm text-center select-none break-words" style={{ color: color.text }}>{data.label}</div>
    {data.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2 justify-center">{data.tags.slice(0, 3).map((tag, index) => <span key={`${tag}-${index}`} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium select-none break-all" style={{ backgroundColor: `${color.border}40`, color: color.text }}>{tag}</span>)}</div>}
    {data.color && data.color !== "default" && <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: color.border }} />}
    {data.locked && <div className="absolute top-1 left-1 w-4 h-4 flex items-center justify-center" style={{ color: "var(--color-vermilion, #b45309)" }} title={`已锁定：${lockScope}一起移动`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    </div>}
  </div>;
}
