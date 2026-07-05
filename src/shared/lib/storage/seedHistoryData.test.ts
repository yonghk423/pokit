import { generateHistorySeedRows, HISTORY_SEED_DAYS } from './seedHistoryData';

describe('generateHistorySeedRows', () => {
  const anchor = new Date(2026, 5, 1, 12, 0, 0, 0);
  const anchorDateKey = '2026-06-01';

  it('produces the same rows on repeated calls', () => {
    const first = generateHistorySeedRows(anchor, 'mixed');
    const second = generateHistorySeedRows(anchor, 'mixed');
    expect(first).toEqual(second);
  });

  it('generates exactly HISTORY_SEED_DAYS rows', () => {
    const rows = generateHistorySeedRows(anchor, 'mixed');
    expect(rows).toHaveLength(HISTORY_SEED_DAYS);
    expect(rows.at(-1)?.dateKey).toBe(anchorDateKey);
  });

  it('mixed profile includes empty and low completion days', () => {
    const rows = generateHistorySeedRows(anchor, 'mixed');
    const emptyDays = rows.filter((row) => row.completedFlowCount <= 0).length;
    const lowDays = rows.filter(
      (row) => row.completedFlowCount > 0 && row.completionRate > 0 && row.completionRate < 0.5,
    ).length;
    expect(emptyDays).toBeGreaterThan(0);
    expect(lowDays).toBeGreaterThan(0);
  });

  it('low profile makes recent days mostly underachieved', () => {
    const rows = generateHistorySeedRows(anchor, 'low');
    const map = Object.fromEntries(rows.map((row) => [row.dateKey, row]));
    const recentKeys = Array.from({ length: 14 }, (_, idx) => {
      const d = new Date(2026, 5, 1 - idx, 12, 0, 0, 0);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
    const weakRecent = recentKeys.filter((key) => {
      const row = map[key];
      if (!row) return false;
      return row.completedFlowCount <= 0 || row.completionRate < 0.55;
    }).length;
    expect(weakRecent).toBeGreaterThanOrEqual(10);
  });

  it('strong profile boosts the recent 7 days with standard routine completions', () => {
    const rows = generateHistorySeedRows(anchor, 'strong');
    const recent = rows.slice(-7);
    const hasStandardRoutine = recent.some((row) =>
      Object.keys(row.categoryCompletions ?? {}).some((k) =>
        ['water', 'reading', 'medicine', 'work', 'fasting'].includes(k),
      ),
    );
    expect(hasStandardRoutine).toBe(true);
  });

  it('strong profile keeps a long consecutive streak through anchor day', () => {
    const rows = generateHistorySeedRows(anchor, 'strong');
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
