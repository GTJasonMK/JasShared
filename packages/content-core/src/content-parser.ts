/**
 * 内容解析服务
 * 处理 Markdown frontmatter 和 JSON 的解析与序列化
 */

import { parseStringArray, readFrontmatterString } from './content-common';
import { normalizeDiaryTime } from './diary-contract';
export { parseRoadmapItemsFromContent } from './roadmap-content';
import { normalizeRoadmapStatus } from './roadmap-status';
import { parse as parseYAML } from 'yaml';
import type {
  ContentType,
  NoteMetadata,
  ProjectMetadata,
  DiaryMetadata,
  RoadmapMetadata,
  GraphMetadata,
  DocMetadata,
  TechStackItem,
  LineEnding,
} from './types';

/**
 * 解析 Markdown 内容
 * 从 raw 文本中提取 YAML frontmatter 和正文内容
 */
export function parseMarkdownContent(
  raw: string,
  type: ContentType
): {
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;
  issues: string[];
  frontmatterRaw: Record<string, unknown>;
  frontmatterBlock: string | null;
  content: string;
  hasFrontmatter: boolean;
  hasBom: boolean;
  lineEnding: LineEnding;
} {
  // 兼容 Windows/部分编辑器写入的 UTF-8 BOM（JasBlog content 示例文件中存在）
  const hasBom = raw.charCodeAt(0) === 0xFEFF;
  const rawText = hasBom ? raw.slice(1) : raw;
  const lineEnding: LineEnding = rawText.includes('\r\n') ? 'crlf' : 'lf';
  const normalizedRawText = normalizeEditorContent(rawText);

  // 匹配 YAML frontmatter: --- ... ---
  // - frontmatterBlock：尽量保留原始文本（含注释/缩进/空行），用于“原样保存”
  // - yamlContent：仅用于解析出 metadata（不做格式化）
  const frontmatterMatch = rawText.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);

  if (!frontmatterMatch) {
    // 没有 frontmatter，返回默认元数据
    const defaultMetadata = getDefaultMetadata(type);
    return {
      metadata: defaultMetadata,
      issues: [],
      frontmatterRaw: {},
      frontmatterBlock: null,
      content: normalizedRawText,
      hasFrontmatter: false,
      hasBom,
      lineEnding,
    };
  }

  const frontmatterBlock = frontmatterMatch[1] + frontmatterMatch[2] + frontmatterMatch[3];
  const yamlContent = frontmatterMatch[2];
  const bodyContent = normalizeEditorContent(frontmatterMatch[4]);

  let parsed: Record<string, unknown> = {};
  try {
    const value: unknown = parseYAML(yamlContent);
    if (value !== null && value !== undefined && (typeof value !== 'object' || Array.isArray(value))) {
      throw new Error('frontmatter 必须为字段对象');
    }
    parsed = (value ?? {}) as Record<string, unknown>;
  } catch (error) {
    return {
      metadata: getDefaultMetadata(type),
      issues: [`${type} frontmatter YAML 解析失败：${getErrorMessage(error)}`],
      frontmatterRaw: {},
      frontmatterBlock,
      content: bodyContent,
      hasFrontmatter: true,
      hasBom,
      lineEnding,
    };
  }

  // 根据类型构建元数据
  const { metadata, issues } = normalizeContentMetadata(parsed, type);
  return { metadata, issues, frontmatterRaw: parsed, frontmatterBlock, content: bodyContent, hasFrontmatter: true, hasBom, lineEnding };
}

