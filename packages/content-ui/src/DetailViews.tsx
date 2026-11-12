"use client";

import { useMemo, type ReactNode } from "react";
import { calculateRoadmapProgress, contentDisplay, extractHeadingsFromContent, type NoteMetadata, type ProjectMetadata, type RoadmapMetadata, type RoadmapItem, type GraphMetadata, type GraphData } from "@jas/content-core";
import { ROADMAP_ITEM_STATUS_BADGE_CONFIG, ROADMAP_PRIORITY_CONFIG, ROADMAP_STATUS_BADGE_CONFIG } from "./roadmap-ui";
import ArticleBody from "./ArticleBody";
import { ReadingLayout } from "./ReadingLayout";
import { TechStack } from "./TechStack";
import { useContentHost, type PreviewLayout } from "./ContentHost";
import { GraphBlock } from "./GraphBlock";
import { ContentLink } from "./ContentLink";
import { ContentCover } from "./PageView";

type DocumentBody = { content: string; error?: string };
type ShellProps = { back?: ReactNode; layout?: PreviewLayout };

function Issue({ error }: { error?: string }) {
  return error ? <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm"><p className="font-medium">内容错误</p><p className="whitespace-pre-wrap">{error}</p></div> : null;
}

export function NoteView({ note, back, comments, onTagSelect, layout = "page" }: ShellProps & { note: NoteMetadata & DocumentBody; comments?: ReactNode; onTagSelect?: (tag: string) => void }) {
  const host = useContentHost();
  const headings = useMemo(() => layout === "page" ? extractHeadingsFromContent(note.content) : [], [layout, note.content]);
  const display = contentDisplay(note, "note");
  return <ReadingLayout back={back} layout={layout} headings={display.toc ? headings : []} header={<>
    <p className="reading-kicker">{host.sections?.notes.title ?? "学习笔记"}</p>
    {note.date && <time className="text-sm text-[var(--color-text-muted)]">{note.date}</time>}
    <h1>{note.title}</h1>
    <Issue error={note.error} />
    <div className="flex flex-wrap gap-2">{note.tags?.map((tag) => onTagSelect
      ? <button key={tag} type="button" className="tag" onClick={() => onTagSelect(tag)}>{tag}</button>
      : host.tagHref ? <ContentLink key={tag} href={host.tagHref(tag)} className="tag">{tag}</ContentLink>
      : <span key={tag} className="tag">{tag}</span>)}</div>
  </>}>
    {note.display?.cover && <ContentCover cover={note.display.cover} />}
    <ArticleBody content={note.content} />
    {comments && host.commentsEnabled !== false && display.comments && <section className="content-comments"><h2>评论与讨论</h2>{comments}</section>}
  </ReadingLayout>;
}

