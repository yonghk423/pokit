import { normalizeRoutineDisplayName } from './routineDisplayName';
import { normalizeRoutineSummary } from './routineSummary';

export type ReadingMetricKey = 'pages_read' | 'pages_left' | 'focus_level';

export type ReadingLiveActivityConfig = {
  displayName: string;
  /** 비어 있으면 플로우(일정 블록) 제목을 세션에 표시합니다. */
  bookTitle: string;
  startPage: number;
  targetPage: number;
  selectedMetrics: ReadingMetricKey[];
  summary: string;
};

export const DEFAULT_READING_LIVE_ACTIVITY_CONFIG: ReadingLiveActivityConfig = {
  displayName: '',
  bookTitle: '',
  startPage: 1,
  targetPage: 100,
  /** 잠금화면 지표 — 전부 해제 가능 */
  selectedMetrics: [],
  summary: '',
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

function clampReadingBookTitle(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  const t = raw.trim();
  return t.length > max ? t.slice(0, max) : t;
}

/** 세션·미리보기에 쓸 도서 제목: 입력이 있으면 우선, 없으면 플로우(블록) 제목 */
export function readingDisplayTitle(
  flowTitle: string,
  config: ReadingLiveActivityConfig,
): string {
  const book = clampReadingBookTitle(config.bookTitle, 200);
  if (book.length > 0) return book;
  const flow = typeof flowTitle === 'string' ? flowTitle.trim() : '';
  return flow.length > 0 ? flow : '제목 없음';
}

export function getInitialReadingLiveActivityConfig(): ReadingLiveActivityConfig {
  return {
    displayName: '',
    bookTitle: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.bookTitle,
    startPage: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage,
    targetPage: DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
    selectedMetrics: [...DEFAULT_READING_LIVE_ACTIVITY_CONFIG.selectedMetrics],
    summary: '',
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
    displayName: normalizeRoutineDisplayName(raw.displayName),
    bookTitle: clampReadingBookTitle(raw.bookTitle, 120),
    startPage: toNonNegativeInt(
      raw.startPage,
      DEFAULT_READING_LIVE_ACTIVITY_CONFIG.startPage,
    ),
    targetPage: toNonNegativeInt(
      raw.targetPage,
      DEFAULT_READING_LIVE_ACTIVITY_CONFIG.targetPage,
    ),
    selectedMetrics: normalizeReadingMetricSelection(raw.selectedMetrics),
    summary: normalizeRoutineSummary(raw.summary),
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