function normalizeEditorContent(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

/**
 * 根据解析结果和类型构建元数据对象
 */
export function normalizeContentMetadata(
  parsed: Record<string, unknown>,
  type: ContentType
): {
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;
  issues: string[];
} {
  if (type === 'note') {
    return {
      metadata: {
        title: readFrontmatterString(parsed.title) ?? '',
        date: parsed.date ? String(parsed.date) : '',
        excerpt: readFrontmatterString(parsed.excerpt) ?? '',
        tags: parseStringArray(parsed.tags),
      },
      issues: [],
    };
  }

  if (type === 'project') {
    return {
      metadata: {
        name: readFrontmatterString(parsed.name, parsed.title) ?? '',
        description: readFrontmatterString(parsed.description) ?? '',
        github: readFrontmatterString(parsed.github) ?? '',
        demo: readFrontmatterString(parsed.demo),
        date: parsed.date ? String(parsed.date) : undefined,
        tags: parseStringArray(parsed.tags),
        techStack: normalizeTechStack(parsed.techStack),
      },
      issues: [],
    };
  }

  if (type === 'diary') {
    return {
      metadata: {
        title: readFrontmatterString(parsed.title) ?? '',
        // 与 JasBlog 行为对齐：date/time 缺失时可从文件名推断（推断逻辑在 openFile 侧做）
        date: parsed.date ? String(parsed.date) : '',
        time: normalizeDiaryTime(parsed.time),
        excerpt: readFrontmatterString(parsed.excerpt) ?? '',
        tags: parseStringArray(parsed.tags),
        mood: readFrontmatterString(parsed.mood),
        weather: readFrontmatterString(parsed.weather),
        location: readFrontmatterString(parsed.location),
        companions: parseStringArray(parsed.companions),
      },
      issues: [],
    };
  }

  if (type === 'roadmap') {
    const status = normalizeRoadmapStatus(parsed.status);
    return {
      metadata: {
        title: readFrontmatterString(parsed.title, parsed.name) ?? '',
        description: readFrontmatterString(parsed.description) ?? '',
        date: parsed.date ? String(parsed.date) : undefined,
        status: status.status,
      },
      issues: status.error ? [status.error] : [],
    };
  }

  if (type === 'graph') {
    return {
      metadata: {
        name: readFrontmatterString(parsed.name, parsed.title) ?? '',
        description: readFrontmatterString(parsed.description) ?? '',
        date: parsed.date ? String(parsed.date) : undefined,
      },
      issues: [],
    };
  }

  // doc 类型（普通文档）
  return {
    metadata: {
      title: readFrontmatterString(parsed.title) ?? '',
      date: parsed.date ? String(parsed.date) : undefined,
    },
    issues: [],
  };
}

/**
 * 标准化 techStack 数组
 */
export function normalizeTechStack(value: unknown): TechStackItem[] | undefined {
  if (!value) return undefined;

  // 兼容 JasBlog projects.ts：techStack 既可能是数组，也可能是逗号分隔字符串
  if (typeof value === 'string') {
    const names = parseStringArray(value);
    if (names.length === 0) return [];
    return names.map((name) => ({ name }));
  }

  if (!Array.isArray(value)) return undefined;

  return value
    .map((item): TechStackItem | null => {
      if (typeof item === 'string') {
        return item ? { name: item } : null;
      }

      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const obj = item as Record<string, unknown>;
      const name = String(obj.name || '').trim();
      if (!name) return null;

      return {
        name,
        icon: typeof obj.icon === 'string' ? obj.icon : undefined,
        color: typeof obj.color === 'string' ? obj.color : undefined,
      };
    })
    .filter((item): item is TechStackItem => item !== null);
}

/**
 * 获取默认元数据
 */
function getDefaultMetadata(type: ContentType): NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata {
  if (type === 'note') {
    return {
      title: '',
      date: '',
      excerpt: '',
      tags: [],
    };
  }

  if (type === 'project') {
    return {
      name: '',
      description: '',
      github: '',
      tags: [],
    };
  }

  if (type === 'diary') {
    return {
      title: '',
      date: '',
      time: '',
      excerpt: '',
      tags: [],
      companions: [],
    };
  }

  if (type === 'roadmap') {
    return {
      title: '',
      description: '',
      status: 'active',
    };
  }

  if (type === 'graph') {
    return {
      name: '',
      description: '',
      date: undefined,
    };
  }

  // doc 类型
  return {
    title: '',
    date: undefined,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split('\n')[0] || error.message;
  }
  return String(error);
}
