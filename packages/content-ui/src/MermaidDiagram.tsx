import { useEffect, useRef, useState } from "react";
import type MermaidAPI from "mermaid";
import { useContentHost } from "./ContentHost";

let mermaidInstance: typeof MermaidAPI | null = null;
// Mermaid's configuration is global; serialize initialization with rendering.
let renderQueue = Promise.resolve();
async function loadMermaid() {
  if (!mermaidInstance) mermaidInstance = (await import("mermaid")).default;
  return mermaidInstance;
}

export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const theme = useContentHost().theme;

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (cancelled) return;
      setSvg(""); setError("");
      if (!code.trim() || !containerRef.current) return;
      try {
        const mermaid = await loadMermaid();
        if (cancelled || !containerRef.current) return;
        const style = getComputedStyle(containerRef.current);
        const color = (name: string) => style.getPropertyValue(name).trim();
        mermaid.initialize({
          startOnLoad: false, securityLevel: "strict", theme: "base",
          themeVariables: {
            primaryColor: color("--color-primary-light"), primaryTextColor: color("--color-text"),
            primaryBorderColor: color("--color-primary"), lineColor: color("--color-text-muted"),
            secondaryColor: color("--color-surface-dark"), tertiaryColor: color("--color-surface"),
            fontFamily: color("--font-sans"),
          },
          flowchart: { htmlLabels: true, curve: "basis" },
        });
        const result = await mermaid.render(`mermaid-${crypto.randomUUID()}`, code.trim());
        const element = new DOMParser().parseFromString(result.svg, "image/svg+xml").documentElement;
        if (!(element instanceof SVGSVGElement) || !(element.viewBox.baseVal.width > 0)) throw new Error("图表缺少有效尺寸。");
        element.setAttribute("width", String(element.viewBox.baseVal.width));
        if (!cancelled) setSvg(new XMLSerializer().serializeToString(element));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    renderQueue = renderQueue.then(render);
    return () => { cancelled = true; };
  }, [code, theme]);

  return <div ref={containerRef} aria-busy={!!code.trim() && !svg && !error}>
    {error ? <div className="mermaid-error" role="alert"><p className="mermaid-error-title">图表渲染失败</p><pre className="mermaid-error-message">{error}</pre><pre className="mermaid-error-code">{code}</pre></div>
      : svg ? <div className="mermaid-container" role="region" aria-label="图表" tabIndex={0} dangerouslySetInnerHTML={{ __html: svg }} />
      : code.trim() ? <p className="mermaid-loading">正在加载图表…</p> : null}
  </div>;
}
