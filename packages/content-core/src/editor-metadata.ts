import type {
  ContentType,
  DiaryMetadata,
  ContentMetadata,
} from './types';
import { inferDiaryFromFileName } from './diary-contract';
import { resolveDiaryDisplay } from './display-metadata';

export function normalizeEditorMetadata(
  fileName: string,
  type: ContentType,
  metadata: ContentMetadata
): ContentMetadata {
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
