import {
  addDaysToLocalDateKey,
  getLocalDateKey,
  parseLocalDateKeyToDate,
} from './localDateKey';

describe('localDateKey', () => {
  it('formats and parses YYYY-MM-DD', () => {
    const d = new Date(2025, 4, 24, 15, 30, 0);
    expect(getLocalDateKey(d)).toBe('2025-05-24');
    const parsed = parseLocalDateKeyToDate('2025-05-24');
    expect(parsed).not.toBeNull();
    if (!parsed) throw new Error('expected parsed date');
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(24);
  });

  it('adds calendar days', () => {
    expect(addDaysToLocalDateKey('2025-05-24', 1)).toBe('2025-05-25');
    expect(addDaysToLocalDateKey('2025-05-24', -1)).toBe('2025-05-23');
  });

  it('returns null for invalid date keys', () => {
    expect(parseLocalDateKeyToDate('bad')).toBeNull();
    expect(parseLocalDateKeyToDate('2025/05/24')).toBeNull();
  });
});
