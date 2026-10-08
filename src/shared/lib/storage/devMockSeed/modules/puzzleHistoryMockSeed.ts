import { Image } from 'react-native';

import { getAppLocale } from '@shared/lib/i18n/model/localeStore';
import type { AppLocale } from '@shared/lib/i18n/model/locale';

import {
  clearPuzzleHistoryStorage,
  loadPuzzleHistoryState,
  savePuzzleHistoryState,
  type PuzzleHistoryRow,
  type PuzzleHistoryTargetRow,
  type PuzzlePieceRow,
} from '../../puzzleHistoryStorage';

import type { DevMockSeedModule } from '../types';

export const PUZZLE_MOCK_ID_PREFIX = 'ph_dev_mock_' as const;

const ASSET_BIKE = require('../../../../../../assets/routine/bike.webp');
const ASSET_KITTY = require('../../../../../../assets/routine/kitty.jpg');
const ASSET_FLOWERS = require('../../../../../../assets/routine/flowers.webp');
const ASSET_PLANTS = require('../../../../../../assets/routine/plants.webp');
const ASSET_READING = require('../../../../../../assets/routine/reading.webp');
const ASSET_COFFEE = require('../../../../../../assets/routine/coffee.webp');
const ASSET_JOURNAL = require('../../../../../../assets/routine/journal.webp');
const ASSET_TEA = require('../../../../../../assets/routine/tea.webp');
const ASSET_SWIM = require('../../../../../../assets/routine/swim.webp');

type PuzzleSeedSpec = {
  idSuffix: string;
  targetCount: PuzzleHistoryTargetRow;
  completedCount: number;
  status: 'active' | 'completed';
  asset: number;
  linkedCategoryKeys: string[];
  title: Record<AppLocale, string>;
};

function resolveAssetUri(assetModule: number, fallbackName: string): string {
  try {
    const resolved = Image.resolveAssetSource(assetModule);
    if (resolved?.uri) return resolved.uri;
  } catch {
    // jest 등 네이티브 없는 환경
  }
  return `file:///pokit-mock-puzzle/${fallbackName}.webp`;
}

function buildPieces(
  targetCount: PuzzleHistoryTargetRow,
  completedCount: number,
  completedAt: string,
): PuzzlePieceRow[] {
  const capped = Math.max(0, Math.min(targetCount, completedCount));
  const rows: PuzzlePieceRow[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const completed = i < capped;
    rows.push({
      puzzleIndex: i,
      completed,
      completedAt: completed ? completedAt : undefined,
    });
  }
  return rows;
}

/**
 * 스크린샷·데모용 Puzzle 세트.
 * - 진행 중 여러 개 (포스트잇 리스트 UI 확인용)
 * - Album용 완료본
 */
function buildPuzzleSeedSpecs(): PuzzleSeedSpec[] {
  return [
    {
      idSuffix: 'active_10_kitty',
      targetCount: 10,
      completedCount: 4,
      status: 'active',
      asset: ASSET_KITTY,
      linkedCategoryKeys: ['stretch'],
      title: {
        ko: '야옹이랑 놀아주기',
        en: 'Play with kitty',
        ja: 'にゃんこと遊ぶ',
      },
    },
    {
      idSuffix: 'active_20',
      targetCount: 20,
      completedCount: 8,
      status: 'active',
      asset: ASSET_BIKE,
      linkedCategoryKeys: ['reading', 'stretch'],
      title: {
        ko: '나의 20회',
        en: 'My 20×',
        ja: 'わたしの20回',
      },
    },
    {
      idSuffix: 'active_10_flowers',
      targetCount: 10,
      completedCount: 3,
      status: 'active',
      asset: ASSET_FLOWERS,
      linkedCategoryKeys: ['stretch'],
      title: {
        ko: '꽃 산책',
        en: 'Flower walk',
        ja: '花の散歩',
      },
    },
    {
      idSuffix: 'active_50_plants',
      targetCount: 50,
      completedCount: 12,
      status: 'active',
      asset: ASSET_PLANTS,
      linkedCategoryKeys: ['reading', 'work'],
      title: {
        ko: '초록 루틴',
        en: 'Green routine',
        ja: 'グリーンルーチン',
      },
    },
    {
      idSuffix: 'album_10_walk',
      targetCount: 10,
      completedCount: 10,
      status: 'completed',
      asset: ASSET_FLOWERS,
      linkedCategoryKeys: ['stretch'],
      title: {
        ko: '가을 산책',
        en: 'Autumn walk',
        ja: '秋の散歩',
      },
    },
    {
      idSuffix: 'album_20_jeju',
      targetCount: 20,
      completedCount: 20,
      status: 'completed',
      asset: ASSET_PLANTS,
      linkedCategoryKeys: ['reading'],
      title: {
        ko: '제주 여행',
        en: 'Jeju trip',
        ja: '済州旅行',
      },
    },
    {
      idSuffix: 'album_50_spring',
      targetCount: 50,
      completedCount: 50,
      status: 'completed',
      asset: ASSET_READING,
      linkedCategoryKeys: ['reading'],
      title: {
        ko: '봄 독서',
        en: 'Spring reading',
        ja: '春の読書',
      },
    },
    {
      idSuffix: 'album_100_oct',
      targetCount: 100,
      completedCount: 100,
      status: 'completed',
      asset: ASSET_JOURNAL,
      linkedCategoryKeys: ['reading', 'work'],
      title: {
        ko: '나의 100회',
        en: 'My 100×',
        ja: 'わたしの100回',
      },
    },
    {
      idSuffix: 'album_10_coffee',
      targetCount: 10,
      completedCount: 10,
      status: 'completed',
      asset: ASSET_COFFEE,
      linkedCategoryKeys: ['work'],
      title: {
        ko: '주말 카페',
        en: 'Weekend café',
        ja: '週末カフェ',
      },
    },
    {
      idSuffix: 'album_20_tea',
      targetCount: 20,
      completedCount: 20,
      status: 'completed',
      asset: ASSET_TEA,
      linkedCategoryKeys: ['reading'],
      title: {
        ko: '차 한 잔의 기록',
        en: 'Tea journal',
        ja: 'お茶の記録',
      },
    },
    {
      idSuffix: 'album_10_swim',
      targetCount: 10,
      completedCount: 10,
      status: 'completed',
      asset: ASSET_SWIM,
      linkedCategoryKeys: ['stretch'],
      title: {
        ko: '수영 10회',
        en: 'Swim 10×',
        ja: 'スイム10回',
      },
    },
  ];
}

