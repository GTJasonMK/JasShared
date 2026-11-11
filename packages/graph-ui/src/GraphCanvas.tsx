"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
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
import {
  type GraphData,
  type KnowledgeNodeData,
  NODE_COLORS,
  getEdgeStroke,
  getNodeColor,
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

  // 记录状态
  const containerRef = useRef<HTMLDivElement>(null);
  const prevSelectedRef = useRef<boolean>(false);
  const snapshotRef = useRef<{
    viewport: { x: number; y: number; zoom: number };
    width: number;
  } | null>(null);

  // 面板宽度 + 间距
  const PANEL_WIDTH = 320 + 16;

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

  // 处理节点点击 - 在状态变化前记录当前视口和宽度
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    snapshotRef.current = {
      viewport: getViewport(),
      width: containerRef.current?.offsetWidth || 0,
    };
    onNodeSelect(node);
  }, [onNodeSelect, getViewport]);

  // 处理画布点击（取消选择）- 同样记录当前状态
  const onPaneClick = useCallback(() => {
    snapshotRef.current = {
      viewport: getViewport(),
      width: containerRef.current?.offsetWidth || 0,
    };
    onNodeSelect(null);
  }, [onNodeSelect, getViewport]);

  // 当选中状态变化时，根据宽度比例调整视口
  useEffect(() => {
    const isSelected = selectedNode !== null;

    if (prevSelectedRef.current !== isSelected) {
      // 获取当前视口（DOM 更新后的状态）
      const currentViewport = getViewport();
      const newWidth = containerRef.current?.offsetWidth || 0;

      // 使用快照（如果有），否则根据面板宽度计算预期的旧宽度
      let oldViewport = snapshotRef.current?.viewport || currentViewport;
      let oldWidth = snapshotRef.current?.width;

      if (!oldWidth || oldWidth === 0) {
        // 快照不存在（如点击关闭按钮），计算预期的旧宽度
        // 面板打开时：旧宽度 = 新宽度 + 面板宽度
        // 面板关闭时：旧宽度 = 新宽度 - 面板宽度
        oldWidth = isSelected ? newWidth + PANEL_WIDTH : newWidth - PANEL_WIDTH;
      }

      // 延迟执行，等待 DOM 更新完成
      const timer = setTimeout(() => {
        if (oldWidth > 0 && newWidth > 0) {
          const ratio = newWidth / oldWidth;

          // 按宽度比例调整视口
          setViewport({
            x: oldViewport.x * ratio,
            y: oldViewport.y,
            zoom: oldViewport.zoom * ratio,
          }, { duration: 300 });
        }
      }, 50);

      prevSelectedRef.current = isSelected;
      snapshotRef.current = null; // 使用后清除快照
      return () => clearTimeout(timer);
    }
  }, [selectedNode, getViewport, setViewport, PANEL_WIDTH]);

  // MiniMap 节点颜色
  const nodeColor = useCallback((node: Node) => {
    const nodeData = node.data as KnowledgeNodeData;
    const color = getNodeColor(nodeData.color);
    return NODE_COLORS[color].bg;
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
        className="bg-[var(--color-paper)]"
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
          className="!bg-white !border-[var(--color-border)] !shadow-md"
        />
        {showMinimap && (
          <MiniMap
            nodeColor={nodeColor}
            nodeStrokeWidth={2}
            zoomable
            pannable
            className="!bg-white !border-[var(--color-border)]"
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
