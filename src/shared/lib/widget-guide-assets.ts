import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

import type { AppLocale } from '@shared/lib/i18n/model/locale';

/** 노트북 에디토리얼 튜토리얼 슬라이드 id */
export type WidgetGuideImageId = 'intro' | 'edit' | 'bookstore' | 'note' | 'tip';

/** 이미지 로드 전 스테이지 배경 — 노트북 크림톤 (흰 플래시 방지) */
export const WIDGET_GUIDE_STAGE_CREAM = '#F3EBDC';
export const WIDGET_GUIDE_STAGE_CREAM_DARK = '#2A2620';

const koNotebookAssets: Record<WidgetGuideImageId, ImageSourcePropType> = {
  intro: require('../../../assets/widget/tutorial/pokit-widget-notebook-01-intro.webp'),
  edit: require('../../../assets/widget/tutorial/pokit-widget-notebook-02-edit.webp'),
  bookstore: require('../../../assets/widget/tutorial/pokit-widget-notebook-03-bookstore.webp'),
  note: require('../../../assets/widget/tutorial/pokit-widget-notebook-05-note.webp'),
  tip: require('../../../assets/widget/tutorial/pokit-widget-notebook-04-tip-turn.webp'),
};

const enNotebookAssets: Record<WidgetGuideImageId, ImageSourcePropType> = {
  intro: require('../../../assets/widget/tutorial/pokit-widget-notebook-01-intro-en.webp'),
  edit: require('../../../assets/widget/tutorial/pokit-widget-notebook-02-edit-en.webp'),
  bookstore: require('../../../assets/widget/tutorial/pokit-widget-notebook-03-bookstore-en.webp'),
  note: require('../../../assets/widget/tutorial/pokit-widget-notebook-05-note-en.webp'),
  tip: require('../../../assets/widget/tutorial/pokit-widget-notebook-04-tip-en.webp'),
};

const jaNotebookAssets: Record<WidgetGuideImageId, ImageSourcePropType> = {
  intro: require('../../../assets/widget/tutorial/pokit-widget-notebook-01-intro-ja.webp'),
  edit: require('../../../assets/widget/tutorial/pokit-widget-notebook-02-edit-ja.webp'),
  bookstore: require('../../../assets/widget/tutorial/pokit-widget-notebook-03-bookstore-ja.webp'),
  note: require('../../../assets/widget/tutorial/pokit-widget-notebook-05-note-ja.webp'),
  tip: require('../../../assets/widget/tutorial/pokit-widget-notebook-04-tip-ja.webp'),
};

function notebookAssetsForLocale(
  locale: AppLocale,
): Record<WidgetGuideImageId, ImageSourcePropType> {
  if (locale === 'en') return enNotebookAssets;
  if (locale === 'ja') return jaNotebookAssets;
  return koNotebookAssets;
}

/** 로케일별 노트북 에디토리얼 이미지 */
export function getWidgetGuideImage(
  id: WidgetGuideImageId,
  locale: AppLocale,
): ImageSourcePropType {
  return notebookAssetsForLocale(locale)[id];
}

const prefetchByLocale = new Map<AppLocale, Promise<void>>();

/** 설정 화면 등에서 미리 올려 흰 스테이지 대기를 줄인다. */
export function prefetchWidgetGuideAssets(locale: AppLocale): Promise<void> {
  const existing = prefetchByLocale.get(locale);
  if (existing) return existing;

  const promise = (async () => {
    const modules = Object.values(notebookAssetsForLocale(locale));
    const assets = await Asset.loadAsync(modules);
    const uris = assets
      .map((asset) => asset.localUri ?? asset.uri)
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
    if (uris.length > 0) {
      await Image.prefetch(uris, 'memory-disk');
    }
  })().catch((error) => {
    prefetchByLocale.delete(locale);
    if (__DEV__) {
      console.warn('[widget-guide] asset prefetch failed', error);
    }
  });

  prefetchByLocale.set(locale, promise);
  return promise;
}
