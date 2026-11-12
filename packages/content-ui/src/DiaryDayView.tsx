import type { ReactNode } from "react";
import type { DiaryDay } from "@jas/content-core";
import DiaryEntryArticle from "./DiaryEntryArticle";
import { useContentHost, type PreviewLayout } from "./ContentHost";

interface DiaryDayViewProps {
  day: DiaryDay;
  back?: ReactNode;
  aggregateError?: string | null;
  layout?: PreviewLayout;
}

function parseDateParts(date: string) {
  const [year, month, dayNum] = date.split("-");
  return { year: year || "", month: month || "", day: dayNum || "" };
}

function DayContextTags({ day }: { day: DiaryDay }) {
  const mood = day.mood;
  const context = [day.weather, day.location].filter(
    (value): value is string => Boolean(value)
  );

  if (!mood && context.length === 0 && day.tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {mood ? (
        <span className="text-xs px-3 py-1 rounded-full border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/8 text-[var(--color-secondary)]">
          {mood}
        </span>
      ) : null}
      {context.map((item) => (
        <span key={item} className="tag">{item}</span>
      ))}
      {day.tags.map((tag) => (
        <span
          key={tag}
          className="text-xs px-3 py-1 rounded-full border border-[var(--color-primary)]/12 bg-[var(--color-primary)]/6 text-[var(--color-primary)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function DiaryInfoIssue({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mb-6 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4 text-sm text-[var(--color-text-muted)]">
      <p className="mb-1 font-medium text-[var(--color-primary)]">{title}</p>
      <p>{message}</p>
    </div>
  );
}

export default function DiaryDayView({
  day,
  back,
  aggregateError,
  layout = 'page',
}: DiaryDayViewProps) {
  const dateParts = parseDateParts(day.date);
  const host = useContentHost();
  const isSingle = day.entryCount === 1;

  return (
    <div className={`jas-content ${layout === 'pane' ? "min-w-0 py-6" : "max-w-3xl mx-auto px-6 py-12"}`}>
      {back}

      <header className="mb-8">
        <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-secondary)] mb-3">{host.sections?.diary.title ?? "考研日志"}</p>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-4xl font-bold text-[var(--color-primary)] leading-none">{dateParts.day}</span>
          <span className="text-sm text-[var(--color-text-muted)]">{dateParts.year}年{dateParts.month}月</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{day.title}</h1>
        {day.excerpt ? (
          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-3">{day.excerpt}</p>
        ) : null}
        <DayContextTags day={day} />
      </header>

      <div className="content-divider mb-8" />

      {day.error && !day.entries.some((entry) => entry.error) ? (
        <DiaryInfoIssue title="frontmatter 错误" message={day.error} />
      ) : null}
      {aggregateError ? (
        <DiaryInfoIssue title="同日聚合失败" message={aggregateError} />
      ) : null}

      {isSingle ? (
        <DiaryEntryArticle entry={day.entries[0]} singleEntry />
      ) : (
        <div className="space-y-0">
          {day.entries.map((entry, index) => (
            <div key={entry.id}>
              {index > 0 ? <div className="content-divider my-8" /> : null}
              <DiaryEntryArticle entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
