import { Asset } from 'expo-asset';
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
  artworkUri?: string;
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

/** Prefer an already-local file URI so the widget native bridge can copy into App Group. */
async function resolveCatalogArtworkUri(imageId: string): Promise<string | undefined> {
  const catalog = COMIC_SCENES.find((item) => item.id === imageId);
  if (!catalog) return undefined;
  try {
    const asset = Asset.fromModule(catalog.source);
    if (!asset.localUri) await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    return typeof uri === 'string' && uri.length > 0 ? uri : undefined;
  } catch {
    return undefined;
  }
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
        ...(scene.artworkUri ? { artworkUri: scene.artworkUri } : {}),
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

/** Attach local file URIs for catalog scenes so the widget need not ship a full JPG catalog. */
export async function buildComicSceneWidgetBundleWithArtwork(
  library: ComicDiaryLibrary,
): Promise<ComicSceneWidgetBundle> {
  const bundle = buildComicSceneWidgetBundle(library);
  const scenes = await Promise.all(
    bundle.scenes.map(async (scene) => {
      if (scene.artworkUri) return scene;
      const artworkUri = await resolveCatalogArtworkUri(scene.imageId);
      return artworkUri ? { ...scene, artworkUri } : scene;
    }),
  );
  return { ...bundle, scenes };
}

export function syncComicSceneWidgetToWidget(library: ComicDiaryLibrary): void {
  if (Platform.OS !== 'ios') return;
  const module = NativeModules.PokitWidgetSync as ComicSceneWidgetNativeModule | undefined;
  if (!module?.syncComicSceneWidgetJson) return;

  void (async () => {
    try {
      const bundle = await buildComicSceneWidgetBundleWithArtwork(library);
      module.syncComicSceneWidgetJson?.(JSON.stringify(bundle));
    } catch {
      // Widget refresh is best-effort and must not interrupt editing the diary.
    }
  })();
}
