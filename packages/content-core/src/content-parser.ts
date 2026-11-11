/**
 * 内容解析服务
 * 处理 Markdown frontmatter 和 JSON 的解析与序列化
 */

import { parseGraphDocument } from './graph-document';
import { parseStringArray, readFrontmatterString } from './content-common';
import { normalizeDiaryTime } from './diary-contract';
export { parseRoadmapItemsFromContent } from './roadmap-content';
import { normalizeRoadmapStatus } from './roadmap-status';
import { parse as parseYAML, parseDocument as parseYamlDocument, stringify as stringifyYAML } from 'yaml';
import type {
  ContentType,
  NoteMetadata,
  ProjectMetadata,
  DiaryMetadata,
  RoadmapMetadata,
  GraphData,
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
      metadata: getFrontmatterErrorMetadata(type),
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
 * 序列化 Markdown 内容
 * 将元数据和正文组合成完整的 Markdown 文件
 */
function serializeMarkdownContent(
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata,
  content: string,
  frontmatterRaw?: Record<string, unknown>
): string {
  // 尽量保留原始 frontmatter 的未知字段与顺序（避免保存后产生无意义 diff）
  const mergedMetadata: Record<string, unknown> = frontmatterRaw ? { ...frontmatterRaw } : {};
  for (const [key, value] of Object.entries(metadata as unknown as Record<string, unknown>)) {
    mergedMetadata[key] = value;
  }

  // 清理元数据，移除 undefined 和不需要的字段
  const cleanedMetadata = cleanMetadataForYaml(mergedMetadata);

  // 使用 yaml 库序列化
  const yaml = stringifyYAML(cleanedMetadata, {
    lineWidth: 0, // 禁用自动换行
    defaultStringType: 'PLAIN', // 简单字符串不加引号
    defaultKeyType: 'PLAIN',
  });

  // 不强行插入额外空行：正文是否以空行开头由编辑器内容决定（更利于“最小 diff”）
  return `---\n${yaml}---\n${content}`;
}

const FRONTMATTER_BLOCK_REGEX = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)$/;

/**
 * 在“已存在 frontmatter”的基础上尽量做“最小变更”序列化：
 * - 保留原始 key 顺序与注释（取决于 yaml 文档是否可解析）
 * - 仅更新元数据中出现的字段
 *
 * 解析失败时停止保存，保留原始文本和注释。
 */
function patchFrontmatterBlock(
  frontmatterBlock: string,
  metadata: Record<string, unknown>
): string {
  const match = frontmatterBlock.match(FRONTMATTER_BLOCK_REGEX);
  if (!match) throw new Error('frontmatter 边界格式无效，已保留原文。');

  const [, start, yamlContent, end] = match;

  // 使用 yaml Document：尽量保留注释与原始结构
  const doc = parseYamlDocument(yamlContent);
  if (doc.errors.length > 0) {
    throw new Error(`frontmatter YAML 解析失败，已保留原文：${doc.errors[0].message}`);
  }

  // 对齐 serializeMarkdownContent 的输出习惯：禁用自动换行，尽量用 plain string

  // 只更新“元数据对象中出现过的字段”，不动未知字段（从而尽量保留原样）
  const cleanedMetadata = cleanMetadataForYaml(metadata);

  for (const key of Object.keys(metadata)) {
    if (!(key in cleanedMetadata)) {
      doc.delete(key);
    }
  }

  for (const [key, value] of Object.entries(cleanedMetadata)) {
    doc.set(key, value);
  }

  // doc.toString() 默认会带一个末尾换行；而 frontmatterBlock 的 end 本身以换行开头（\n---）
  // 为避免在 closing --- 前多出一行空行，这里去掉最后一个 \n。
  const nextYaml = doc.toString({ lineWidth: 0, defaultStringType: 'PLAIN', defaultKeyType: 'PLAIN' }).replace(/\n$/, '');
  return `${start}${nextYaml}${end}`;
}

/**
 * 序列化 Markdown 内容（优先尝试“保留原始 frontmatter 样式”）
 */
export function serializeMarkdownContentPreservingFrontmatter(
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata,
  content: string,
  options: {
    frontmatterBlock?: string | null;
    frontmatterRaw?: Record<string, unknown>;
  } = {}
): string {
  const { frontmatterBlock, frontmatterRaw } = options;
  if (frontmatterBlock) {
    return `${patchFrontmatterBlock(frontmatterBlock, metadata as unknown as Record<string, unknown>)}${content}`;
  }

  return serializeMarkdownContent(metadata, content, frontmatterRaw);
}

/**
 * 清理元数据对象，移除不需要序列化的字段
 */
function cleanMetadataForYaml(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // 跳过 undefined 和 null
    if (value === undefined || value === null) continue;

    // 跳过空数组（可选，根据需求决定是否保留）
    if (Array.isArray(value) && value.length === 0) {
      // 与 JasBlog content 模板更一致：保留常见空数组字段，避免保存后产生无意义 diff
      const shouldKeepEmptyArray =
        key === 'tags' ||
        key === 'companions' ||
        key === 'techStack';
      if (!shouldKeepEmptyArray) continue;
    }

    // 跳过空字符串的可选字段
    if (value === '' && (key === 'demo' || key === 'icon')) continue;

    result[key] = value;
  }

  return result;
}

/**
 * 从 Markdown 正文中提取 graph 代码块
 * 返回 { graphData, remainingContent }
 * 如果没有找到 graph 代码块，返回空数据
 */
export function extractGraphFromContent(content: string): {
  graphData: GraphData;
  remainingContent: string;
  error: string | null;
} {
  return parseGraphDocument(content);
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

function getFrontmatterErrorMetadata(
  type: ContentType
): NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata {
  return getDefaultMetadata(type);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split('\n')[0] || error.message;
  }
  return String(error);
}

/**
 * 序列化普通文档内容
 */
function serializeDocContent(
  metadata: DocMetadata,
  content: string,
  includeFrontmatter: boolean
): string {
  if (!includeFrontmatter) {
    return content;
  }

  const cleanedMetadata: Record<string, unknown> = {};
  if (metadata.title) {
    cleanedMetadata.title = metadata.title;
  }
  if (metadata.date) {
    cleanedMetadata.date = metadata.date;
  }

  // 如果清理后没有任何元数据，就不添加 frontmatter
  if (Object.keys(cleanedMetadata).length === 0) {
    return content;
  }

  const yaml = stringifyYAML(cleanedMetadata, {
    lineWidth: 0,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });

  // 不强行插入额外空行：正文是否以空行开头由编辑器内容决定（更利于“最小 diff”）
  return `---\n${yaml}---\n${content}`;
}

/**
 * 序列化普通文档（优先尝试“保留原始 frontmatter 样式”）
 */
export function serializeDocContentPreservingFrontmatter(
  metadata: DocMetadata,
  content: string,
  options: {
    includeFrontmatter: boolean;
    frontmatterBlock?: string | null;
  }
): string {
  const { includeFrontmatter, frontmatterBlock } = options;

  if (!includeFrontmatter) {
    return content;
  }

  // 没有旧 frontmatter：按最小规则生成新的即可
  if (!frontmatterBlock) {
    return serializeDocContent(metadata, content, true);
  }

  return `${patchFrontmatterBlock(frontmatterBlock, metadata as unknown as Record<string, unknown>)}${content}`;
}
