/** 완성 사진 위 손글씨. 좌표는 보드 가로·세로 대비 0~1. */

export const PUZZLE_INK_COLORS = [
  '#1A1A1A',
  '#FFFFFF',
  '#E15A5A',
  '#F0C14A',
  '#3E7FD6',
  '#2F8F8C',
  '#E48BB4',
] as const;

export type PuzzleInkColor = (typeof PUZZLE_INK_COLORS)[number];

export type PuzzleInkPoint = {
  x: number;
  y: number;
};

export type PuzzleInkStroke = {
  color: PuzzleInkColor;
  points: PuzzleInkPoint[];
};

/** 보드 너비 대비 획 굵기. 저장 이미지 캔버스도 같은 비율을 쓴다. */
export const PUZZLE_INK_WIDTH = 0.009;

export const PUZZLE_INK_MAX_STROKES = 48;

export const PUZZLE_INK_MAX_POINTS = 160;

/** 보드 크기 대비. 이보다 가까운 점은 한 획에서 생략한다. */
export const PUZZLE_INK_MIN_DISTANCE = 0.008;

const INK_COLOR_SET = new Set<string>(PUZZLE_INK_COLORS);

export function sanitizePuzzleInkStrokes(raw: unknown): PuzzleInkStroke[] {
  if (!Array.isArray(raw)) return [];
  const strokes: PuzzleInkStroke[] = [];
  const source = raw.length > PUZZLE_INK_MAX_STROKES ? raw.slice(-PUZZLE_INK_MAX_STROKES) : raw;
  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const color = (item as { color?: unknown }).color;
    if (typeof color !== 'string' || !INK_COLOR_SET.has(color)) continue;
    const pointsRaw = (item as { points?: unknown }).points;
    if (!Array.isArray(pointsRaw)) continue;
    const points: PuzzleInkPoint[] = [];
    const pointSource =
      pointsRaw.length > PUZZLE_INK_MAX_POINTS
        ? pointsRaw.slice(0, PUZZLE_INK_MAX_POINTS)
        : pointsRaw;
    for (const point of pointSource) {
      if (!point || typeof point !== 'object') continue;
      const x = Number((point as { x?: unknown }).x);
      const y = Number((point as { y?: unknown }).y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push({
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      });
    }
    if (points.length === 0) continue;
    strokes.push({ color: color as PuzzleInkColor, points });
  }
  return strokes;
}
