"use client";

import type { ReactNode } from "react";
import { calculateRoadmapProgress, extractHeadingsFromContent, type NoteMetadata, type ProjectMetadata, type RoadmapMetadata, type RoadmapItem, type GraphMetadata, type GraphData } from "@jas/content-core";
import { ROADMAP_ITEM_STATUS_BADGE_CONFIG, ROADMAP_PRIORITY_CONFIG, ROADMAP_STATUS_BADGE_CONFIG } from "./roadmap-ui";
import ArticleBody from "./ArticleBody";
import { BackToTop } from "./BackToTop";
import { TableOfContents } from "./TableOfContents";
import { TechStack } from "./TechStack";
import { useContentHost, type PreviewLayout } from "./ContentHost";
import { GraphBlock } from "./GraphBlock";
import { ContentLink } from "./ContentLink";

type DocumentBody = { content: string; error?: string };
type ShellProps = { back?: ReactNode; layout?: PreviewLayout };

function Issue({ error }: { error?: string }) {
  return error ? <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm"><p className="font-medium">内容错误</p><p className="whitespace-pre-wrap">{error}</p></div> : null;
}

export function NoteView({ note, back, comments, onTagSelect, layout = "page" }: ShellProps & { note: NoteMetadata & DocumentBody; comments?: ReactNode; onTagSelect?: (tag: string) => void }) {
  const host = useContentHost();
  const toc = layout === "page" && extractHeadingsFromContent(note.content).length > 0;
  const paneToc = toc && Boolean(host.scrollContainer);
  return <div className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : paneToc ? "max-w-6xl mx-auto px-6 py-12" : "max-w-3xl mx-auto px-6 py-12"}`}>
    {back}
    <div className={paneToc ? "flex gap-10 items-start" : "min-w-0"}>
      <div className="min-w-0 flex-1">
        <header className="relative bg-[var(--color-paper)] border border-[var(--color-paper-darker)] rounded-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute -top-3 -right-3 w-24 h-24 rounded-full border-2 border-dashed border-[var(--color-vermilion)]/15" />
          <div className="border-l-4 border-[var(--color-vermilion)] pl-6">
            <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-gold)] mb-2">学习笔记</p>
            {note.date && <time className="text-sm text-[var(--color-gray)]">{note.date}</time>}
            <h1 className="text-3xl font-bold mt-2 mb-4 break-words">{note.title}</h1>
            <Issue error={note.error} />
            <div className="flex flex-wrap gap-2">{note.tags?.map((tag) => onTagSelect
              ? <button key={tag} type="button" className="tag hover:bg-[var(--color-vermilion)] hover:text-white" onClick={() => onTagSelect(tag)}>{tag}</button>
              : host.tagHref ? <ContentLink key={tag} href={host.tagHref(tag)} className="tag hover:bg-[var(--color-vermilion)] hover:text-white">{tag}</ContentLink>
              : <span key={tag} className="tag">{tag}</span>)}</div>
          </div>
        </header>
        <div className="divider-cloud mb-8" />
        <ArticleBody content={note.content} />
        {comments && <><div className="divider-cloud my-12" /><section><h2 className="text-xl font-semibold mb-6">评论与讨论</h2>{comments}</section></>}
      </div>
      {toc && <div className={paneToc ? "hidden lg:block w-56 flex-shrink-0" : "contents"}><TableOfContents content={note.content} /></div>}
    </div>
    <BackToTop />
  </div>;
}

export function ProjectView({ project, back, layout = "page" }: ShellProps & { project: ProjectMetadata & DocumentBody }) {
  return <div className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : "max-w-4xl mx-auto px-6 py-12"}`}>
    {back}
    <header className="rounded-2xl border border-[var(--color-paper-darker)] overflow-hidden mb-8">
      <div className="h-1.5 bg-[var(--color-ink)]" />
      <div className="bg-[var(--color-paper-dark)]/60 p-8">
        <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-gold)] mb-3">开源项目</p>
        <h1 className="text-3xl font-bold mb-4 break-words">{project.name}</h1>
        {project.description && <p className="text-lg text-[var(--color-gray)] mb-4">{project.description}</p>}
        <Issue error={project.error} />
        <div className="flex flex-wrap gap-3 mb-6">
          {project.github && <a href={project.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-white rounded-lg">GitHub</a>}
          {project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-ink)]/30 text-[var(--color-ink)] rounded-lg">在线演示</a>}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">{project.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
        <TechStack items={project.techStack ?? []} />
      </div>
    </header>
    <div className="divider-cloud my-8" />
    <ArticleBody content={project.content} />
    <BackToTop />
  </div>;
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  const status = ROADMAP_ITEM_STATUS_BADGE_CONFIG[item.status];
  const priority = ROADMAP_PRIORITY_CONFIG[item.priority];
  const heading = <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3 min-w-0"><span className={`w-2 h-2 rounded-full shrink-0 ${priority.className}`} title={`优先级：${priority.label}`} /><h4 className="font-medium break-words">{item.title}</h4></div><span className={`text-xs px-2 py-1 rounded shrink-0 ${status.className}`}>{status.label}</span></div>;
  if (!item.description && !item.details && !item.deadline && !item.completedAt) return <div className="card-hover rounded-lg p-5">{heading}</div>;
  return <details className="card-hover rounded-lg"><summary className="cursor-pointer p-5">{heading}</summary><div className="px-5 pb-5">
    {item.description && <p className="text-sm text-[var(--color-gray)]">{item.description}</p>}
    {item.details && <p className="text-sm whitespace-pre-line mt-2">{item.details}</p>}
    <div className="flex flex-wrap gap-4 text-xs mt-2">{item.deadline && <span>截止：{item.deadline}</span>}{item.completedAt && <span className="text-green-600">完成：{item.completedAt}</span>}</div>
  </div></details>;
}

export function RoadmapView({ roadmap, back, layout = "page" }: ShellProps & { roadmap: RoadmapMetadata & DocumentBody & { items: RoadmapItem[] } }) {
  const status = roadmap.status ?? "active";
  const progress = calculateRoadmapProgress(roadmap.items);
  const percent = progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  const groups = [{ status: "in_progress", title: "正在进行" }, { status: "todo", title: "计划中" }, { status: "done", title: "已完成" }] as const;
  return <div className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : "max-w-4xl mx-auto px-6 py-12"}`}>
    {back}
    <header className="rounded-2xl border border-[var(--color-paper-darker)] overflow-hidden mb-8">
      <div className="h-1 bg-gradient-to-r from-[var(--color-vermilion)] to-[var(--color-gold)]" />
      <div className="bg-[var(--color-paper-dark)]/40 p-8">
        <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-gold)] mb-2">我的规划</p>
        <div className="flex flex-wrap items-center gap-3 mb-2"><h1 className="text-2xl font-bold break-words">{roadmap.title}</h1><span className={`text-xs px-2 py-1 rounded ${ROADMAP_STATUS_BADGE_CONFIG[status].className}`}>{ROADMAP_STATUS_BADGE_CONFIG[status].label}</span></div>
        {roadmap.description && <p className="text-[var(--color-gray)] mb-4">{roadmap.description}</p>}
        <Issue error={roadmap.error} />
        {progress.total > 0 && <div className="rounded-lg p-4 bg-[var(--color-paper)]/60">
          <div className="flex justify-between text-sm mb-2"><span>完成进度</span><span>{progress.done}/{progress.total} ({percent}%)</span></div>
          <progress className="w-full h-3 accent-green-500" value={progress.done} max={progress.total} aria-label="完成进度" />
          <p className="text-xs mt-2">已完成 {progress.done}　进行中 {progress.inProgress}　待开始 {progress.todo}</p>
        </div>}
      </div>
    </header>
    {roadmap.content.trim() && <div className="mb-8"><ArticleBody content={roadmap.content} /></div>}
    {roadmap.items.length ? <section><h2 className="text-xl font-semibold mb-8">任务列表 ({roadmap.items.length})</h2>{groups.map((group) => {
      const items = roadmap.items.filter((item) => item.status === group.status);
      return items.length ? <section key={group.status} className="mb-10"><h3 className="text-lg font-medium mb-4">{group.title} ({items.length})</h3><div className="grid gap-3">{items.map((item) => <RoadmapItemCard key={item.id} item={item} />)}</div></section> : null;
    })}</section> : <p className="text-[var(--color-gray)] text-center py-12">暂无任务项</p>}
  </div>;
}

export function GraphView({ graph, back, layout = "page" }: ShellProps & { graph: GraphMetadata & DocumentBody & { graphData: GraphData } }) {
  return <div className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : "max-w-6xl mx-auto px-6 py-12"}`}>
    {back}
    <header className="rounded-2xl bg-[var(--color-paper)] border-2 border-dashed border-[var(--color-gold)]/30 p-8 mb-8">
      <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-gold)] mb-2">知识图谱</p>
      <h1 className="text-2xl font-bold mb-2 break-words">{graph.name}</h1>
      {graph.description && <p className="text-[var(--color-gray)] mb-4">{graph.description}</p>}
      {graph.date && <time className="text-sm text-[var(--color-gray)]">{graph.date}</time>}
      <div className="flex flex-wrap gap-3 mt-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-paper-dark)] rounded-lg border-l-3 border-[var(--color-gold)]"><span className="text-2xl font-bold text-[var(--color-ink)]">{graph.graphData.nodes.length}</span><span className="text-sm text-[var(--color-gray)]">个节点</span></div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-paper-dark)] rounded-lg border-l-3 border-[var(--color-vermilion)]"><span className="text-2xl font-bold text-[var(--color-ink)]">{graph.graphData.edges.length}</span><span className="text-sm text-[var(--color-gray)]">条连接</span></div>
      </div>
    </header>
    <Issue error={graph.error} />
    {!graph.error && <GraphBlock data={graph.graphData} />}
    {graph.content.trim() && <div className="mt-8"><ArticleBody content={graph.content} /></div>}
  </div>;
}
