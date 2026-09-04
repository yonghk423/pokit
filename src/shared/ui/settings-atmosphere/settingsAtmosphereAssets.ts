import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

/** 설정 화면 배경 — splash5.png 단독 */
export const settingsAtmosphereAssets = {
  desk: require('../../../../assets/splash5.png') as ImageSourcePropType,
} as const;

let prefetchPromise: Promise<void> | null = null;

/** 설정 진입 시 디코드 지연을 줄이기 위해 배경 PNG를 미리 올린다. */
export function prefetchSettingsAtmosphereAssets(): Promise<void> {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    const modules = Object.values(settingsAtmosphereAssets);
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
      console.warn('[settings-atmosphere] asset prefetch failed', error);
    }
  });

  return prefetchPromise;
}