export function ProjectView({ project, back, layout = "page" }: ShellProps & { project: ProjectMetadata & DocumentBody }) {
  const host = useContentHost();
  return <ReadingLayout back={back} layout={layout} header={<>
    <p className="reading-kicker">{host.sections?.projects.title ?? "开源项目"}</p>
    <h1>{project.name}</h1>
    {project.description && <p className="text-[var(--color-text-muted)] mb-4">{project.description}</p>}
    <Issue error={project.error} />
    <div className="flex flex-wrap gap-3 mb-6">
      {project.github && <a href={project.github} target="_blank" rel="noopener noreferrer" className="btn-primary">GitHub</a>}
      {project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg min-h-11">在线演示</a>}
    </div>
    <div className="flex flex-wrap gap-2 mb-6">{project.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
    <TechStack items={project.techStack ?? []} />
  </>}>
    <ArticleBody content={project.content} />
  </ReadingLayout>;
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  const status = ROADMAP_ITEM_STATUS_BADGE_CONFIG[item.status];
  const priority = ROADMAP_PRIORITY_CONFIG[item.priority];
  const heading = <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3 min-w-0"><span className={`w-2 h-2 rounded-full shrink-0 ${priority.className}`} title={`优先级：${priority.label}`} /><h4 className="font-medium break-words">{item.title}</h4></div><span className={`text-xs px-2 py-1 rounded shrink-0 ${status.className}`}>{status.label}</span></div>;
  if (!item.description && !item.details && !item.deadline && !item.completedAt) return <div className="card-hover rounded-lg p-5">{heading}</div>;
  return <details className="card-hover rounded-lg"><summary className="cursor-pointer p-5">{heading}</summary><div className="px-5 pb-5">
    {item.description && <p className="text-sm text-[var(--color-text-muted)]">{item.description}</p>}
    {item.details && <p className="text-sm whitespace-pre-line mt-2">{item.details}</p>}
    <div className="flex flex-wrap gap-4 text-xs mt-2">{item.deadline && <span>截止：{item.deadline}</span>}{item.completedAt && <span className="text-[var(--color-success)]">完成：{item.completedAt}</span>}</div>
  </div></details>;
}

export function RoadmapView({ roadmap, back, layout = "page" }: ShellProps & { roadmap: RoadmapMetadata & DocumentBody & { items: RoadmapItem[] } }) {
  const host = useContentHost();
  const status = roadmap.status ?? "active";
  const progress = calculateRoadmapProgress(roadmap.items);
  const percent = progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  const groups = [{ status: "in_progress", title: "正在进行" }, { status: "todo", title: "计划中" }, { status: "done", title: "已完成" }] as const;
  return <div className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : "max-w-4xl mx-auto px-6 py-12"}`}>
    {back}
    <header className="rounded-2xl border border-[var(--color-border)] overflow-hidden mb-8">
      <div className="h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />
      <div className="bg-[var(--color-surface-dark)]/40 p-8">
        <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-secondary)] mb-2">{host.sections?.roadmap.title ?? "我的规划"}</p>
        <div className="flex flex-wrap items-center gap-3 mb-2"><h1 className="text-2xl font-bold break-words">{roadmap.title}</h1><span className={`text-xs px-2 py-1 rounded ${ROADMAP_STATUS_BADGE_CONFIG[status].className}`}>{ROADMAP_STATUS_BADGE_CONFIG[status].label}</span></div>
        {roadmap.description && <p className="text-[var(--color-text-muted)] mb-4">{roadmap.description}</p>}
        <Issue error={roadmap.error} />
        {progress.total > 0 && <div className="rounded-lg p-4 bg-[var(--color-surface)]/60">
          <div className="flex justify-between text-sm mb-2"><span>完成进度</span><span>{progress.done}/{progress.total} ({percent}%)</span></div>
          <progress className="w-full h-3 accent-[var(--color-success)]" value={progress.done} max={progress.total} aria-label="完成进度" />
          <p className="text-xs mt-2">已完成 {progress.done}　进行中 {progress.inProgress}　待开始 {progress.todo}</p>
        </div>}
      </div>
    </header>
    {roadmap.content.trim() && <div className="mb-8"><ArticleBody content={roadmap.content} /></div>}
    {roadmap.items.length ? <section><h2 className="text-xl font-semibold mb-8">任务列表 ({roadmap.items.length})</h2>{groups.map((group) => {
      const items = roadmap.items.filter((item) => item.status === group.status);
      return items.length ? <section key={group.status} className="mb-10"><h3 className="text-lg font-medium mb-4">{group.title} ({items.length})</h3><div className="grid gap-3">{items.map((item) => <RoadmapItemCard key={item.id} item={item} />)}</div></section> : null;
    })}</section> : <p className="text-[var(--color-text-muted)] text-center py-12">暂无任务项</p>}
  </div>;
}

export function GraphView({ graph, back, layout = "page" }: ShellProps & { graph: GraphMetadata & DocumentBody & { graphData: GraphData } }) {
  const host = useContentHost();
  return <div className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : "max-w-6xl mx-auto px-6 py-12"}`}>
    {back}
    <header className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 mb-8">
      <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-secondary)] mb-2">{host.sections?.graphs.title ?? "知识图谱"}</p>
      <h1 className="text-2xl font-bold mb-2 break-words">{graph.name}</h1>
      {graph.description && <p className="text-[var(--color-text-muted)] mb-4">{graph.description}</p>}
      {graph.date && <time className="text-sm text-[var(--color-text-muted)]">{graph.date}</time>}
      <div className="flex flex-wrap gap-3 mt-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-dark)] rounded-lg border-l-3 border-[var(--color-secondary)]"><span className="text-2xl font-bold text-[var(--color-text)]">{graph.graphData.nodes.length}</span><span className="text-sm text-[var(--color-text-muted)]">个节点</span></div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-dark)] rounded-lg border-l-3 border-[var(--color-primary)]"><span className="text-2xl font-bold text-[var(--color-text)]">{graph.graphData.edges.length}</span><span className="text-sm text-[var(--color-text-muted)]">条连接</span></div>
      </div>
    </header>
    <Issue error={graph.error} />
    {!graph.error && <GraphBlock data={graph.graphData} />}
    {graph.content.trim() && <div className="mt-8"><ArticleBody content={graph.content} /></div>}
  </div>;
}
