import type {
  DiaryMetadata,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
} from "./types";
import { resolveDiaryDate, type DiaryNameInference } from "./diary-contract";

function getSlug(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

function normalizeDate(date?: string): string {
  return date?.trim() || "";
}

function normalizeText(value?: string): string {
  return value?.trim() || "";
}

export function resolveNoteDisplay(fileName: string, metadata: NoteMetadata): {
  title: string;
  date: string;
} {
  return {
    title: normalizeText(metadata.title) || getSlug(fileName),
    date: normalizeDate(metadata.date),
  };
}

export function resolveProjectDisplay(
  fileName: string,
  metadata: ProjectMetadata
): {
  name: string;
  date: string;
} {
  return {
    name: normalizeText(metadata.name) || getSlug(fileName),
    date: normalizeDate(metadata.date),
  };
}

export function resolveDiaryDisplay(
  fileName: string,
  metadata: DiaryMetadata,
  inferred?: DiaryNameInference | null
): {
  title: string;
  date: string;
  time: string;
} {
  return {
    title: normalizeText(metadata.title) || normalizeText(inferred?.title) || getSlug(fileName),
    date: resolveDiaryDate(metadata.date, inferred?.date),
    time: normalizeText(metadata.time) || normalizeText(inferred?.time),
  };
}

export function resolveRoadmapDisplay(
  fileName: string,
  metadata: RoadmapMetadata
): {
  title: string;
  date: string;
  status: NonNullable<RoadmapMetadata["status"]>;
} {
  return {
    title: normalizeText(metadata.title) || getSlug(fileName),
    date: normalizeDate(metadata.date),
    status: metadata.status || "active",
  };
}

export function resolveGraphDisplay(
  fileName: string,
  metadata: GraphMetadata
): {
  name: string;
  date: string;
} {
  return {
    name: normalizeText(metadata.name) || getSlug(fileName),
    date: normalizeDate(metadata.date),
  };
}
