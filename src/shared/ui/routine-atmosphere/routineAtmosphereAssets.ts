import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

/**
 * 루틴 탭·히스토리 분위기 사진 (`assets/unsplash-routine`).
 * collage·다이얼 전용 크롭은 제외.
 */
export const routineAtmosphereAssets = {
  basketball: require('../../../../assets/unsplash-routine/basketball.webp') as ImageSourcePropType,
  handsHeart: require('../../../../assets/unsplash-routine/hands-heart.webp') as ImageSourcePropType,
  catStretch: require('../../../../assets/unsplash-routine/cat-stretch.webp') as ImageSourcePropType,
  deskStretch: require('../../../../assets/unsplash-routine/desk-stretch.webp') as ImageSourcePropType,
  headphones: require('../../../../assets/unsplash-routine/headphones.webp') as ImageSourcePropType,
  lakeJump: require('../../../../assets/unsplash-routine/lake-jump.webp') as ImageSourcePropType,
  mealPrep: require('../../../../assets/unsplash-routine/meal-prep.webp') as ImageSourcePropType,
  morningBrunch: require('../../../../assets/unsplash-routine/morning-brunch.webp') as ImageSourcePropType,
  garageKettlebell: require('../../../../assets/unsplash-routine/garage-kettlebell.webp') as ImageSourcePropType,
  openBook: require('../../../../assets/unsplash-routine/open-book.webp') as ImageSourcePropType,
  peaceShadow: require('../../../../assets/unsplash-routine/peace-shadow.webp') as ImageSourcePropType,
  rockClimb: require('../../../../assets/unsplash-routine/rock-climb.webp') as ImageSourcePropType,
  rockyShore: require('../../../../assets/unsplash-routine/rocky-shore.webp') as ImageSourcePropType,
  sunsetRaise: require('../../../../assets/unsplash-routine/sunset-raise.webp') as ImageSourcePropType,
  sunsetRidge: require('../../../../assets/unsplash-routine/sunset-ridge.webp') as ImageSourcePropType,
  tabletCollab: require('../../../../assets/unsplash-routine/tablet-collab.webp') as ImageSourcePropType,
  yogaSunrise: require('../../../../assets/unsplash-routine/yoga-sunrise.webp') as ImageSourcePropType,
  runnersShadow: require('../../../../assets/unsplash-routine/runners-shadow.webp') as ImageSourcePropType,
} as const;

export type RoutineAtmosphereAssetKey = keyof typeof routineAtmosphereAssets;

let prefetchPromise: Promise<void> | null = null;

/** 탭 전환 디코드 지연을 줄이기 위해 분위기 이미지를 미리 올린다. */
export function prefetchRoutineAtmosphereAssets(): Promise<void> {
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    const modules = Object.values(routineAtmosphereAssets);
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
      console.warn('[routine-atmosphere] asset prefetch failed', error);
    }
  });

  return prefetchPromise;
}

export type RoutineAtmosphereVariant =
  | 'catalog'
  | 'templates'
  | 'myRoutines'
  | 'fixed'
  | 'historyWeek'
  | 'historyMonth'
  | 'puzzle';

export type AtmosphereSlot =
  | 'topLeft'
  | 'topRight'
  | 'midLeft'
  | 'midRight'
  | 'bottomLeft'
  | 'bottomRight';

export type AtmosphereLayer = {
  key: RoutineAtmosphereAssetKey;
  source: ImageSourcePropType;
  slot: AtmosphereSlot;
  /** 0–1, 라이트 기준. 다크는 컴포넌트에서 줄임. */
  opacity: number;
};

const A = routineAtmosphereAssets;

const ALL_ASSET_KEYS = Object.keys(routineAtmosphereAssets) as RoutineAtmosphereAssetKey[];

/** 탭당 배경 3장 — 모서리로 흩뿌려 부담을 줄임 */
const LAYER_SLOTS: AtmosphereSlot[] = ['topLeft', 'topRight', 'bottomRight'];
const LAYER_OPACITIES = [0.55, 0.52, 0.68] as const;
const ATMOSPHERE_LAYER_COUNT = 3;
const FOOTER_STRIP_COUNT = 3;

/** 세션 동안 variant별 픽을 고정해 리렌더·탭 재진입 시 깜빡임을 막음 */
const layerPickCache = new Map<RoutineAtmosphereVariant, AtmosphereLayer[]>();
const footerPickCache = new Map<RoutineAtmosphereVariant, ImageSourcePropType[]>();

function sampleKeys(
  count: number,
  exclude: ReadonlySet<RoutineAtmosphereAssetKey> = new Set(),
): RoutineAtmosphereAssetKey[] {
  const pool = ALL_ASSET_KEYS.filter((key) => !exclude.has(key));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** 화면별로 랜덤 3장 — 세션 동안 동일 */
export function atmosphereLayersForVariant(
  variant: RoutineAtmosphereVariant,
): AtmosphereLayer[] {
  const cached = layerPickCache.get(variant);
  if (cached) return cached;

  const keys = sampleKeys(ATMOSPHERE_LAYER_COUNT);
  const layers = keys.map((key, index) => ({
    key,
    source: A[key],
    slot: LAYER_SLOTS[index] ?? 'bottomRight',
    opacity: LAYER_OPACITIES[index] ?? 0.55,
  }));
  layerPickCache.set(variant, layers);
  return layers;
}

export function headerArtForVariant(
  variant: RoutineAtmosphereVariant,
): ImageSourcePropType {
  switch (variant) {
    case 'templates':
      return A.yogaSunrise;
    case 'myRoutines':
      return A.deskStretch;
    case 'fixed':
      return A.mealPrep;
    case 'historyWeek':
      return A.openBook;
    case 'historyMonth':
      return A.handsHeart;
    case 'puzzle':
      return A.peaceShadow;
    case 'catalog':
    default:
      return A.headphones;
  }
}

/** 스크롤 하단 스크랩북 — 배경과 겹치지 않는 랜덤 3장 */
export function footerStripForVariant(
  variant: RoutineAtmosphereVariant,
): ImageSourcePropType[] {
  const cached = footerPickCache.get(variant);
  if (cached) return cached;

  const usedByLayers = new Set(
    atmosphereLayersForVariant(variant).map((layer) => layer.key),
  );
  const keys = sampleKeys(FOOTER_STRIP_COUNT, usedByLayers);
  const sources = keys.map((key) => A[key]);
  footerPickCache.set(variant, sources);
  return sources;
}

export const ATMOSPHERE_SLOT_STYLE: Record<AtmosphereSlot, StyleProp<ImageStyle>> = {
  topLeft: {
    position: 'absolute',
    left: -44,
    top: 8,
    width: 168,
    height: 168,
    transform: [{ rotate: '-5deg' }],
  },
  topRight: {
    position: 'absolute',
    right: -36,
    top: 64,
    width: 148,
    height: 148,
    transform: [{ rotate: '7deg' }],
  },
  midLeft: {
    position: 'absolute',
    left: -52,
    top: '38%',
    width: 160,
    height: 160,
    transform: [{ rotate: '4deg' }],
  },
  midRight: {
    position: 'absolute',
    right: -48,
    top: '42%',
    width: 176,
    height: 176,
    transform: [{ rotate: '-6deg' }],
  },
  bottomLeft: {
    position: 'absolute',
    left: -40,
    bottom: 120,
    width: 180,
    height: 180,
    transform: [{ rotate: '3deg' }],
  },
  bottomRight: {
    position: 'absolute',
    right: -32,
    bottom: 88,
    width: 260,
    height: 260,
  },
};
