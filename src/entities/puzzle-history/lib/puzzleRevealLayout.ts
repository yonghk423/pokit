import type { PuzzleHistoryTarget } from '../model/types';

/** 포스트잇 콜라주 캔버스 (세로형) */
export const PUZZLE_POSTIT_WIDTH = 1000;
export const PUZZLE_POSTIT_HEIGHT = 1200;

export type PostItFill = 'image' | 'solid';

/** 공개 진행 포스트잇 1장 */
export type PuzzleRevealUnit = {
  puzzleIndex: number;
  /** 보드 정규화 좌표 [0,1] */
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  /** 도 단위, 소폭 기울기 */
  rotate: number;
  fill: PostItFill;
  solidColor?: string;
  /** 사진 창(지터 전 논리 좌표) — 어긋난 콜라주용 */
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  kind: 'progress';
  /** @deprecated 직소 path — 미사용 */
  path?: string;
  /** @deprecated */
  tx?: number;
  /** @deprecated */
  ty?: number;
};

/** 시작부터 붙어 있는 시드 포스트잇 */
export type PuzzleSeedPiece = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotate: number;
  fill: PostItFill;
  solidColor?: string;
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  kind: 'seed';
  /** @deprecated */
  path?: string;
  tx?: number;
  ty?: number;
};

export type PuzzleRevealLayout = {
  targetCount: PuzzleHistoryTarget;
  /** @deprecated targetCount */
  duration: PuzzleHistoryTarget;
  viewBoxWidth: number;
  viewBoxHeight: number;
  /** @deprecated 정사각 시절 호환 — width 사용 */
  viewBox: number;
  seeds: PuzzleSeedPiece[];
  units: PuzzleRevealUnit[];
};

type RawTile = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotate: number;
  fill: PostItFill;
  solidColor?: string;
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  seedScore: number;
};

