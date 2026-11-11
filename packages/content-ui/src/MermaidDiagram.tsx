import { useEffect, useRef, useState } from "react";
import type MermaidAPI from "mermaid";
import { useContentHost } from "./ContentHost";

// 模块级缓存：mermaid 仅在首次渲染 mermaid 代码块时动态加载
let mermaidInstance: typeof MermaidAPI | null = null;
async function loadMermaid() {
  if (!mermaidInstance) {
    const mod = await import("mermaid");
    mermaidInstance = mod.default;
  }
  return mermaidInstance;
}

// 浅色主题配置
const lightThemeVariables = {
  primaryColor: "#fdf5e8",
  primaryTextColor: "#2c2c2c",
  primaryBorderColor: "#c94043",
  lineColor: "#6b6b6b",
  secondaryColor: "#f5f0e8",
  tertiaryColor: "#fff",
  fontFamily: '"Noto Serif SC", serif',
};

// 深色主题配置
const darkThemeVariables = {
  primaryColor: "#2a2a2e",
  primaryTextColor: "#e8e6e3",
  primaryBorderColor: "#c94043",
  lineColor: "#8a8680",
  secondaryColor: "#1e1e22",
  tertiaryColor: "#161619",
  fontFamily: '"Noto Serif SC", serif',
};

// 初始化 mermaid（使用函数，根据主题动态配置）
function initMermaid(mermaid: typeof MermaidAPI, isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
    flowchart: {
      htmlLabels: true,
      curve: "basis",
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
    },
  });
}

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const currentTheme = useContentHost().theme === "dark";

  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      if (!code.trim()) { setSvg(""); setError(""); return; }

      try {
        const mermaid = await loadMermaid();
        // 根据当前主题初始化 mermaid
        initMermaid(mermaid, currentTheme);

        // 生成唯一 ID
        const id = `mermaid-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, code.trim());
        if (cancelled) return;
        setSvg(svg);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [code, currentTheme]);

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="mermaid-error-title">Diagram Error</div>
        <pre className="mermaid-error-message">{error}</pre>
        <pre className="mermaid-error-code">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-loading">
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
