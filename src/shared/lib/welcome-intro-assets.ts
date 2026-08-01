import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

/**
 * 서비스 소개 슬라이드별 배경 (슬라이드 순서와 1:1).
 * 1: pokit5 · 4: pokit4 · 나머지 splash
 */
export const WELCOME_INTRO_BACKGROUNDS: readonly ImageSourcePropType[] = [
  require('../../../assets/pokit5.png'),
  require('../../../assets/splash4.png'),
  require('../../../assets/splash3.png'),
  require('../../../assets/pokit4.png'),
  require('../../../assets/splash5.png'),
] as const;

let prefetchPromise: Promise<void> | null = null;

/** 소개 배경을 메모리·디스크 캐시에 미리 올려 첫 진입 시 디코드 지연을 줄인다. */
export function prefetchWelcomeIntroAssets(): Promise<void> {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    const modules = [...WELCOME_INTRO_BACKGROUNDS];
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
      console.warn('[welcome-intro] asset prefetch failed', error);
    }
  });

  return prefetchPromise;
}
