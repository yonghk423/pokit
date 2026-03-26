export type ReadingMetricKey = 'pages_read' | 'pages_left' | 'focus_level';

export type ReadingLiveActivityConfig = {
  startPage: number;
  targetPage: number;
  selectedMetrics: ReadingMetricKey[];
};

export const DEFAULT_READING_LIVE_ACTIVITY_CONFIG: ReadingLiveActivityConfig = {
  startPage: 24,
  targetPage: 120,
  /** 잠금화면 지표 — 전부 해제 가능 */
  selectedMetrics: [],
};

const READING_METRIC_SET = new Set<ReadingMetricKey>([
  'pages_read',
  'pages_left',
  'focus_level',
]);

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

export function getInitialReadingLiveActivityConfig(): ReadingLiveActivityConfig {
  return {
    startPage: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage,
    targetPage: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
    selectedMetrics: [...DEFAULT_READING_LIVE_ACTIVITY_CONFIG.selectedMetrics],
  };
}

export function normalizeReadingMetricSelection(input: unknown): ReadingMetricKey[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique: ReadingMetricKey[] = [];
  for (const value of input) {
    if (typeof value !== 'string') continue;
    if (!READING_METRIC_SET.has(value as ReadingMetricKey)) continue;
    const key = value as ReadingMetricKey;
    if (!unique.includes(key)) unique.push(key);
    if (unique.length >= 3) break;
  }

  return unique;
}

export function normalizeReadingLiveActivityConfig(input: unknown): ReadingLiveActivityConfig {
  const raw =
    input && typeof input === 'object'
      ? (input as Partial<ReadingLiveActivityConfig>)
      : {};

  return {
    startPage: toNonNegativeInt(
      raw.startPage,
      DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage,
    ),
    targetPage: toNonNegativeInt(
      raw.targetPage,
      DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
    ),
    selectedMetrics: normalizeReadingMetricSelection(raw.selectedMetrics),
  };
}

export function deriveReadingProgress(config: ReadingLiveActivityConfig): {
  pagesRead: number;
  pagesLeft: number;
  progressPct: number;
} {
  const pagesRead = Math.max(0, config.targetPage - config.startPage);
  const pagesLeft = Math.max(0, config.startPage);
  const progressPct =
    config.targetPage === 0
      ? 0
      : Math.max(
          0,
          Math.min(100, Math.round((pagesRead / config.targetPage) * 100)),
        );

  return { pagesRead, pagesLeft, progressPct };
}
