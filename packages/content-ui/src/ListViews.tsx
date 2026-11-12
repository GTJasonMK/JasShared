"use client";

import type { ReactNode } from "react";
import { getTagOptions, resolveDiaryFilter, type JasBlogContentType, type NoteListEntry, type ProjectListEntry, type GraphListEntry, type RoadmapListEntry, type DiaryListEntry } from "@jas/content-core";
import { ROADMAP_STATUS_BADGE_CONFIG } from "./roadmap-ui";
import { ContentLink } from "./ContentLink";
import { BackToTop } from "./BackToTop";
import { useContentHost } from "./ContentHost";
import { ContentCover } from "./PageView";

export function SectionTitle({ children, subtitle, level = 2 }: { children: ReactNode; subtitle?: string; level?: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return <div className="mb-10"><Heading className="text-3xl font-semibold tracking-tight">{children}</Heading>{subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-3">{subtitle}</p>}</div>;
}
function ListLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const host = useContentHost();
  const configured = host.section ? host.sections?.[host.section] : undefined;
  return <div className="jas-content max-w-4xl mx-auto px-6 py-12"><SectionTitle level={1} subtitle={configured?.description ?? subtitle}>{configured?.title ?? title}</SectionTitle>{children}<BackToTop /></div>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="text-[var(--color-text-muted)] text-center py-16">{children}</p>; }
function Tags({ tags = [] }: { tags?: readonly string[] }) { return <div className="flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>; }
function Card({ type, slug, onOpen, children, selected }: { type: JasBlogContentType; slug: string; onOpen?: () => void; children: ReactNode; selected?: boolean }) {
  const href = useContentHost().contentHref?.(type, slug);
  const className = `card-hover block rounded-lg p-6 text-left w-full ${selected ? "ring-2 ring-[var(--color-primary)]/40" : ""}`;
  if (onOpen) return <button type="button" onClick={onOpen} className={className}>{children}</button>;
  if (href) return <ContentLink href={href} className={className}>{children}</ContentLink>;
  return <div className={className}>{children}</div>;
}

export function NoteCard({ note, onOpen, selected }: { note: NoteListEntry; onOpen?: () => void; selected?: boolean }) {
  return <Card type="note" slug={note.slug} onOpen={onOpen} selected={selected}>
    {note.display?.cover && <ContentCover cover={note.display.cover} lazy />}
    <div className="flex flex-wrap items-center gap-3 mb-2"><time className="text-xs text-[var(--color-text-subtle)]">{note.date}</time><Tags tags={note.tags} /></div>
    <h3 className="text-lg font-semibold mb-2 hover:text-[var(--color-primary)] break-words">{note.title}</h3>
    {note.excerpt && <p className="text-[var(--color-text-muted)] text-sm">{note.excerpt}</p>}
    {note.error && <p role="alert" className="text-[var(--color-danger)] text-sm mt-2">{note.error}</p>}
  </Card>;
}

export function NotesListView({ items, selectedTag = "", onTagChange, onOpen, selectedSlug }: { items: NoteListEntry[]; selectedTag?: string; onTagChange: (tag: string) => void; onOpen?: (slug: string) => void; selectedSlug?: string }) {
  const tags = getTagOptions(items);
  const selected = tags.includes(selectedTag) ? selectedTag : "";
  const filtered = selected ? items.filter((item) => item.tags.includes(selected)) : items;
  return <ListLayout title="学习笔记" subtitle="记录学习过程中的收获与思考">
    {tags.length > 0 && <div className="mb-8 flex flex-wrap gap-2">{["", ...tags].map((tag) => <button key={tag} type="button" aria-pressed={selected === tag} onClick={() => onTagChange(tag)} className="tag">{tag || "全部"}</button>)}</div>}
    {filtered.length ? <div className="grid gap-6">{filtered.map((note) => <NoteCard key={note.slug} note={note} selected={note.slug === selectedSlug} onOpen={onOpen ? () => onOpen(note.slug) : undefined} />)}</div> : <Empty>{selected ? `未找到标签 "${selected}" 的文章。` : "暂无笔记。"}</Empty>}
  </ListLayout>;
}

export function ProjectCard({ project, onOpen, selected, compact = false }: { project: ProjectListEntry; onOpen?: () => void; selected?: boolean; compact?: boolean }) {
  const tech = project.techStack ?? [];
  const visibleTech = compact ? tech.slice(0, 3) : tech;
  return <Card type="project" slug={project.slug} onOpen={onOpen} selected={selected}>
    <h3 className="text-lg font-semibold mb-2 hover:text-[var(--color-primary)] break-words">{project.name}</h3>
    {project.description && <p className="text-[var(--color-text-muted)] text-sm mb-3">{project.description}</p>}
    {tech.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{visibleTech.map((item, index) => <span key={`${item.name}-${index}`} className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-dark)] text-[var(--color-text-muted)]">{item.name}</span>)}{tech.length > visibleTech.length && <span className="text-xs px-2 py-0.5 text-[var(--color-text-muted)]">+{tech.length - visibleTech.length}</span>}</div>}
    <Tags tags={project.tags} />
    {project.error && <p role="alert" className="text-[var(--color-danger)] text-sm mt-2">{project.error}</p>}
  </Card>;
}

export function ProjectsListView({ items, onOpen, selectedSlug }: { items: ProjectListEntry[]; onOpen?: (slug: string) => void; selectedSlug?: string }) {
  return <ListLayout title="开源项目" subtitle="分享我的开源作品">{items.length ? <div className="grid md:grid-cols-2 gap-6">{items.map((project) => <ProjectCard key={project.slug} project={project} onOpen={onOpen ? () => onOpen(project.slug) : undefined} selected={project.slug === selectedSlug} />)}</div> : <Empty>暂无项目，敬请期待...</Empty>}</ListLayout>;
}

export function GraphsListView({ items, onOpen, selectedSlug }: { items: GraphListEntry[]; onOpen?: (slug: string) => void; selectedSlug?: string }) {
  return <ListLayout title="知识图谱" subtitle="可视化的知识体系">{items.length ? <div className="grid md:grid-cols-2 gap-6">{items.map((graph) => <Card key={graph.slug} type="graph" slug={graph.slug} onOpen={onOpen ? () => onOpen(graph.slug) : undefined} selected={graph.slug === selectedSlug}>
    <div className="w-12 h-12 mb-4 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 9v6M9 6h6M18 9v6M9 18h6" /></svg></div>
    <h3 className="text-lg font-semibold mb-2 hover:text-[var(--color-primary)] break-words">{graph.name}</h3>
    {graph.description && <p className="text-[var(--color-text-muted)] text-sm mb-3">{graph.description}</p>}
    {graph.error && <p role="alert" className="text-[var(--color-danger)] text-sm mb-3 whitespace-pre-wrap">{graph.error}</p>}
    <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">{graph.date && <time>{graph.date}</time>}<span>{graph.nodeCount} 个节点</span><span>{graph.edgeCount} 条连接</span></div>
  </Card>)}</div> : <Empty>暂无知识图谱，敬请期待...</Empty>}</ListLayout>;
}

export function RoadmapsListView({ items, onOpen, selectedSlug }: { items: RoadmapListEntry[]; onOpen?: (slug: string) => void; selectedSlug?: string }) {
  const groups = ["active", "paused", "completed"] as const;
  return <ListLayout title="我的规划" subtitle="我的学习和开发计划">{items.length ? groups.map((status) => {
    const group = items.filter((item) => (item.status ?? "active") === status);
    return group.length ? <section key={status} className="mb-12"><h2 className="text-lg font-medium mb-4">{ROADMAP_STATUS_BADGE_CONFIG[status].label}</h2><div className="grid gap-4">{group.map((roadmap) => <Card key={roadmap.slug} type="roadmap" slug={roadmap.slug} onOpen={onOpen ? () => onOpen(roadmap.slug) : undefined} selected={roadmap.slug === selectedSlug}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2"><h3 className="text-lg font-semibold break-words">{roadmap.title}</h3><span className={`text-xs px-2 py-1 rounded ${ROADMAP_STATUS_BADGE_CONFIG[status].className}`}>{ROADMAP_STATUS_BADGE_CONFIG[status].label}</span></div>
      {roadmap.description && <p className="text-sm text-[var(--color-text-muted)] mb-2">{roadmap.description}</p>}
      {roadmap.date && <time className="text-xs text-[var(--color-text-muted)]">创建于 {roadmap.date}</time>}
      {roadmap.progress.total > 0 && <div className="mt-4"><div className="flex justify-between text-xs mb-1"><span>{roadmap.progress.done}/{roadmap.progress.total} 已完成</span><span>{Math.round(roadmap.progress.done / roadmap.progress.total * 100)}%</span></div><div role="progressbar" aria-label="完成进度" aria-valuenow={roadmap.progress.done} aria-valuemax={roadmap.progress.total} aria-valuemin={0} className="h-2 bg-[var(--color-surface-dark)] rounded-full overflow-hidden flex"><div className="h-full bg-[var(--color-success)]" style={{ width: `${roadmap.progress.done / roadmap.progress.total * 100}%` }} /><div className="h-full bg-[var(--color-primary)]" style={{ width: `${roadmap.progress.inProgress / roadmap.progress.total * 100}%` }} /></div></div>}
      {roadmap.error && <p role="alert" className="text-[var(--color-danger)] text-sm mt-2">{roadmap.error}</p>}
    </Card>)}</div></section> : null;
  }) : <Empty>暂无规划，敬请期待...</Empty>}</ListLayout>;
}

export function DiaryTimelineView({ days, year = "all", month = "all", onFilterChange, onOpen }: { days: DiaryListEntry[]; year?: string; month?: string; onFilterChange: (year: string, month: string) => void; onOpen?: (slug: string) => void }) {
  const filter = resolveDiaryFilter(days, year, month);
  return <ListLayout title="考研日志" subtitle="按天聚合的考研日志时间线。">
    <div className="mb-8 flex flex-wrap items-end gap-4">{(["year", "month"] as const).map((kind) => <label key={kind} className="text-sm text-[var(--color-text-muted)]"><span className="block mb-2">{kind === "year" ? "年份" : "月份"}</span><select value={filter[kind]} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm" onChange={(event) => { const next = resolveDiaryFilter(days, kind === "year" ? event.target.value : filter.year, kind === "month" ? event.target.value : filter.month); onFilterChange(next.year, next.month); }}><option value="all">全部{kind === "year" ? "年份" : "月份"}</option>{(kind === "year" ? filter.years : filter.months).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}</div>
    {filter.days.length ? <div className="relative pl-6"><div className="absolute left-2 top-1 bottom-1 w-px bg-[var(--color-border)]" /><div className="space-y-6">{filter.days.map((day) => <article key={day.slug} className="relative"><span className="absolute -left-5 top-8 w-3 h-3 rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-surface)]" /><Card type="diary" slug={day.slug} onOpen={onOpen ? () => onOpen(day.slug) : undefined}>
      <div className="flex flex-wrap items-center gap-2 mb-2"><time className="text-xs text-[var(--color-text-subtle)]">{day.date}</time><span className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-dark)]">{day.entryCount} 条记录</span><Tags tags={[day.mood, day.weather, day.location].filter((value): value is string => Boolean(value))} /></div>
      <h3 className="text-lg font-semibold mb-2 break-words">{day.title}</h3>{day.excerpt && <p className="text-sm text-[var(--color-text-muted)]">{day.excerpt}</p>}<Tags tags={day.tags} />
      {day.error && <p role="alert" className="text-[var(--color-danger)] text-sm mt-2">{day.error}</p>}
    </Card></article>)}</div></div> : <Empty>当前筛选条件下没有考研日志条目。</Empty>}
  </ListLayout>;
}
