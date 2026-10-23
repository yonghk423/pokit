import { buildConceptHistoryRows, conceptCategoryKey, isConceptCategoryKey, rateForConceptDay } from './devConceptMockSeed';

const KEYS = ['reading', 'healthIntake', 'fasting', conceptCategoryKey('checklist')];

describe('devConceptMockSeed', () => {
  it('prefixes only the extra custom routines', () => {
    expect(conceptCategoryKey('checklist')).toBe('customFlow:dev-concept:checklist');
    expect(isConceptCategoryKey(conceptCategoryKey('counter'))).toBe(true);
    expect(isConceptCategoryKey('reading')).toBe(false);
    expect(isConceptCategoryKey('healthIntake')).toBe(false);
  });

  it('fills 28 uneven days and ends on today', () => {
    const rows = buildConceptHistoryRows(KEYS, '2026-10-22');
    expect(rows).toHaveLength(28);
    expect(rows[rows.length - 1]?.dateKey).toBe('2026-10-22');
    expect(rateForConceptDay(0)).toBeGreaterThan(0);
    expect(rateForConceptDay(3)).toBe(0);
    const rates = rows.map((row) => row.completionRate);
    expect(new Set(rates).size).toBeGreaterThan(2);
  });

  it('does not invent category keys outside the seeded routines', () => {
    const rows = buildConceptHistoryRows(KEYS, '2026-10-22');
    for (const row of rows) {
      expect(Object.keys(row.categoryCompletions ?? {}).every((key) => KEYS.includes(key))).toBe(true);
    }
  });
});
