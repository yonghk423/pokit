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

/**
 * 시드 = 처음부터 붙어 있는 포스트잇 수.
 * 너무 많으면 가운데까지 미리 채워져 완성 전 윤곽이 드러난다.
 */
export function seedCountForTarget(targetCount: PuzzleHistoryTarget): number {
  if (targetCount === 1) return 4;
  if (targetCount === 10) return 4;
  if (targetCount === 20) return 5;
  if (targetCount === 50) return 6;
  return 6;
}

/** 보드 중심에서 멀수록 큼 — 시드는 가장자리부터, 가운데는 progress로 남긴다 */
function edgePriority(t: Pick<RawTile, 'x' | 'y' | 'w' | 'h'>): number {
  const cx = t.x + t.w * 0.5;
  const cy = t.y + t.h * 0.5;
  return Math.abs(cx - 0.5) + Math.abs(cy - 0.5);
}

/** 타일이 보드 중심 사각과 겹치는 면적 (대략) */
function centerOverlapArea(t: Pick<RawTile, 'x' | 'y' | 'w' | 'h'>): number {
  const x1 = Math.max(t.x, 0.28);
  const y1 = Math.max(t.y, 0.28);
  const x2 = Math.min(t.x + t.w, 0.72);
  const y2 = Math.min(t.y + t.h, 0.72);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
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
 * 가장자리까지 덮어 완성 시 원본 구도가 보드에 다 채워지게 한다.
 * 이후 큰 장을 갈라 목표 장수까지 채운다.
 */
function initialCollageTiles(): RawTile[] {
  /** seedScore: 가장자리 높음 · 가운데(c/d/f) 낮음 — 초기엔 테두리만 붙게 */
  const base: Array<Omit<RawTile, 'imgX' | 'imgY' | 'imgW' | 'imgH' | 'rotate'>> = [
    { id: 'a', x: -0.03, y: -0.03, w: 0.52, h: 0.36, z: 2, fill: 'image', seedScore: 10 },
    { id: 'b', x: 0.38, y: -0.03, w: 0.65, h: 0.34, z: 3, fill: 'image', seedScore: 10 },
    { id: 'c', x: -0.03, y: 0.22, w: 0.48, h: 0.4, z: 4, fill: 'image', seedScore: 3 },
    { id: 'd', x: 0.34, y: 0.18, w: 0.58, h: 0.42, z: 5, fill: 'image', seedScore: 1 },
    { id: 'e', x: -0.03, y: 0.46, w: 0.5, h: 0.38, z: 3, fill: 'image', seedScore: 5 },
    { id: 'f', x: 0.3, y: 0.42, w: 0.62, h: 0.4, z: 6, fill: 'image', seedScore: 2 },
    { id: 'g', x: -0.03, y: 0.68, w: 0.52, h: 0.36, z: 2, fill: 'image', seedScore: 9 },
    { id: 'h', x: 0.36, y: 0.64, w: 0.62, h: 0.4, z: 4, fill: 'image', seedScore: 9 },
    { id: 'i', x: 0.58, y: 0.28, w: 0.4, h: 0.32, z: 7, fill: 'image', seedScore: 7 },
    { id: 'j', x: -0.03, y: 0.3, w: 0.32, h: 0.3, z: 1, fill: 'image', seedScore: 8 },
    { id: 'k', x: 0.66, y: 0.52, w: 0.38, h: 0.32, z: 5, fill: 'image', seedScore: 8 },
    { id: 'l', x: 0.16, y: 0.06, w: 0.38, h: 0.28, z: 8, fill: 'image', seedScore: 6 },
  ];

  return base.map((t, i) => {
    /** 손 붙인 느낌 — 최소 위치·기울기 */
    const jx = (rand(i * 3 + 1) - 0.5) * 0.01;
    const jy = (rand(i * 3 + 2) - 0.5) * 0.01;
    const rotate = (rand(i * 3 + 3) - 0.5) * 2.4;
    const x = t.x + jx;
    const y = t.y + jy;
    const w = t.w;
    const h = t.h;
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
 * 프레임 좌표에 사진 창을 1:1로 맞춘다.
 * 드리프트 없이 맞춰야 완성 콜라주가 원본 구도를 그대로 보여 준다.
 */
function syncImageWindowToFrame(tile: RawTile, _salt?: number): RawTile {
  return {
    ...tile,
    imgX: tile.x,
    imgY: tile.y,
    imgW: tile.w,
    imgH: tile.h,
  };
}

/**
 * amount > 0 키움 · < 0 줄임.
 * 아주 약하게 줄여 장 사이 미세한 틈만 남긴다.
 */
function inflateTile(tile: RawTile, amount: number): RawTile {
  const growX = tile.w * amount;
  const growY = tile.h * amount;
  const next = {
    ...tile,
    x: tile.x - growX / 2,
    y: tile.y - growY / 2,
    w: Math.max(0.04, tile.w + growX),
    h: Math.max(0.04, tile.h + growY),
  };
  return syncImageWindowToFrame(next);
}

function splitTile(tile: RawTile, salt: number): [RawTile, RawTile] {
  const vertical = tile.w >= tile.h;
  const t = 0.42 + rand(salt) * 0.16;
  const rotA = (rand(salt + 1) - 0.5) * 2.2;
  const rotB = (rand(salt + 2) - 0.5) * 2.2;
  /** 분할 시 거의 없는 흔들림·틈 */
  const j = 0.003;
  const gap = 0.001;

  if (vertical) {
    const w1 = Math.max(0.04, tile.w * t - gap / 2);
    const left = syncImageWindowToFrame(
      {
        ...tile,
        id: `${tile.id}-a`,
        w: w1,
        rotate: rotA,
        z: tile.z + 1,
        seedScore: Math.max(0, tile.seedScore - 1),
        x: tile.x + (rand(salt + 3) - 0.5) * j,
        y: tile.y + (rand(salt + 4) - 0.5) * j,
      },
      salt + 21,
    );
    const right = syncImageWindowToFrame(
      {
        ...tile,
        id: `${tile.id}-b`,
        x: tile.x + w1 + gap + (rand(salt + 5) - 0.5) * j,
        y: tile.y + (rand(salt + 6) - 0.5) * j,
        w: Math.max(0.04, tile.w - w1 - gap),
        rotate: rotB,
        z: tile.z + 2,
        seedScore: Math.max(0, tile.seedScore - 1),
      },
      salt + 34,
    );
    return [left, right];
  }

  const h1 = Math.max(0.04, tile.h * t - gap / 2);
  const top = syncImageWindowToFrame(
    {
      ...tile,
      id: `${tile.id}-a`,
      h: h1,
      rotate: rotA,
      z: tile.z + 1,
      seedScore: Math.max(0, tile.seedScore - 1),
      x: tile.x + (rand(salt + 3) - 0.5) * j,
      y: tile.y + (rand(salt + 4) - 0.5) * j,
    },
    salt + 21,
  );
  const bottom = syncImageWindowToFrame(
    {
      ...tile,
      id: `${tile.id}-b`,
      x: tile.x + (rand(salt + 5) - 0.5) * j,
      y: tile.y + h1 + gap + (rand(salt + 6) - 0.5) * j,
      h: Math.max(0.04, tile.h - h1 - gap),
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
  /** 거의 안 줄여 아주 미세한 틈만 */
  return pool.map((tile) => inflateTile(tile, -0.002));
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

  /**
   * 시드: 가장자리·가운데 겹침 적은 장 우선.
   * progress: 가운데를 메우는 장 → 완성 전에는 중심이 비어 보이게.
   */
  const ranked = [...pool].sort((a, b) => {
    const edge = edgePriority(b) - edgePriority(a);
    if (Math.abs(edge) > 0.04) return edge;
    const center = centerOverlapArea(a) - centerOverlapArea(b);
    if (Math.abs(center) > 1e-6) return center;
    if (b.seedScore !== a.seedScore) return b.seedScore - a.seedScore;
    return areaOf(a) - areaOf(b);
  });

  const seedPieces = ranked.slice(0, seedCount);
  const progressSorted = [...ranked.slice(seedCount, seedCount + targetCount)].sort(
    (a, b) => {
      /** 가운데부터 채워지도록 — 완료할수록 윤곽이 살아남 */
      const center = centerOverlapArea(b) - centerOverlapArea(a);
      if (Math.abs(center) > 1e-6) return center;
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
