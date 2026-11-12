"use client";

import { useCallback, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  ConnectionMode,
} from "@xyflow/react";

import KnowledgeNode from "./KnowledgeNode";
import KnowledgeEdge from "./KnowledgeEdge";
import { getNodePalette } from "./nodePalette";
import {
  type GraphData,
  type KnowledgeNodeData,
  getEdgeStroke,
} from "@jas/graph-core";

// 自定义节点类型 - 使用类型断言绕过严格检查
const nodeTypes: NodeTypes = {
  knowledgeNode: KnowledgeNode as NodeTypes[string],
};

// 自定义边类型
const edgeTypes: EdgeTypes = {
  centerEdge: KnowledgeEdge as EdgeTypes[string],
};

interface GraphCanvasProps {
  data: GraphData;
  selectedNode: Node | null;
  onNodeSelect: (node: Node | null) => void;
  showMinimap?: boolean;
}

function GraphCanvasInner({ data, selectedNode, onNodeSelect, showMinimap = true }: GraphCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(data.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(data.edges as Edge[]);
  const { getViewport, setViewport } = useReactFlow();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedNodeId = selectedNode?.id ?? null;
    setNodes(
      data.nodes.map((node) => ({
        ...(node as Node),
        selected: node.id === selectedNodeId,
      }))
    );
    setEdges(data.edges as Edge[]);
  }, [data.edges, data.nodes, selectedNode?.id, setEdges, setNodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeSelect(node);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  useLayoutEffect(() => {
    const container = containerRef.current!;
    let width = container.getBoundingClientRect().width;
    // Track actual canvas width so opening details preserves the user's visible graph area.
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (width > 0 && next > 0 && next !== width) {
        const viewport = getViewport();
        const ratio = next / width;
        void setViewport({ x: viewport.x * ratio, y: viewport.y, zoom: viewport.zoom * ratio }, { duration: 0 });
      }
      width = next;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [getViewport, setViewport]);

  // MiniMap 节点颜色
  const nodeColor = useCallback((node: Node) => {
    const nodeData = node.data as KnowledgeNodeData;
    return getNodePalette(nodeData.color).bg;
  }, []);

  // 为节点添加类型
  const nodesWithType = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      type: "knowledgeNode",
    }));
  }, [nodes]);

  // 创建节点 ID 到节点数据的映射
  const nodeDataMap = useMemo(() => {
    const map = new Map<string, KnowledgeNodeData>();
    nodes.forEach((node) => {
      map.set(node.id, node.data as KnowledgeNodeData);
    });
    return map;
  }, [nodes]);

  // 为边添加类型和颜色
  const edgesWithType = useMemo(() => {
    return edges.map((edge) => {
      const sourceNodeData = nodeDataMap.get(edge.source);
      const edgeColor = sourceNodeData?.edgeColor || "default";
      const strokeColor = getEdgeStroke(edgeColor);

      return {
        ...edge,
        type: "centerEdge",
        data: {
          ...edge.data,
          label: edge.label || edge.data?.label,
          color: edgeColor,
        },
        style: {
          stroke: strokeColor,
        },
      };
    });
  }, [edges, nodeDataMap]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={nodesWithType}
        edges={edgesWithType}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll
        selectionOnDrag={false}
        className="bg-[var(--color-surface)]"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "centerEdge",
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--color-border)"
        />
        <Controls
          showInteractive={false}
          className="!bg-[var(--color-surface)] !border-[var(--color-border)] !shadow-md"
        />
        {showMinimap && (
          <MiniMap
            maskColor="color-mix(in srgb, var(--color-surface-dark) 70%, transparent)"
            nodeColor={nodeColor}
            nodeStrokeWidth={2}
            zoomable
            pannable
            className="!bg-[var(--color-surface)] !border-[var(--color-border)]"
          />
        )}
      </ReactFlow>
    </div>
  );
}

export default function GraphCanvas({ data, selectedNode, onNodeSelect, showMinimap }: GraphCanvasProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <GraphCanvasInner
          data={data}
          selectedNode={selectedNode}
          onNodeSelect={onNodeSelect}
          showMinimap={showMinimap}
        />
      </ReactFlowProvider>
    </div>
  );
}
