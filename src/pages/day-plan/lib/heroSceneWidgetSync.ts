import { NativeModules, Platform } from 'react-native';
import { t } from '@shared/lib/i18n';

import type { ComicDiaryLibrary } from './heroDiaryStorage';
import { COMIC_SCENES } from './heroSceneImages';

type ComicSceneWidgetNativeModule = {
  syncComicSceneWidgetJson?: (json: string) => void;
};

export type ComicSceneWidgetOption = {
  id: string;
  diaryTitle: string;
  dateKey: string | null;
  title: string;
  imageId: string;
  index: number;
  total: number;
  memo: string;
  todos: { id: string; text: string; completed: boolean }[];
  paper: string;
  pen: string;
};

export type ComicSceneWidgetBundle = {
  version: 1;
  fallbackSceneId: string | null;
  scenes: ComicSceneWidgetOption[];
};

function comicDiaryWidgetDate(diary: ComicDiaryLibrary['diaries'][number]): string | null {
  // Keep migrated day records on their original day, and use local dates for new diaries.
  const legacyDate = /^legacy:.*:(\d{4}-\d{2}-\d{2})$/.exec(diary.id)?.[1];
  if (legacyDate) return legacyDate;
  if (!Number.isFinite(diary.createdAt) || diary.createdAt <= 0) return null;
  const date = new Date(diary.createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function buildComicSceneWidgetBundle(library: ComicDiaryLibrary): ComicSceneWidgetBundle {
  const scenes = library.diaries.flatMap((diary) =>
    diary.scenes.map((scene, index) => {
      const catalog = COMIC_SCENES.find((item) => item.id === scene.image);
      return {
        id: `${diary.id}::${scene.id}`,
        diaryTitle: diary.title,
        dateKey: comicDiaryWidgetDate(diary),
        title: scene.title.trim() || (catalog ? t(catalog.label) : ''),
        imageId: scene.image,
        index: index + 1,
        total: diary.scenes.length,
        memo: scene.memo.trim(),
        todos: scene.todos
          .filter(todo => todo.text.trim().length > 0)
          .map(todo => ({ id: todo.id, text: todo.text.trim(), completed: todo.completed })),
        paper: scene.paper,
        pen: scene.pen,
      };
    }),
  );

  const activeDiary = library.diaries.find((diary) => diary.id === library.activeId);
  const fallbackSceneId = activeDiary?.scenes[0]
    ? `${activeDiary.id}::${activeDiary.scenes[0].id}`
    : scenes[0]?.id ?? null;

  return { version: 1, fallbackSceneId, scenes };
}

export function syncComicSceneWidgetToWidget(library: ComicDiaryLibrary): void {
  if (Platform.OS !== 'ios') return;
  const module = NativeModules.PokitWidgetSync as ComicSceneWidgetNativeModule | undefined;
  if (!module?.syncComicSceneWidgetJson) return;

  try {
    module.syncComicSceneWidgetJson(JSON.stringify(buildComicSceneWidgetBundle(library)));
  } catch {
    // Widget refresh is best-effort and must not interrupt editing the diary.
  }
}
