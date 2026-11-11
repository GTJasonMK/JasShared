"use client";

import { memo } from "react";
import { EdgeLabelRenderer } from "@xyflow/react";
import { getEdgeStroke, type KnowledgeEdgeData } from "@jas/graph-core";

interface KnowledgeEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: React.CSSProperties;
  selected?: boolean;
  data?: KnowledgeEdgeData;
}

/**
 * 自定义中心连接边
 * 连线从源节点中心到目标节点中心，使用贝塞尔曲线
 */
function KnowledgeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  selected,
  data,
}: KnowledgeEdgeProps) {
  // 计算控制点，使曲线更自然
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 曲线弯曲程度与距离成正比，但有上限
  const curvature = Math.min(distance * 0.3, 80);

  // 根据相对位置决定曲线方向
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // 如果是横向连接，曲线向上/下弯曲；如果是纵向连接，曲线向左/右弯曲
  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  const controlX = isHorizontal ? midX : midX + (dy > 0 ? -curvature : curvature);
  const controlY = isHorizontal ? midY + (dx > 0 ? -curvature : curvature) : midY;

  // 构建贝塞尔曲线路径
  const path = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;

  // 计算标签位置（曲线中点）
  const labelX = (sourceX + 2 * controlX + targetX) / 4;
  const labelY = (sourceY + 2 * controlY + targetY) / 4;

  // 连线颜色
  const edgeColor = data?.color || "default";
  const strokeColor = (style.stroke as string) || getEdgeStroke(edgeColor);
  const selectedColor = selected ? "var(--color-vermilion)" : strokeColor;

  return (
    <>
      {/* 边路径 */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selectedColor,
          fill: "none",
        }}
      />

      {/* 点击区域（更宽，方便选中） */}
      <path
        d={path}
        style={{
          strokeWidth: 20,
          stroke: "transparent",
          fill: "none",
        }}
        className="react-flow__edge-interaction"
      />

      {/* 动画效果 - 流动的点 */}
      <circle r="3" fill={strokeColor}>
        <animateMotion dur="2s" repeatCount="indefinite" path={path} />
      </circle>

      {/* 边标签 */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-all duration-150
              ${selected
                ? "bg-[var(--color-vermilion)] text-white shadow-md"
                : "bg-white text-[var(--color-gray)] border border-[var(--color-border)] hover:border-[var(--color-vermilion)] hover:text-[var(--color-vermilion)]"
              }
            `}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(KnowledgeEdge);
