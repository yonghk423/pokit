const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 하루 읽기 분량 — 시작·목표 페이지 */
export type ReadingPageDayLog = {
  startPage: number;
  targetPage: number;
};

/** dateKey(YYYY-MM-DD) → 그날의 시작·목표 */
export type ReadingPageLogs = Record<string, ReadingPageDayLog>;

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

export function normalizeReadingPageDayLog(
  raw: unknown,
  fallback: ReadingPageDayLog = { startPage: 1, targetPage: 100 },
): ReadingPageDayLog | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<ReadingPageDayLog>;
  const startPage = toNonNegativeInt(o.startPage, fallback.startPage);
  const targetPage = toNonNegativeInt(o.targetPage, Math.max(startPage, fallback.targetPage));
  return { startPage, targetPage };
}

export function normalizeReadingPageLogs(raw: unknown): ReadingPageLogs {
  if (!raw || typeof raw !== 'object') return {};
  const out: ReadingPageLogs = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!DATE_KEY_RE.test(key)) continue;
    const log = normalizeReadingPageDayLog(val);
    if (log) out[key] = log;
  }
  return out;
}

export function readPageLogForDate(
  logs: ReadingPageLogs,
  dateKey: string,
): ReadingPageDayLog | null {
  const v = logs[dateKey];
  return v ? { startPage: v.startPage, targetPage: v.targetPage } : null;
}

export function setReadingPageLog(
  logs: ReadingPageLogs,
  dateKey: string,
  log: ReadingPageDayLog,
): ReadingPageLogs {
  if (!DATE_KEY_RE.test(dateKey)) return logs;
  const startPage = toNonNegativeInt(log.startPage, 0);
  const targetPage = toNonNegativeInt(log.targetPage, startPage);
  return { ...logs, [dateKey]: { startPage, targetPage } };
}

export function removeReadingPageLog(logs: ReadingPageLogs, dateKey: string): ReadingPageLogs {
  if (!(dateKey in logs)) return logs;
  const next = { ...logs };
  delete next[dateKey];
  return next;
}

export function sortedReadingPageLogKeys(logs: ReadingPageLogs): string[] {
  return Object.keys(logs).sort();
}

/** 이전 기록의 목표를 시작으로 이어 읽기 — 분량(쪽수)도 이어서 쌓음 */
export function resolveFallbackReadingPages(
  logs: ReadingPageLogs,
  fallback: ReadingPageDayLog,
): ReadingPageDayLog {
  const DEFAULT_CHUNK = 10;
  const keys = sortedReadingPageLogKeys(logs);
  if (keys.length === 0) {
    const startPage = toNonNegativeInt(fallback.startPage, 1);
    const fallbackTarget = toNonNegativeInt(fallback.targetPage, startPage + DEFAULT_CHUNK);
    const chunk = Math.max(1, fallbackTarget - startPage, DEFAULT_CHUNK);
    return { startPage, targetPage: startPage + chunk };
  }
  // 날짜 순이 아니라 「가장 멀리 읽은」 기록을 이어서 쌓는다
  let furthest = logs[keys[0]!]!;
  for (const key of keys) {
    const log = logs[key]!;
    if (log.targetPage > furthest.targetPage) furthest = log;
  }
  const chunk = Math.max(1, pagesToReadFromLog(furthest), DEFAULT_CHUNK);
  const startPage = toNonNegativeInt(furthest.targetPage, fallback.startPage);
  return { startPage, targetPage: startPage + chunk };
}

/** 셀 표시용 — 그날 읽을 쪽수 */
export function pagesToReadFromLog(log: ReadingPageDayLog): number {
  return Math.max(0, log.targetPage - log.startPage);
}

/** 날짜별 기록에 적힌 읽기 분량 합계 */
export function sumPagesFromReadingLogs(logs: ReadingPageLogs): number {
  let sum = 0;
  for (const log of Object.values(logs)) {
    sum += pagesToReadFromLog(log);
  }
  return sum;
}

/** YYYY-MM 구간의 읽기 분량 합계 */
export function sumPagesFromReadingLogsInMonth(
  logs: ReadingPageLogs,
  year: number,
  monthIndex0: number,
): number {
  const prefix = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-`;
  let sum = 0;
  for (const [key, log] of Object.entries(logs)) {
    if (!key.startsWith(prefix)) continue;
    sum += pagesToReadFromLog(log);
  }
  return sum;
}

/** 기록·폴백 중 가장 멀리 읽은 목표 페이지 */
export function resolveFurthestReadingTargetPage(
  logs: ReadingPageLogs,
  fallbackTarget: number,
): number {
  let max = toNonNegativeInt(fallbackTarget, 0);
  for (const log of Object.values(logs)) {
    max = Math.max(max, toNonNegativeInt(log.targetPage, 0));
  }
  return max;
}

/**
 * 오늘 필드(start/target)를 pageLogs에 미러.
 * 오늘 키가 없으면 생성, 있으면 갱신.
 */
export function syncTodayPagesToLogs(
  logs: ReadingPageLogs,
  todayKey: string,
  startPage: number,
  targetPage: number,
): ReadingPageLogs {
  return setReadingPageLog(logs, todayKey, { startPage, targetPage });
}
