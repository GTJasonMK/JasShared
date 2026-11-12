import type { DiaryEntry } from "@jas/content-core";
import ArticleContent from "./ArticleBody";

interface DiaryEntryArticleProps {
  entry: DiaryEntry;
  singleEntry?: boolean;
}

function EntryMeta({ entry }: { entry: DiaryEntry }) {
  const items = [
    entry.mood,
    entry.weather,
    entry.location,
    ...entry.companions,
    ...entry.tags,
  ].filter((value): value is string => Boolean(value));

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item, index) => (
        <span key={`${entry.id}-${item}-${index}`} className="tag">
          {item}
        </span>
      ))}
    </div>
  );
}

export default function DiaryEntryArticle({ entry, singleEntry = false }: DiaryEntryArticleProps) {
  return (
    <article>
      {singleEntry ? null : (
        <header className="mb-4">
          <div className="flex items-center gap-3">
            {entry.time && <span className="text-sm font-mono text-[var(--color-secondary)] tracking-wide">
              {entry.time}
            </span>}
            <h2 className="text-xl font-semibold">{entry.title}</h2>
          </div>
          <EntryMeta entry={entry} />
        </header>
      )}

      {entry.error ? (
        <div className="mb-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4 text-sm text-[var(--color-text-muted)]">
          <p className="mb-1 font-medium text-[var(--color-primary)]">frontmatter 错误</p>
          <p>{entry.error}</p>
        </div>
      ) : null}

      {singleEntry || !entry.excerpt ? null : (
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-4">{entry.excerpt}</p>
      )}

      <ArticleContent
        content={entry.content}
      />
    </article>
  );
}
