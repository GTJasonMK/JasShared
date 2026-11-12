"use client";
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { KnowledgeNodeData } from "@jas/graph-core";
import { NodeCard } from "./NodeCard";

function KnowledgeNode({ data, selected }: { data: KnowledgeNodeData; selected?: boolean }) {
  const handleStyle = { position: 'absolute', width: 1, height: 1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none', border: 'none' } as const;
  return <div className="relative">
    <NodeCard data={data} style={selected ? { borderColor: "var(--color-primary)", boxShadow: "0 0 0 3px var(--color-primary-light)" } : undefined} />
    <Handle type="source" position={Position.Right} id="center" style={handleStyle} isConnectable={false} />
    <Handle type="target" position={Position.Left} id="center-target" style={handleStyle} isConnectable={false} />
  </div>;
}
export default memo(KnowledgeNode);
