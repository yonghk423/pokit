import { buildConceptHistoryRows, conceptCategoryKey, isConceptCategoryKey, rateForConceptDay } from './devConceptMockSeed';

const KEYS = ['checklist', 'memo', 'counter'].map((key) => conceptCategoryKey(key as 'checklist'));

describe('devConceptMockSeed', () => {
  it('prefixes only the current concept routines', () => {
    expect(conceptCategoryKey('checklist')).toBe('customFlow:dev-concept:checklist');
    expect(isConceptCategoryKey(conceptCategoryKey('memo'))).toBe(true);
    expect(isConceptCategoryKey('reading')).toBe(false);
  });

  it('fills 28 days and keeps a low recent stretch for the low profile', () => {
    const rows = buildConceptHistoryRows('low', KEYS, '2026-10-22');
    expect(rows).toHaveLength(28);
    expect(rows[rows.length - 1]?.dateKey).toBe('2026-10-22');
    expect(rows[rows.length - 1]?.completionRate).toBeLessThan(0.5);
    expect(rows[0]?.completionRate).toBeGreaterThan(rows[rows.length - 1]?.completionRate ?? 1);
    expect(rateForConceptDay('strong', 1)).toBe(1);
  });

  it('does not invent category keys outside the seeded routines', () => {
    const rows = buildConceptHistoryRows('mixed', KEYS, '2026-10-22');
    for (const row of rows) {
      expect(Object.keys(row.categoryCompletions ?? {}).every((key) => KEYS.includes(key))).toBe(true);
    }
  });
});
