import {
  normalizeReadingPageLogs,
  pagesToReadFromLog,
  readPageLogForDate,
  removeReadingPageLog,
  resolveFallbackReadingPages,
  resolveFurthestReadingTargetPage,
  setReadingPageLog,
  sumPagesFromReadingLogs,
  sumPagesFromReadingLogsInMonth,
  syncTodayPagesToLogs,
} from './readingPageLog';

describe('readingPageLog', () => {
  it('normalizes valid date keys and pages', () => {
    const logs = normalizeReadingPageLogs({
      '2026-09-20': { startPage: 1, targetPage: 20 },
      bad: { startPage: 1, targetPage: 2 },
      '2026-09-21': { startPage: 'x', targetPage: 30 },
    });
    expect(logs['2026-09-20']).toEqual({ startPage: 1, targetPage: 20 });
    expect(logs.bad).toBeUndefined();
    expect(logs['2026-09-21']).toEqual({ startPage: 1, targetPage: 30 });
  });

  it('sets and removes logs', () => {
    let logs = setReadingPageLog({}, '2026-09-25', { startPage: 10, targetPage: 25 });
    expect(readPageLogForDate(logs, '2026-09-25')).toEqual({ startPage: 10, targetPage: 25 });
    logs = removeReadingPageLog(logs, '2026-09-25');
    expect(readPageLogForDate(logs, '2026-09-25')).toBeNull();
  });

  it('continues from furthest target and stacks the same page chunk', () => {
    const logs = setReadingPageLog({}, '2026-09-20', { startPage: 1, targetPage: 40 });
    expect(resolveFallbackReadingPages(logs, { startPage: 1, targetPage: 100 })).toEqual({
      startPage: 40,
      targetPage: 79,
    });
  });

  it('continues from furthest progress even if that day is earlier', () => {
    let logs = setReadingPageLog({}, '2026-09-25', { startPage: 1, targetPage: 20 });
    logs = setReadingPageLog(logs, '2026-09-10', { startPage: 20, targetPage: 55 });
    expect(resolveFallbackReadingPages(logs, { startPage: 1, targetPage: 100 })).toEqual({
      startPage: 55,
      targetPage: 90,
    });
  });

  it('seeds first day with at least a 10-page chunk', () => {
    expect(resolveFallbackReadingPages({}, { startPage: 1, targetPage: 5 })).toEqual({
      startPage: 1,
      targetPage: 11,
    });
  });

  it('computes pages to read and syncs today', () => {
    expect(pagesToReadFromLog({ startPage: 1, targetPage: 21 })).toBe(20);
    const synced = syncTodayPagesToLogs({}, '2026-09-25', 5, 15);
    expect(synced['2026-09-25']).toEqual({ startPage: 5, targetPage: 15 });
  });

  it('sums pages across logs and months', () => {
    const logs = {
      '2026-09-01': { startPage: 1, targetPage: 20 },
      '2026-09-02': { startPage: 20, targetPage: 39 },
      '2026-08-30': { startPage: 1, targetPage: 11 },
    };
    expect(sumPagesFromReadingLogs(logs)).toBe(48);
    expect(sumPagesFromReadingLogsInMonth(logs, 2026, 8)).toBe(38);
    expect(resolveFurthestReadingTargetPage(logs, 5)).toBe(39);
  });
});
