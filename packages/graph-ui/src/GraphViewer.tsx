"use client";

import { type ReactNode, useEffect, useState } from "react";
import { type Node } from "@xyflow/react";
import GraphCanvas from "./GraphCanvas";
import NodeDetailPanel from "./NodeDetailPanel";
import { type GraphData } from "@jas/graph-core";

interface GraphViewerProps {
  data: GraphData;
}

function OverlayCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm">
      <span className="text-[var(--color-text-muted)]">{children}</span>
    </div>
  );
}

function GraphViewerOverlay({
  data,
  selectedNode,
  showMinimap,
  onToggleMinimap,
}: {
  data: GraphData;
  selectedNode: Node | null;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}) {
  return (
    <>
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <OverlayCard>
          {data.nodes.length} 个节点 · {data.edges.length} 条连接
        </OverlayCard>
        {selectedNode ? null : <OverlayCard>点击节点查看详情</OverlayCard>}
      </div>
      <button
        onClick={onToggleMinimap}
        className="absolute bottom-4 right-4 bg-[var(--color-surface)] rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm z-10 hover:bg-[var(--color-surface-hover)] transition-colors min-h-11"
        title={showMinimap ? "隐藏小地图" : "显示小地图"}
      >
        <span className="text-[var(--color-text-muted)]">
          {showMinimap ? "隐藏地图" : "显示地图"}
        </span>
      </button>
    </>
  );
}

export default function GraphViewer({ data }: GraphViewerProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);

  useEffect(() => {
    setSelectedNode((current) => {
      if (!current) return null;
      const nextSelected = data.nodes.find((node) => node.id === current.id);
      return nextSelected ? (nextSelected as Node) : null;
    });
  }, [data.nodes]);

  return (
    <div className="jas-graph graph-viewer"><div className="graph-viewer-layout">
      <div className="graph-viewer-canvas relative min-w-0 min-h-[320px] h-[600px] rounded-lg overflow-hidden border border-[var(--color-border)]">
        <GraphCanvas
          data={data}
          selectedNode={selectedNode}
          onNodeSelect={setSelectedNode}
          showMinimap={showMinimap}
        />
        <GraphViewerOverlay
          data={data}
          selectedNode={selectedNode}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
        />
      </div>

      {selectedNode ? (
        <div className="graph-viewer-details rounded-lg overflow-hidden border border-[var(--color-border)]">
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      ) : null}
    </div></div>
  );
}
