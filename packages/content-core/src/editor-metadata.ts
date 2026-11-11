import type {
  ContentType,
  DiaryMetadata,
  DocMetadata,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
} from './types';
import { inferDiaryFromFileName } from './diary-contract';
import { resolveDiaryDisplay } from './display-metadata';

type EditorMetadata =
  | NoteMetadata
  | ProjectMetadata
  | DiaryMetadata
  | RoadmapMetadata
  | GraphMetadata
  | DocMetadata;

export function normalizeEditorMetadata(
  fileName: string,
  type: ContentType,
  metadata: EditorMetadata
): EditorMetadata {
  if (type !== 'diary') {
    return metadata;
  }

  const diary = metadata as DiaryMetadata;
  const inferred = inferDiaryFromFileName(fileName.replace(/\.md$/i, ''));
  const display = resolveDiaryDisplay(fileName, diary, inferred);

  return {
    ...diary,
    title: display.title,
    date: display.date,
    time: display.time || '00:00',
    tags: diary.tags || [],
    companions: diary.companions || [],
  };
}
