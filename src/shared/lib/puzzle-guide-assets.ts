import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

/** 퍼즐 설명서 슬라이드 id — 노트 펼친 에디토리얼 */
export type PuzzleGuideImageId = 'wall' | 'target' | 'photo' | 'tip';

/** 이미지 로드 전 스테이지 배경 — 위젯 설명서와 같은 크림톤 */
export const PUZZLE_GUIDE_STAGE_CREAM = '#F3EBDC';
export const PUZZLE_GUIDE_STAGE_CREAM_DARK = '#2A2620';

/** 위젯 설명서와 같은 노트 펼친 에디토리얼 슬라이드 */
const puzzleGuideAssets: Record<PuzzleGuideImageId, ImageSourcePropType> = {
  wall: require('../../../assets/puzzle-guide/wall.jpg'),
  target: require('../../../assets/puzzle-guide/target.jpg'),
  photo: require('../../../assets/puzzle-guide/photo.jpg'),
  tip: require('../../../assets/puzzle-guide/tip.jpg'),
};

export function getPuzzleGuideImage(id: PuzzleGuideImageId): ImageSourcePropType {
  return puzzleGuideAssets[id];
}

let prefetchPromise: Promise<void> | null = null;

/** 설정 화면 등에서 미리 올려 흰 스테이지 대기를 줄인다. */
export function prefetchPuzzleGuideAssets(): Promise<void> {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    const modules = Object.values(puzzleGuideAssets);
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
      console.warn('[puzzle-guide] asset prefetch failed', error);
    }
  });

  return prefetchPromise;
}