function buildHistoryRow(
  spec: PuzzleSeedSpec,
  locale: AppLocale,
  nowIso: string,
): PuzzleHistoryRow {
  const pieces = buildPieces(spec.targetCount, spec.completedCount, nowIso);
  const completedCount = pieces.filter((r) => r.completed).length;
  const status =
    completedCount >= spec.targetCount ? 'completed' : spec.status === 'completed' ? 'completed' : 'active';
  const imageUri = resolveAssetUri(spec.asset, spec.idSuffix);

  return {
    id: `${PUZZLE_MOCK_ID_PREFIX}${spec.idSuffix}`,
    title: spec.title[locale] ?? spec.title.en,
    imageUri,
    thumbnailUri: imageUri,
    targetCount: spec.targetCount,
    totalPieces: spec.targetCount,
    completedCount,
    status,
    pieces,
    linkedCategoryKeys: spec.linkedCategoryKeys,
    completionBaseline: 0,
    completionBaselineByCategory: Object.fromEntries(
      spec.linkedCategoryKeys.map((key) => [key, 0]),
    ),
    createdAt: nowIso,
    completedAt: status === 'completed' ? nowIso : undefined,
  };
}

export function seedPuzzleHistoryMockData(now = new Date()): {
  puzzleHistories: number;
  puzzleAlbum: number;
  puzzleActive: number;
} {
  const locale = getAppLocale();
  const nowIso = now.toISOString();
  const specs = buildPuzzleSeedSpecs();
  const mockHistories = specs.map((spec) => buildHistoryRow(spec, locale, nowIso));

  const prev = loadPuzzleHistoryState();
  const kept = prev.histories.filter((h) => !h.id.startsWith(PUZZLE_MOCK_ID_PREFIX));
  const histories = [...kept, ...mockHistories];
  const active = mockHistories.find((h) => h.status === 'active') ?? null;

  savePuzzleHistoryState({
    schemaVersion: 2,
    histories,
    activeHistoryId: active?.id ?? prev.activeHistoryId,
  });

  const activeCount = mockHistories.filter((h) => h.status === 'active').length;
  return {
    puzzleHistories: mockHistories.length,
    puzzleAlbum: mockHistories.filter((h) => h.status === 'completed').length,
    puzzleActive: activeCount,
  };
}

export function clearPuzzleHistoryMockData(): void {
  const prev = loadPuzzleHistoryState();
  const histories = prev.histories.filter((h) => !h.id.startsWith(PUZZLE_MOCK_ID_PREFIX));
  if (histories.length === 0) {
    clearPuzzleHistoryStorage();
    return;
  }
  const activeHistoryId =
    prev.activeHistoryId && histories.some((h) => h.id === prev.activeHistoryId)
      ? prev.activeHistoryId
      : histories.find((h) => h.status === 'active')?.id ?? null;
  savePuzzleHistoryState({
    schemaVersion: 2,
    histories,
    activeHistoryId,
  });
}

export const puzzleHistoryMockSeed: DevMockSeedModule = {
  id: 'puzzle-history',
  version: 6,
  async seed() {
    return seedPuzzleHistoryMockData();
  },
  async clear() {
    clearPuzzleHistoryMockData();
  },
};
