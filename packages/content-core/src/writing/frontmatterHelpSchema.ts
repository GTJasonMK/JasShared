import type { ContentType } from "../types";

export interface HelpSectionLink {
  id: string;
  title: string;
}

type FrontmatterContentType = Extract<
  ContentType,
  "note" | "diary" | "project" | "roadmap" | "graph" | "page" | "doc"
>;

export interface FrontmatterHelpScenario {
  id: string;
  title: string;
  description: string;
  code: string;
  notes: string[];
}

export interface FrontmatterHelpExample {
  id: string;
  navTitle: string;
  title: string;
  type: FrontmatterContentType;
  description: string;
  suitableFor: string;
  commonPatterns: string[];
  writingTips: string[];
  raw: string;
  scenarioExamples?: FrontmatterHelpScenario[];
}
