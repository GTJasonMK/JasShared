export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

const HEADING_REGEX = /^(#{2,4})\s+(.+)$/gm;
const FENCE_REGEX = /^(`{3,}|~{3,})/;
const FALLBACK_HEADING_ID = "section";

export function generateHeadingId(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/^-+|-+$/g, "");

  return normalized || FALLBACK_HEADING_ID;
}

export function createHeadingIdResolver(): (text: string) => string {
  const headingIdCounts = new Map<string, number>();

  return (text: string) => {
    const baseId = generateHeadingId(text);
    const current = headingIdCounts.get(baseId) || 0;
    headingIdCounts.set(baseId, current + 1);
    return current === 0 ? baseId : `${baseId}-${current}`;
  };
}

function collectVisibleLines(content: string): string[] {
  const visibleLines: string[] = [];
  let inFence = false;
  let fenceChar = "";

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(FENCE_REGEX);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = "";
      }
      continue;
    }

    if (!inFence) {
      visibleLines.push(line);
    }
  }

  return visibleLines;
}

export function extractHeadingsFromContent(content: string): HeadingItem[] {
  const resolveHeadingId = createHeadingIdResolver();
  const source = collectVisibleLines(content).join("\n");
  const headings: HeadingItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = HEADING_REGEX.exec(source)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    headings.push({
      id: resolveHeadingId(text),
      text,
      level,
    });
  }

  return headings;
}
