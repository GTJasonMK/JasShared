import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { MermaidDiagram } from "./MermaidDiagram";
import { resolveImageDimensions } from "./imageDimensions";
import { extractText } from "./text";
import { preprocessAlerts } from "@jas/content-core/preprocess-alerts";
import { scrollToHeading, useContentHost } from "./ContentHost";
import { GraphBlock } from "./GraphBlock";
import { parseGraphData } from "@jas/graph-core";
import { assignHeadingIds } from "./headingIds";

export interface MarkdownLinkProps {
  href?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

type MarkdownLinkRenderer = (
  props: MarkdownLinkProps,
  renderDefaultLink: (props: MarkdownLinkProps) => ReactNode
) => ReactNode;

// 代码块复制按钮组件
function CopyButton({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timeoutRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  const handleCopy = useCallback(async () => {
    const request = ++requestRef.current;
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    try {
      await navigator.clipboard.writeText(code);
      if (request !== requestRef.current) return;
      setStatus("copied");
      timeoutRef.current = window.setTimeout(() => {
        setStatus("idle");
        timeoutRef.current = null;
      }, 2000);
    } catch {
      if (request === requestRef.current) setStatus("failed");
    }
  }, [code]);

  useEffect(() => {
    return () => {
      requestRef.current++;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="code-copy-button"
      data-status={status}
      title={status === "failed" ? "复制失败，请检查浏览器的剪贴板权限后重试。" : "复制代码"}
      aria-label={status === "idle" ? "复制代码" : status === "copied" ? "代码已复制" : "复制失败，重试复制代码"}
      aria-live="polite"
    >
      {status === "copied" ? "已复制" : status === "failed" ? "复制失败" : "复制"}
    </button>
  );
}

// 图片缩放组件
function ImageZoom({
  src,
  alt,
  width,
  height,
}: {
  src?: string | undefined;
  alt?: string;
  width?: string | number;
  height?: string | number;
}) {
  const [zoomed, setZoomed] = useState(false);
  const host = useContentHost();
  const Image = host.Image ?? "img";
  const resolvedSrc = src ? host.assetUrl?.(src) ?? src : undefined;
  const resolved = resolveImageDimensions({ width, height });

  if (!src || typeof src !== "string") return null;

  return (
    <>
      <span className="block my-6">
        <button type="button" onClick={() => setZoomed(true)} aria-label={`放大图片：${alt || "图片"}`} className="block max-w-full mx-auto cursor-zoom-in">
        <Image
          src={resolvedSrc}
          alt={alt || ""}
          width={resolved.width}
          height={resolved.height}
          className="rounded-lg max-w-full h-auto mx-auto cursor-zoom-in"
          loading="lazy"
        />
        </button>
        {alt && (
          <span className="block text-center text-sm text-[var(--color-text-muted)] mt-2">
            {alt}
          </span>
        )}
      </span>
      {/* 图片缩放蒙层 */}
      {zoomed && (
        <ZoomDialog src={resolvedSrc!} alt={alt} onClose={() => setZoomed(false)} />
      )}
    </>
  );
}

function ZoomDialog({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const Image = useContentHost().Image ?? "img";
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} aria-label={alt || "图片预览"} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="jas-content p-4 rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] max-w-[95vw] max-h-[95vh]">
    <button type="button" onClick={onClose} className="block ml-auto mb-2 min-h-11 px-3">关闭</button>
    <Image src={src} alt={alt || ""} width={1200} height={675} className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg" />
  </dialog>;
}

// 解析 blockquote 中的 Alert 标记
function parseAlertFromChildren(children: ReactNode): {
  type: string;
  content: ReactNode;
} | null {
  if (!children) return null;

  const childArray = Array.isArray(children) ? children : [children];

  // 遍历所有子元素，查找 Alert 标记
  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (!child) continue;

    // 提取文本内容
    const text = extractText(child);

    // 检查是否包含 ALERTBOXTYPEALERTBOX 标记（与 JasBlog 保持一致）
    const alertMatch = text.match(/^ALERTBOX(NOTE|TIP|IMPORTANT|WARNING|CAUTION)ALERTBOX\s*/i);
    if (alertMatch) {
      const alertType = alertMatch[1].toLowerCase();

      // 获取标记之后的内容（如果有的话）
      const restText = text.slice(alertMatch[0].length).trim();
      // 获取剩余的子元素
      const restChildren = childArray.slice(i + 1);

      return {
        type: alertType,
        content: (
          <>
            {restText && <p>{restText}</p>}
            {restChildren}
          </>
        ),
      };
    }
  }

  return null;
}

// GitHub 风格 alert 类型配置
const ALERT_CONFIG: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  note: {
    label: "提示",
    className: "alert-note",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  },
  tip: {
    label: "技巧",
    className: "alert-tip",
    icon: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
  },
  important: {
    label: "重要",
    className: "alert-important",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z",
  },
  warning: {
    label: "警告",
    className: "alert-warning",
    icon: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  },
  caution: {
    label: "注意",
    className: "alert-caution",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.54-12.46L12 11.08 8.46 7.54 7.04 8.96 10.58 12.5l-3.54 3.54 1.42 1.42L12 13.92l3.54 3.54 1.42-1.42L13.42 12.5l3.54-3.54-1.42-1.42z",
  },
};

// 标题组件（带锚点链接）
function Heading({
  headingId,
  level,
  children,
  ...props
}: {
  headingId: string;
  level: 1 | 2 | 3 | 4;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const container = useContentHost().scrollContainer;
  const text = extractText(children);
  const Tag = `h${level}` as const;

  return (
    <Tag id={headingId} className="group/heading relative" {...props}>
      {children}
      <a
        href={`#${headingId}`}
        className="heading-anchor"
        aria-label={`定位到 ${text}`}
        onClick={(e) => {
          e.preventDefault();
          scrollToHeading(e.currentTarget.parentElement!, container);
        }}
      >
        #
      </a>
    </Tag>
  );
}

// 代码块组件（支持 Mermaid）
function CodeBlock({ children }: { children?: ReactNode }) {
  // 从 children 中提取代码和语言
  let code = "";
  let language = "";
  if (children && typeof children === "object" && "props" in children) {
    const codeElement = children as {
      props: { children?: ReactNode; className?: string };
    };
    code = extractText(codeElement.props?.children);
    const className = codeElement.props?.className || "";
    const langMatch = className.match(/language-(\w+)/);
    language = langMatch ? langMatch[1] : "";
  }

  // Mermaid 图表
  if (language === "mermaid") {
    return (
      <div className="my-6">
        <MermaidDiagram code={code} />
      </div>
    );
  }
  if (language === "graph") {
    try { return <div className="my-8 not-prose"><GraphBlock data={parseGraphData(JSON.parse(code.trim()))} /></div>; }
    catch (error) { return <div><p role="alert" className="text-[var(--color-danger)]">{error instanceof Error ? error.message : String(error)}</p><pre tabIndex={0}>{children}</pre></div>; }
  }

  // 普通代码块
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">{language && <span className="code-block-lang">{language}</span>}<CopyButton key={code} code={code} /></div>
      <pre tabIndex={0}>{children}</pre>
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  renderLink?: MarkdownLinkRenderer;
  idPrefix?: string;
}

function renderDefaultMarkdownLink({ href, children, ...props }: MarkdownLinkProps) {
  const isExternal = href?.startsWith("http");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  );
}

export function MarkdownRenderer({ content, renderLink, idPrefix = "" }: MarkdownRendererProps) {
  const host = useContentHost();
  const linkRenderer = renderLink ?? host.renderLink;
  const processed = preprocessAlerts(content);

  return (
    <div className="jas-content prose-chinese"><Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[assignHeadingIds, { idPrefix }], rehypeHighlight, rehypeKatex]}
      components={{
        // 标题
        h1: ({ id, node: _node, children, ...props }) => (
          <Heading headingId={id!} level={1} {...props}>
            {children}
          </Heading>
        ),
        h2: ({ id, node: _node, children, ...props }) => (
          <Heading headingId={id!} level={2} {...props}>
            {children}
          </Heading>
        ),
        h3: ({ id, node: _node, children, ...props }) => (
          <Heading headingId={id!} level={3} {...props}>
            {children}
          </Heading>
        ),
        h4: ({ id, node: _node, children, ...props }) => (
          <Heading headingId={id!} level={4} {...props}>
            {children}
          </Heading>
        ),
        // 链接
        a: ({ href, children, ...props }) => {
          const linkProps: MarkdownLinkProps = { href, children, ...props };
          return linkRenderer
            ? linkRenderer(linkProps, renderDefaultMarkdownLink)
            : renderDefaultMarkdownLink(linkProps);
        },
        // 图片（可缩放）
        img: ({ src, alt, width, height }) => {
          const imgSrc = typeof src === "string" ? src : undefined;
          return <ImageZoom src={imgSrc} alt={alt} width={width} height={height} />;
        },
        // 代码块（带复制按钮、语言标签、Mermaid 支持）
        pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        // 引用块（支持 GitHub alert）
        blockquote: ({ children, ...props }) => {
          // 解析预处理后的 Alert 标记
          const alert = parseAlertFromChildren(children);
          if (alert && ALERT_CONFIG[alert.type]) {
            const { label, className, icon } = ALERT_CONFIG[alert.type];
            return (
              <div className={`github-alert ${className}`}>
                <div className="github-alert-title">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d={icon} />
                  </svg>
                  {label}
                </div>
                <div className="github-alert-content">{alert.content}</div>
              </div>
            );
          }
          return <blockquote {...props}>{children}</blockquote>;
        },
        // 表格
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-6" role="region" aria-label="表格" tabIndex={0}>
            <table {...props}>{children}</table>
          </div>
        ),
      }}
    >
      {processed}
    </Markdown></div>
  );
}