/** 시드 = 처음부터 붙어 있는 포스트잇 수 */
export function seedCountForTarget(targetCount: PuzzleHistoryTarget): number {
  if (targetCount === 1) return 5;
  if (targetCount === 10) return 6;
  if (targetCount === 20) return 7;
  if (targetCount === 50) return 8;
  return 8;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function areaOf(t: Pick<RawTile, 'w' | 'h'>): number {
  return t.w * t.h;
}

/** 결정적 의사난수 0..1 */
function rand(salt: number): number {
  const x = Math.sin(salt * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 레퍼런스처럼 겹치는 큰 포스트잇 몇 장으로 시작.
 * 이후 큰 장을 갈라 목표 장수까지 채운다.
 */
function initialCollageTiles(): RawTile[] {
  const base: Array<Omit<RawTile, 'imgX' | 'imgY' | 'imgW' | 'imgH' | 'rotate'>> = [
    { id: 'a', x: 0.08, y: 0.06, w: 0.42, h: 0.28, z: 2, fill: 'image', seedScore: 8 },
    { id: 'b', x: 0.38, y: 0.04, w: 0.48, h: 0.26, z: 3, fill: 'image', seedScore: 9 },
    { id: 'c', x: 0.12, y: 0.26, w: 0.36, h: 0.3, z: 4, fill: 'image', seedScore: 10 },
    { id: 'd', x: 0.4, y: 0.22, w: 0.44, h: 0.32, z: 5, fill: 'image', seedScore: 11 },
    { id: 'e', x: 0.06, y: 0.48, w: 0.4, h: 0.28, z: 3, fill: 'image', seedScore: 7 },
    { id: 'f', x: 0.36, y: 0.46, w: 0.5, h: 0.3, z: 6, fill: 'image', seedScore: 10 },
    { id: 'g', x: 0.1, y: 0.7, w: 0.38, h: 0.24, z: 2, fill: 'image', seedScore: 6 },
    { id: 'h', x: 0.42, y: 0.68, w: 0.46, h: 0.26, z: 4, fill: 'image', seedScore: 7 },
    { id: 'i', x: 0.62, y: 0.34, w: 0.28, h: 0.22, z: 7, fill: 'image', seedScore: 5 },
    { id: 'j', x: 0.02, y: 0.34, w: 0.22, h: 0.2, z: 1, fill: 'image', seedScore: 4 },
    { id: 'k', x: 0.72, y: 0.58, w: 0.22, h: 0.2, z: 5, fill: 'image', seedScore: 4 },
    { id: 'l', x: 0.22, y: 0.12, w: 0.24, h: 0.18, z: 8, fill: 'image', seedScore: 6 },
  ];

  return base.map((t, i) => {
    /** 프레임만 살짝 흔들림 — 완성본이 원본과 크게 어긋나지 않게 */
    const jx = (rand(i * 3 + 1) - 0.5) * 0.014;
    const jy = (rand(i * 3 + 2) - 0.5) * 0.014;
    const rotate = (rand(i * 3 + 3) - 0.5) * 2.8;
    const x = clamp01(t.x + jx);
    const y = clamp01(t.y + jy);
    const w = Math.min(t.w, 1 - x);
    const h = Math.min(t.h, 1 - y);
    return {
      ...t,
      x,
      y,
      w,
      h,
      rotate,
      imgX: x,
      imgY: y,
      imgW: w,
      imgH: h,
    };
  });
}

/**
 * 프레임 좌표에 사진 창을 맞춘다.
 * 완성 시 원본과 같은 구도가 보이도록 하고, 아주 작은 잔여 오프셋만 남긴다.
 */
function syncImageWindowToFrame(tile: RawTile, salt: number): RawTile {
  const drift = 0.005;
  const dx = (rand(salt + 11) - 0.5) * drift;
  const dy = (rand(salt + 12) - 0.5) * drift;
  const imgX = clamp01(tile.x + dx);
  const imgY = clamp01(tile.y + dy);
  const imgW = Math.min(tile.w, 1 - imgX);
  const imgH = Math.min(tile.h, 1 - imgY);
  return { ...tile, imgX, imgY, imgW, imgH };
}

function splitTile(tile: RawTile, salt: number): [RawTile, RawTile] {
  const vertical = tile.w >= tile.h;
  const t = 0.4 + rand(salt) * 0.2;
  const rotA = (rand(salt + 1) - 0.5) * 2.6;
  const rotB = (rand(salt + 2) - 0.5) * 2.6;
  /** 분할 시 프레임 흔들림 — 사진 창은 아래에서 프레임에 재동기화 */
  const j = 0.006;

  if (vertical) {
    const w1 = tile.w * t;
    const left = syncImageWindowToFrame(
      {
        ...tile,
        id: `${tile.id}-a`,
        w: w1,
        rotate: rotA,
        z: tile.z + 1,
        seedScore: Math.max(0, tile.seedScore - 1),
        x: clamp01(tile.x + (rand(salt + 3) - 0.5) * j),
        y: clamp01(tile.y + (rand(salt + 4) - 0.5) * j),
      },
      salt + 21,
    );
    const right = syncImageWindowToFrame(
      {
        ...tile,
        id: `${tile.id}-b`,
        x: clamp01(tile.x + w1 + (rand(salt + 5) - 0.5) * j),
        y: clamp01(tile.y + (rand(salt + 6) - 0.5) * j),
        w: tile.w - w1,
        rotate: rotB,
        z: tile.z + 2,
        seedScore: Math.max(0, tile.seedScore - 1),
      },
      salt + 34,
    );
    return [left, right];
  }

  const h1 = tile.h * t;
  const top = syncImageWindowToFrame(
    {
      ...tile,
      id: `${tile.id}-a`,
      h: h1,
      rotate: rotA,
      z: tile.z + 1,
      seedScore: Math.max(0, tile.seedScore - 1),
      x: clamp01(tile.x + (rand(salt + 3) - 0.5) * j),
      y: clamp01(tile.y + (rand(salt + 4) - 0.5) * j),
    },
    salt + 21,
  );
  const bottom = syncImageWindowToFrame(
    {
      ...tile,
      id: `${tile.id}-b`,
      x: clamp01(tile.x + (rand(salt + 5) - 0.5) * j),
      y: clamp01(tile.y + h1 + (rand(salt + 6) - 0.5) * j),
      h: tile.h - h1,
      rotate: rotB,
      z: tile.z + 2,
      seedScore: Math.max(0, tile.seedScore - 1),
    },
    salt + 34,
  );
  return [top, bottom];
}

function collectPool(needed: number): RawTile[] {
  let pool = initialCollageTiles();
  let salt = 0;
  while (pool.length < needed) {
    let best = 0;
    let bestArea = -1;
    for (let i = 0; i < pool.length; i += 1) {
      const a = areaOf(pool[i]!);
      // 이미지 장만 분할 (단색은 유지)
      if (pool[i]!.fill !== 'image') continue;
      if (a > bestArea) {
        bestArea = a;
        best = i;
      }
    }
    if (bestArea <= 0) {
      // fallback: 아무 장이나 분할
      best = 0;
      for (let i = 0; i < pool.length; i += 1) {
        const a = areaOf(pool[i]!);
        if (a > bestArea) {
          bestArea = a;
          best = i;
        }
      }
    }
    const [a, b] = splitTile(pool[best]!, salt + pool.length * 17);
    salt += 1;
    pool = [...pool.slice(0, best), a, b, ...pool.slice(best + 1)];
  }
  return pool;
}

/**
 * 포스트잇 콜라주 레이아웃.
 * 시드는 처음부터, progress는 완료 횟수만큼 하나씩 붙인다.
 * 모든 장은 사진 조각(단색 액센트 없음).
 */
export function buildPuzzleRevealLayout(
  targetCount: PuzzleHistoryTarget,
): PuzzleRevealLayout {
  const seedCount = seedCountForTarget(targetCount);
  const needed = seedCount + targetCount;
  const pool = collectPool(needed);

  const ranked = [...pool].sort((a, b) => {
    if (b.seedScore !== a.seedScore) return b.seedScore - a.seedScore;
    return areaOf(b) - areaOf(a);
  });

  const seedPieces = ranked.slice(0, seedCount);
  const progressSorted = [...ranked.slice(seedCount, seedCount + targetCount)].sort(
    (a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    },
  );

  const seeds: PuzzleSeedPiece[] = seedPieces.map((tile, i) => {
    const synced = syncImageWindowToFrame(tile, i * 19 + 7);
    return {
      id: synced.id || `seed-${i}`,
      x: synced.x,
      y: synced.y,
      w: synced.w,
      h: synced.h,
      z: synced.z,
      rotate: synced.rotate,
      fill: synced.fill,
      solidColor: synced.solidColor,
      imgX: synced.imgX,
      imgY: synced.imgY,
      imgW: synced.imgW,
      imgH: synced.imgH,
      kind: 'seed' as const,
      tx: synced.x * PUZZLE_POSTIT_WIDTH,
      ty: synced.y * PUZZLE_POSTIT_HEIGHT,
    };
  });

  const units: PuzzleRevealUnit[] = progressSorted.map((tile, puzzleIndex) => {
    const synced = syncImageWindowToFrame(tile, puzzleIndex * 23 + 13);
    return {
      puzzleIndex,
      x: synced.x,
      y: synced.y,
      w: synced.w,
      h: synced.h,
      z: synced.z + 10 + puzzleIndex,
      rotate: synced.rotate,
      fill: synced.fill,
      solidColor: synced.solidColor,
      imgX: synced.imgX,
      imgY: synced.imgY,
      imgW: synced.imgW,
      imgH: synced.imgH,
      kind: 'progress' as const,
      tx: synced.x * PUZZLE_POSTIT_WIDTH,
      ty: synced.y * PUZZLE_POSTIT_HEIGHT,
    };
  });

  return {
    targetCount,
    duration: targetCount,
    viewBoxWidth: PUZZLE_POSTIT_WIDTH,
    viewBoxHeight: PUZZLE_POSTIT_HEIGHT,
    viewBox: PUZZLE_POSTIT_WIDTH,
    seeds,
    units,
  };
}

export function unitForPuzzleIndex(
  targetCount: PuzzleHistoryTarget,
  puzzleIndex: number,
): PuzzleRevealUnit | null {
  const layout = buildPuzzleRevealLayout(targetCount);
  return layout.units.find((u) => u.puzzleIndex === puzzleIndex) ?? null;
}

export function totalRevealArea(layout: PuzzleRevealLayout): number {
  const seedArea = layout.seeds.reduce((sum, u) => sum + u.w * u.h, 0);
  const unitArea = layout.units.reduce((sum, u) => sum + u.w * u.h, 0);
  return seedArea + unitArea;
}

export function revealUnitsOverlap(
  a: Pick<PuzzleRevealUnit, 'x' | 'y' | 'w' | 'h'>,
  b: Pick<PuzzleRevealUnit, 'x' | 'y' | 'w' | 'h'>,
): boolean {
  const EPS = 1e-9;
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  return a.x < bx2 - EPS && ax2 > b.x + EPS && a.y < by2 - EPS && ay2 > b.y + EPS;
}

/** @deprecated 직소 뷰박스 — 포스트잇 폭과 동일 역할 */
export const PUZZLE_JIGSAW_VIEWBOX = PUZZLE_POSTIT_WIDTH;
