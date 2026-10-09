import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

/**
 * 하루 일과 온보딩 전용 일러스트.
 * 히어로: `assets/onboarding/` · 시작·마무리: `assets/unsplash-routine/`
 */
export const dailyRhythmOnboardingAssets = {
  /** 히어로 — 아침 러닝 */
  hero: require('../../../../assets/onboarding/hero.jpg') as ImageSourcePropType,
  /** 하루 시작 행 — 아침 브런치 */
  startThumb: require('../../../../assets/unsplash-routine/morning-brunch.webp') as ImageSourcePropType,
  /** 하루 마무리 행 — 노을 실루엣 */
  endThumb: require('../../../../assets/unsplash-routine/sunset-ridge.webp') as ImageSourcePropType,
} as const;

let prefetchPromise: Promise<void> | null = null;

/** 첫 화면 진입 전 디코드 지연을 줄이기 위해 온보딩 이미지를 미리 올린다. */
export function prefetchDailyRhythmOnboardingAssets(): Promise<void> {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    const modules = Object.values(dailyRhythmOnboardingAssets);
    const assets = await Asset.loadAsync(modules);
    const uris = assets
      .map((asset) => asset.localUri ?? asset.uri)
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
    if (uris.length > 0) {
      await Image.prefetch(uris, 'memory-disk');
    }
  })().catch((error) => {
    prefetchPromise = null;
    if (__DEV__) {
      console.warn('[daily-rhythm-onboarding] asset prefetch failed', error);
    }
  });

  return prefetchPromise;
}
