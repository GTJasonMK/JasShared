"use client";
import { lazy, Suspense } from "react";
import type { GraphData } from "@jas/content-core";
const GraphViewer = lazy(() => import("@jas/graph-ui").then((module) => ({ default: module.GraphViewer })));
export function GraphBlock({ data }: { data: GraphData }) {
  return <Suspense fallback={<p>加载图谱中...</p>}><GraphViewer data={data} /></Suspense>;
}
