"use client";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { KnowledgeNodeData } from "@jas/graph-core";
import { NodeCard } from "./NodeCard";

function KnowledgeNode({ data, selected }: { data: KnowledgeNodeData; selected?: boolean }) {
  const handleStyle = { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, transform: 'none', background: 'transparent', border: 'none', borderRadius: '50%' } as const;
  return <div className="relative group">
    <NodeCard data={data} style={selected ? { borderColor: "#c94043", boxShadow: "0 0 0 3px rgba(201,64,67,0.15)" } : undefined} />
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 group-hover:bg-[var(--color-vermilion)]/30 group-hover:border-2 group-hover:border-[var(--color-vermilion)]">
      <div className="w-3 h-3 rounded-full bg-[var(--color-vermilion)] group-hover:animate-pulse" />
      <Handle type="source" position={Position.Right} id="center" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="center-target" style={handleStyle} />
    </div>
  </div>;
}
export default memo(KnowledgeNode);
