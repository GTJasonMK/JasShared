/**
 * 技术栈展示组件（与 JasBlog 保持一致）
 */

import type { TechStackItem as TechItem } from "@jas/content-core";

interface TechStackProps {
  items: TechItem[];
  title?: string;
}

// 预设的技术栈颜色映射
const techColors: Record<string, string> = {
  // 前端框架
  "React": "#61DAFB",
  "Vue": "#4FC08D",
  "Angular": "#DD0031",
  "Next.js": "#000000",
  "Nuxt": "#00DC82",
  "Svelte": "#FF3E00",

  // 语言
  "TypeScript": "#3178C6",
  "JavaScript": "#F7DF1E",
  "Python": "#3776AB",
  "Go": "#00ADD8",
  "Rust": "#000000",
  "Java": "#ED8B00",

  // 样式
  "Tailwind CSS": "#06B6D4",
  "CSS": "#1572B6",
  "Sass": "#CC6699",

  // 后端
  "Node.js": "#339933",
  "Express": "#000000",
  "NestJS": "#E0234E",
  "Django": "#092E20",
  "FastAPI": "#009688",

  // 数据库
  "MongoDB": "#47A248",
  "PostgreSQL": "#4169E1",
  "MySQL": "#4479A1",
  "Redis": "#DC382D",

  // 工具
  "Docker": "#2496ED",
  "Git": "#F05032",
  "GitHub": "#181717",
  "Webpack": "#8DD6F9",
  "Vite": "#646CFF",
  "Tauri": "#FFC131",
};

// 判断颜色是否为浅色
function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function TechStack({ items, title = "技术栈" }: TechStackProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="jas-content my-6">
      <h3 className="text-lg font-semibold mb-4 text-[var(--color-text)]">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {items.map((item, index) => {
          const bgColor = item.color || techColors[item.name] || "#6B7280";
          const isLightBg = isLightColor(bgColor);

          return (
            <div
              key={index}
              className="tech-item flex items-center gap-2 px-3 py-2 rounded-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: bgColor,
                color: isLightBg ? "#1a1a1a" : "#ffffff",
              }}
            >
              {item.icon && (
                <span className="text-lg">{item.icon}</span>
              )}
              <span className="font-medium text-sm">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
