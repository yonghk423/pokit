import { formatDurationMinKo } from './formatDurationMinKo';

describe('formatDurationMinKo', () => {
  it('formats minutes only', () => {
    expect(formatDurationMinKo(0)).toBe('0분');
    expect(formatDurationMinKo(45)).toBe('45분');
  });

  it('formats hours and minutes', () => {
    expect(formatDurationMinKo(60)).toBe('1시간');
    expect(formatDurationMinKo(90)).toBe('1시간 30분');
  });

  it('clamps negative input', () => {
    expect(formatDurationMinKo(-5)).toBe('0분');
  });
});
