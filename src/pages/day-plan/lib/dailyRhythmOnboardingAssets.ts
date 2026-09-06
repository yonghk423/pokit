import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

/**
 * 하루 일과 온보딩 전용 일러스트 — 표시 크기에 맞춘 경량 JPEG (`assets/onboarding/`).
 * (원본 1024 PNG ~1.4MB × 3 → 합 ~120KB)
 */
export const dailyRhythmOnboardingAssets = {
  /** 히어로 — 아침 러닝 */
  hero: require('../../../../assets/onboarding/hero.jpg') as ImageSourcePropType,
  /** 하루 시작 행 — 아침 루틴 */
  startThumb: require('../../../../assets/onboarding/start-thumb.jpg') as ImageSourcePropType,
  /** 하루 마무리 행 — 저녁 독서 */
  endThumb: require('../../../../assets/onboarding/end-thumb.jpg') as ImageSourcePropType,
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
