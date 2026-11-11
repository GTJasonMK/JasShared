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
    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm">
      <span className="text-[var(--color-gray)]">{children}</span>
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
        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm z-10 hover:bg-white transition-colors"
        title={showMinimap ? "隐藏小地图" : "显示小地图"}
      >
        <span className="text-[var(--color-gray)]">
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
    <div className="jas-graph flex flex-col gap-4 xl:flex-row">
      <div className="relative min-h-[320px] h-[600px] flex-1 rounded-lg overflow-hidden border border-[var(--color-border)]">
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
        <div className="w-full xl:w-[320px] flex-shrink-0 rounded-lg overflow-hidden border border-[var(--color-border)]">
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
