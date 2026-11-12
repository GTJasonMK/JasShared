"use client";

import { useMemo } from "react";
import { type Node } from "@xyflow/react";
import { sanitizeHtml } from "./sanitize-html";
import { getNodePalette } from "./nodePalette";
import {
  type KnowledgeNodeData,
  EDGE_COLORS,
} from "@jas/graph-core";

interface NodeDetailPanelProps {
  node: Node;
  onClose: () => void;
}

export default function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const data = node.data as KnowledgeNodeData;
  const colorConfig = getNodePalette(data.color);
  const edgeColor = data.edgeColor;
  const edgeColorInfo = edgeColor ? EDGE_COLORS[edgeColor] : null;
  const rawContent = typeof data.content === "string" ? data.content : "";
  const sanitizedContent = useMemo(() => sanitizeHtml(rawContent), [rawContent]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)]">
      <div
        className="px-4 py-4 flex items-center justify-between shrink-0"
        style={{ backgroundColor: colorConfig.bg }}
      >
        <h3 className="font-semibold text-lg" style={{ color: colorConfig.text }}>
          {data.label}
        </h3>
        <button
          onClick={onClose}
          className="min-w-11 min-h-11 grid place-items-center rounded-lg hover:bg-black/10 transition-colors"
          title="关闭"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4L12 12M12 4L4 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {edgeColorInfo && (
          <div>
            <h4 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
              重要程度
            </h4>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: edgeColorInfo.stroke }}
              />
              <span className="text-sm font-medium">{edgeColorInfo.label}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {edgeColorInfo.description}
              </span>
            </div>
          </div>
        )}

        {data.tags && data.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
              标签
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-sm px-2.5 py-1 rounded-lg"
                  style={{
                    backgroundColor: colorConfig.border,
                    color: colorConfig.text,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {sanitizedContent && (
          <div>
            <h4 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
              内容
            </h4>
            <div
              className="tiptap-content text-sm text-[var(--color-text)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </div>
        )}

        {(data.createdAt || data.updatedAt) && (
          <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
              时间
            </h4>
            <div className="text-sm text-[var(--color-text-muted)] space-y-1">
              {data.createdAt && (
                <p>
                  创建：{new Date(data.createdAt).toLocaleDateString("zh-CN")}
                </p>
              )}
              {data.updatedAt && (
                <p>
                  更新：{new Date(data.updatedAt).toLocaleDateString("zh-CN")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
