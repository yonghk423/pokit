import { NativeModules, Platform } from 'react-native';
import { t } from '@shared/lib/i18n';

import type { ComicDiaryLibrary } from './comicDiaryStorage';
import { COMIC_SCENES } from './comicSceneImages';

type ComicSceneWidgetNativeModule = {
  syncComicSceneWidgetJson?: (json: string) => void;
};

export type ComicSceneWidgetOption = {
  id: string;
  diaryTitle: string;
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

export function buildComicSceneWidgetBundle(library: ComicDiaryLibrary): ComicSceneWidgetBundle {
  const scenes = library.diaries.flatMap((diary) =>
    diary.scenes.map((scene, index) => {
      const catalog = COMIC_SCENES.find((item) => item.id === scene.image);
      return {
        id: `${diary.id}::${scene.id}`,
        diaryTitle: diary.title,
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
