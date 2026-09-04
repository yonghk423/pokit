import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

/**
 * 시티팝 분위기 일러스트 (`assets/routine`).
 * 루틴·히스토리 등 탭 뒤 장식 — 화면별 서로 다른 여러 장.
 */
export const routineAtmosphereAssets = {
  baking: require('../../../../assets/routine/screen-1.png') as ImageSourcePropType,
  guitar: require('../../../../assets/routine/screen-2.png') as ImageSourcePropType,
  reading: require('../../../../assets/routine/screen-3.png') as ImageSourcePropType,
  stretch: require('../../../../assets/routine/screen-4.png') as ImageSourcePropType,
  tea: require('../../../../assets/routine/screen-5.png') as ImageSourcePropType,
  desk: require('../../../../assets/routine/screen-6.png') as ImageSourcePropType,
  walk: require('../../../../assets/routine/screen-7.png') as ImageSourcePropType,
  cook: require('../../../../assets/routine/screen-8.png') as ImageSourcePropType,
  plant: require('../../../../assets/routine/screen-9.png') as ImageSourcePropType,
  sleep: require('../../../../assets/routine/screen-10.png') as ImageSourcePropType,
  journal: require('../../../../assets/routine/screen-11.png') as ImageSourcePropType,
  hydrate: require('../../../../assets/routine/screen-12.png') as ImageSourcePropType,
  laundry: require('../../../../assets/routine/screen-13.png') as ImageSourcePropType,
  commute: require('../../../../assets/routine/screen-14.png') as ImageSourcePropType,
  yoga: require('../../../../assets/routine/screen-15.png') as ImageSourcePropType,
  music: require('../../../../assets/routine/screen-16.png') as ImageSourcePropType,
  sunset: require('../../../../assets/routine/screen-17.png') as ImageSourcePropType,
} as const;

export type RoutineAtmosphereAssetKey = keyof typeof routineAtmosphereAssets;

let prefetchPromise: Promise<void> | null = null;

/** 탭 전환 디코드 지연을 줄이기 위해 분위기 PNG를 미리 메모리·디스크에 올린다. */
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
  | 'historyMonth';

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

/** 화면별로 5~6장 — 전역 17장을 고르게 분산 */
export function atmosphereLayersForVariant(
  variant: RoutineAtmosphereVariant,
): AtmosphereLayer[] {
  switch (variant) {
    case 'templates':
      // 목록이 짧아 여백이 크므로 상·중·하 6장 + 불투명도 조금 올림
      return [
        { key: 'reading', source: A.reading, slot: 'topLeft', opacity: 0.62 },
        { key: 'stretch', source: A.stretch, slot: 'topRight', opacity: 0.6 },
        { key: 'tea', source: A.tea, slot: 'midLeft', opacity: 0.64 },
        { key: 'desk', source: A.desk, slot: 'midRight', opacity: 0.7 },
        { key: 'sunset', source: A.sunset, slot: 'bottomLeft', opacity: 0.66 },
        { key: 'baking', source: A.baking, slot: 'bottomRight', opacity: 0.82 },
      ];
    case 'myRoutines':
      return [
        { key: 'hydrate', source: A.hydrate, slot: 'topLeft', opacity: 0.56 },
        { key: 'yoga', source: A.yoga, slot: 'topRight', opacity: 0.54 },
        { key: 'laundry', source: A.laundry, slot: 'midLeft', opacity: 0.5 },
        { key: 'commute', source: A.commute, slot: 'midRight', opacity: 0.6 },
        { key: 'walk', source: A.walk, slot: 'bottomRight', opacity: 0.74 },
        { key: 'tea', source: A.tea, slot: 'bottomLeft', opacity: 0.5 },
      ];
    case 'fixed':
      return [
        { key: 'cook', source: A.cook, slot: 'topLeft', opacity: 0.56 },
        { key: 'sleep', source: A.sleep, slot: 'topRight', opacity: 0.52 },
        { key: 'plant', source: A.plant, slot: 'midRight', opacity: 0.58 },
        { key: 'baking', source: A.baking, slot: 'midLeft', opacity: 0.48 },
        { key: 'music', source: A.music, slot: 'bottomRight', opacity: 0.72 },
        { key: 'laundry', source: A.laundry, slot: 'bottomLeft', opacity: 0.5 },
      ];
    case 'historyWeek':
      return [
        { key: 'journal', source: A.journal, slot: 'topLeft', opacity: 0.56 },
        { key: 'desk', source: A.desk, slot: 'topRight', opacity: 0.54 },
        { key: 'reading', source: A.reading, slot: 'midLeft', opacity: 0.5 },
        { key: 'tea', source: A.tea, slot: 'midRight', opacity: 0.58 },
        { key: 'sunset', source: A.sunset, slot: 'bottomRight', opacity: 0.72 },
        { key: 'sleep', source: A.sleep, slot: 'bottomLeft', opacity: 0.5 },
      ];
    case 'historyMonth':
      return [
        { key: 'stretch', source: A.stretch, slot: 'topLeft', opacity: 0.55 },
        { key: 'yoga', source: A.yoga, slot: 'topRight', opacity: 0.54 },
        { key: 'commute', source: A.commute, slot: 'midLeft', opacity: 0.5 },
        { key: 'music', source: A.music, slot: 'midRight', opacity: 0.6 },
        { key: 'plant', source: A.plant, slot: 'bottomRight', opacity: 0.72 },
        { key: 'hydrate', source: A.hydrate, slot: 'bottomLeft', opacity: 0.52 },
      ];
    case 'catalog':
    default:
      return [
        { key: 'music', source: A.music, slot: 'topLeft', opacity: 0.55 },
        { key: 'guitar', source: A.guitar, slot: 'topRight', opacity: 0.6 },
        { key: 'tea', source: A.tea, slot: 'midLeft', opacity: 0.5 },
        { key: 'plant', source: A.plant, slot: 'midRight', opacity: 0.58 },
        { key: 'walk', source: A.walk, slot: 'bottomRight', opacity: 0.74 },
        { key: 'baking', source: A.baking, slot: 'bottomLeft', opacity: 0.52 },
      ];
  }
}

export function headerArtForVariant(
  variant: RoutineAtmosphereVariant,
): ImageSourcePropType {
  switch (variant) {
    case 'templates':
      return A.tea;
    case 'myRoutines':
      return A.hydrate;
    case 'fixed':
      return A.cook;
    case 'historyWeek':
      return A.journal;
    case 'historyMonth':
      return A.sunset;
    case 'catalog':
    default:
      return A.guitar;
  }
}

/** 스크롤 하단 스크랩북 스트립 — 분위기와 다른 장 추가 노출 */
export function footerStripForVariant(
  variant: RoutineAtmosphereVariant,
): ImageSourcePropType[] {
  switch (variant) {
    case 'templates':
      return [A.yoga, A.guitar, A.walk, A.cook, A.music, A.plant];
    case 'myRoutines':
      return [A.sunset, A.guitar, A.sleep, A.baking];
    case 'fixed':
      return [A.stretch, A.journal, A.desk, A.hydrate];
    case 'historyWeek':
      return [A.guitar, A.walk, A.cook, A.music];
    case 'historyMonth':
      return [A.baking, A.laundry, A.tea, A.reading];
    case 'catalog':
    default:
      return [A.sunset, A.stretch, A.journal, A.cook];
  }
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
