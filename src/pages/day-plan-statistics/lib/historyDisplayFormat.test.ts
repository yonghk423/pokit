import {
  formatHistoryCategoryVarietyKo,
  formatHistoryCountKo,
  formatHistoryFrequencyKo,
} from './historyDisplayFormat';

describe('historyDisplayFormat', () => {
  it('formats item counts as 개', () => {
    expect(formatHistoryCountKo(8)).toBe('8개');
    expect(formatHistoryCountKo(0)).toBe('0개');
  });

  it('formats completion frequency as 회', () => {
    expect(formatHistoryFrequencyKo(8)).toBe('8회');
    expect(formatHistoryFrequencyKo(0)).toBe('0회');
  });

  it('formats category variety as 가지', () => {
    expect(formatHistoryCategoryVarietyKo(3)).toBe('3가지');
  });
});
