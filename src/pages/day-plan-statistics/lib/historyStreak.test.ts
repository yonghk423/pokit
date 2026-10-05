import { countTrailingStreak, resolveDisplayStreak } from './historyStreak';

describe('historyStreak', () => {
  it('counts trailing streak from the end', () => {
    expect(countTrailingStreak([true, true, false, true, true, true])).toBe(3);
    expect(countTrailingStreak([true, true, true])).toBe(3);
    expect(countTrailingStreak([false, false])).toBe(0);
    expect(countTrailingStreak([])).toBe(0);
  });

  it('respects upToIndex', () => {
    expect(countTrailingStreak([true, true, true, false, true], 2)).toBe(3);
    expect(countTrailingStreak([true, true, true, false, true], 4)).toBe(1);
  });

  it('resolves display streak preferring trailing then best', () => {
    expect(resolveDisplayStreak([true, true, false, true, true, true])).toBe(3);
    expect(resolveDisplayStreak([true, true, true, false, false])).toBe(3);
    expect(resolveDisplayStreak([true, false, true])).toBe(1);
    expect(resolveDisplayStreak([false, false])).toBe(0);
  });
});
