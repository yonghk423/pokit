import { Image } from 'react-native';

import type { AppLocale } from '@shared/lib/i18n/model/locale';
import { getAppLocale } from '@shared/lib/i18n/model/localeStore';

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

/** `assets/puzzle/*.webp` 9장 — 콜라주·스플래시와 동일 세트 */
const ASSET_BASKETBALL = require('../../../../../../assets/puzzle/basketball.webp');
const ASSET_HANDS_HEART = require('../../../../../../assets/puzzle/hands-heart.webp');
const ASSET_DESK_STRETCH = require('../../../../../../assets/puzzle/desk-stretch.webp');
const ASSET_LAKE_JUMP = require('../../../../../../assets/puzzle/lake-jump.webp');
const ASSET_MEAL_PREP = require('../../../../../../assets/puzzle/meal-prep.webp');
const ASSET_GARAGE_KETTLEBELL = require('../../../../../../assets/puzzle/garage-kettlebell.webp');
const ASSET_OPEN_BOOK = require('../../../../../../assets/puzzle/open-book.webp');
const ASSET_PEACE_SHADOW = require('../../../../../../assets/puzzle/peace-shadow.webp');
const ASSET_ROCKY_SHORE = require('../../../../../../assets/puzzle/rocky-shore.webp');

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

function shiftDaysIso(base: Date, dayOffset: number): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

function buildPieces(
  targetCount: PuzzleHistoryTargetRow,
  completedCount: number,
  /** 마지막(가장 최근) 조각 완료 시각 — 이전 조각은 하루씩 앞당김 */
  lastCompletedAt: Date,
): PuzzlePieceRow[] {
  const capped = Math.max(0, Math.min(targetCount, completedCount));
  const rows: PuzzlePieceRow[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const completed = i < capped;
    rows.push({
      puzzleIndex: i,
      completed,
      completedAt: completed
        ? shiftDaysIso(lastCompletedAt, i - (capped - 1))
        : undefined,
    });
  }
  return rows;
}

/**
 * Dev 전용 Puzzle 목업 — 현재 `assets/puzzle` webp 9장 전부 완료(앨범).
 * 순서·에셋은 collage/스플래시 세트와 맞춘다.
 */
function buildPuzzleSeedSpecs(): PuzzleSeedSpec[] {
  return [
    {
      idSuffix: 'album_10_basketball',
      targetCount: 10,
      completedCount: 10,
      status: 'completed',
      asset: ASSET_BASKETBALL,
      linkedCategoryKeys: ['reading', 'work'],
      title: { ko: '한 슛', en: 'One shot', ja: 'ワンショット' },
    },
    {
      idSuffix: 'album_20_hands_heart',
      targetCount: 20,
      completedCount: 20,
      status: 'completed',
      asset: ASSET_HANDS_HEART,
      linkedCategoryKeys: ['reading', 'work', 'water', 'fasting', 'healthIntake'],
      title: { ko: '하트 실루엣', en: 'Hands heart', ja: 'ハートの影' },
    },
    {
      idSuffix: 'album_50_desk',
      targetCount: 50,
      completedCount: 50,
      status: 'completed',
      asset: ASSET_DESK_STRETCH,
      linkedCategoryKeys: ['work'],
      title: { ko: '책상 스트레칭', en: 'Desk stretch', ja: 'デスクストレッチ' },
    },
    {
      idSuffix: 'album_100_lake',
      targetCount: 100,
      completedCount: 100,
      status: 'completed',
      asset: ASSET_LAKE_JUMP,
      linkedCategoryKeys: ['stretch'],
      title: { ko: '호수 점프', en: 'Lake jump', ja: '湖へジャンプ' },
    },
    {
      idSuffix: 'album_10_meal',
      targetCount: 10,
      completedCount: 10,
      status: 'completed',
      asset: ASSET_MEAL_PREP,
      linkedCategoryKeys: ['reading', 'work', 'water'],
      title: { ko: '식탁 준비', en: 'Meal prep', ja: '食事の準備' },
    },
    {
      idSuffix: 'album_20_garage_kettlebell',
      targetCount: 20,
      completedCount: 20,
      status: 'completed',
      asset: ASSET_GARAGE_KETTLEBELL,
      linkedCategoryKeys: ['stretch', 'reading'],
      title: { ko: '차고 케틀벨', en: 'Garage kettlebell', ja: 'ガレージのケトルベル' },
    },
    {
      idSuffix: 'album_50_open_book',
      targetCount: 50,
      completedCount: 50,
      status: 'completed',
      asset: ASSET_OPEN_BOOK,
      linkedCategoryKeys: ['reading'],
      title: { ko: '펼친 책', en: 'Open book', ja: '開いた本' },
    },
    {
      idSuffix: 'album_100_peace',
      targetCount: 100,
      completedCount: 100,
      status: 'completed',
      asset: ASSET_PEACE_SHADOW,
      linkedCategoryKeys: ['work'],
      title: { ko: '그림자 브이', en: 'Peace shadow', ja: '影のピース' },
    },
    {
      idSuffix: 'album_10_rocky',
      targetCount: 10,
      completedCount: 10,
      status: 'completed',
      asset: ASSET_ROCKY_SHORE,
      linkedCategoryKeys: [
        'reading',
        'work',
        'water',
        'fasting',
        'healthIntake',
        'other',
        'review',
        'sampleStretch',
        'sampleWalk',
        'sampleMeditation',
      ],
      title: { ko: '반짝이는 해안', en: 'Rocky shore glow', ja: 'きらめく岸辺' },
    },
  ];
}

function buildHistoryRow(
  spec: PuzzleSeedSpec,
  locale: AppLocale,
  now: Date,
): PuzzleHistoryRow {
  const pieces = buildPieces(spec.targetCount, spec.completedCount, now);
  const completedCount = pieces.filter((r) => r.completed).length;
  const status =
    completedCount >= spec.targetCount ? 'completed' : spec.status === 'completed' ? 'completed' : 'active';
  const imageUri = resolveAssetUri(spec.asset, spec.idSuffix);
  const firstPieceAt = pieces.find((r) => r.completed)?.completedAt;
  const lastPieceAt = [...pieces].reverse().find((r) => r.completed)?.completedAt;
  const nowIso = now.toISOString();

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
    createdAt: firstPieceAt ?? nowIso,
    completedAt: status === 'completed' ? lastPieceAt ?? nowIso : undefined,
  };
}

export function seedPuzzleHistoryMockData(now = new Date()): {
  puzzleHistories: number;
  puzzleAlbum: number;
  puzzleActive: number;
} {
  const locale = getAppLocale();
  const specs = buildPuzzleSeedSpecs();
  const mockHistories = specs.map((spec) => buildHistoryRow(spec, locale, now));

  const prev = loadPuzzleHistoryState();
  const kept = prev.histories.filter((h) => !h.id.startsWith(PUZZLE_MOCK_ID_PREFIX));
  const histories = [...kept, ...mockHistories];
  const active =
    mockHistories.find((h) => h.status === 'active') ??
    kept.find((h) => h.status === 'active') ??
    null;

  savePuzzleHistoryState({
    schemaVersion: 2,
    histories,
    activeHistoryId: active?.id ?? null,
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
  version: 22,
  async seed() {
    return seedPuzzleHistoryMockData();
  },
  async clear() {
    clearPuzzleHistoryMockData();
  },
};
