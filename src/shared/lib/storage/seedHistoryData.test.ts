import { generateHistorySeedRows, HISTORY_SEED_DAYS } from './seedHistoryData';

describe('generateHistorySeedRows', () => {
  const anchor = new Date(2026, 5, 1, 12, 0, 0, 0);
  const anchorDateKey = '2026-06-01';

  it('produces the same rows on repeated calls', () => {
    const first = generateHistorySeedRows(anchor);
    const second = generateHistorySeedRows(anchor);
    expect(first).toEqual(second);
  });

  it('generates exactly HISTORY_SEED_DAYS rows', () => {
    const rows = generateHistorySeedRows(anchor);
    expect(rows).toHaveLength(HISTORY_SEED_DAYS);
    expect(rows.at(-1)?.dateKey).toBe(anchorDateKey);
  });

  it('boosts the recent 7 days with custom flow completions', () => {
    const rows = generateHistorySeedRows(anchor);
    const recent = rows.slice(-7);
    const hasCustomFlow = recent.some((row) =>
      Object.keys(row.categoryCompletions ?? {}).some((k) => k.startsWith('customFlow:')),
    );
    expect(hasCustomFlow).toBe(true);
  });

  it('keeps a long consecutive streak through anchor day', () => {
    const rows = generateHistorySeedRows(anchor);
    const map = Object.fromEntries(rows.map((row) => [row.dateKey, row]));

    let streak = 0;
    let cursor = anchorDateKey;
    while (map[cursor]) {
      streak += 1;
      const [y, m, d] = cursor.split('-').map(Number);
      const prev = new Date(y, m - 1, d - 1, 12, 0, 0, 0);
      cursor = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    }

    expect(streak).toBe(HISTORY_SEED_DAYS);
  });
});
