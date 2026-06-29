import { addDaysToLocalDateKey } from '@entities/day-plan';
import type { HistoryDailyStat } from '@entities/history';

export type CompletionTrendChartPaths = {
  lineD: string;
  areaD: string;
  endX: number;
  endY: number;
};

type Point = { x: number; y: number };

const CHART_WIDTH = 320;
const CHART_HEIGHT = 80;
const PAD_X = 14;
const PAD_Y = 12;

function clampRate(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function listDateKeysInclusive(startDateKey: string, endDateKey: string): string[] {
  const keys: string[] = [];
  let cursor = startDateKey;
  while (cursor <= endDateKey) {
    keys.push(cursor);
    if (cursor === endDateKey) break;
    cursor = addDaysToLocalDateKey(cursor, 1);
  }
  return keys;
}

function sampleDateKeys(keys: string[], maxPoints: number): string[] {
  if (keys.length <= maxPoints) return keys;
  const step = Math.max(1, Math.floor((keys.length - 1) / (maxPoints - 1)));
  const sampled: string[] = [];
  for (let idx = 0; idx < keys.length; idx += step) {
    sampled.push(keys[idx]!);
  }
  const last = keys[keys.length - 1]!;
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function coordsFromRates(
  rates: number[],
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
  padX = PAD_X,
  padY = PAD_Y,
): Point[] {
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;
  if (rates.length === 0) return [];
  if (rates.length === 1) {
    return [{ x: padX, y: padY + (1 - rates[0]!) * innerHeight }];
  }
  const xStep = innerWidth / (rates.length - 1);
  return rates.map((rate, idx) => ({
    x: padX + idx * xStep,
    y: padY + (1 - rate) * innerHeight,
  }));
}

function buildSmoothLinePath(coords: Point[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0]!.x} ${coords[0]!.y}`;
  let d = `M ${coords[0]!.x} ${coords[0]!.y}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] ?? coords[i]!;
    const p1 = coords[i]!;
    const p2 = coords[i + 1]!;
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function buildAreaPath(coords: Point[], baselineY: number): string {
  if (coords.length === 0) return '';
  const lineD = buildSmoothLinePath(coords);
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  return `${lineD} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function pathsFromRates(rates: number[]): CompletionTrendChartPaths {
  const coords = coordsFromRates(rates);
  const baselineY = CHART_HEIGHT - PAD_Y;
  if (coords.length === 0) {
    return { lineD: '', areaD: '', endX: PAD_X, endY: baselineY };
  }
  if (rates.every((v) => v === 0)) {
    const y = baselineY;
    const x1 = PAD_X;
    const x2 = CHART_WIDTH - PAD_X;
    return {
      lineD: `M ${x1} ${y} L ${x2} ${y}`,
      areaD: '',
      endX: x2,
      endY: y,
    };
  }
  const last = coords[coords.length - 1]!;
  return {
    lineD: buildSmoothLinePath(coords),
    areaD: buildAreaPath(coords, baselineY),
    endX: last.x,
    endY: last.y,
  };
}

/** 월간·기간 카드용 — 완료율(0~1)을 고정 스케일로 표시 */
export function buildCompletionTrendChartPaths(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
  maxPoints = 24,
): CompletionTrendChartPaths {
  const keys = sampleDateKeys(listDateKeysInclusive(startDateKey, endDateKey), maxPoints);
  const rates = keys.map((key) => {
    const row = dailyStatsByDate[key];
    return row ? clampRate(row.completionRate) : 0;
  });
  return pathsFromRates(rates);
}

/** 월간 마일스톤 카드용 스파크라인 */
export function buildGrowthTrendChartPaths(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  todayDateKey: string,
  pointCount = 8,
): CompletionTrendChartPaths {
  const span = 30;
  const step = Math.max(1, Math.floor(span / pointCount));
  const rates: number[] = [];
  for (let i = 0; i < pointCount; i += 1) {
    const offset = -span + 1 + i * step;
    const dateKey = addDaysToLocalDateKey(todayDateKey, offset);
    const row = dailyStatsByDate[dateKey];
    rates.push(row ? clampRate(row.completionRate) : 0);
  }
  return pathsFromRates(rates);
}

export const COMPLETION_TREND_CHART_VIEWBOX = {
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
} as const;
