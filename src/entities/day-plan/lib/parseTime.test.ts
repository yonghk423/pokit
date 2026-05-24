import { parseHHmmToMinutes } from './parseTime';

describe('parseHHmmToMinutes', () => {
  it('parses standard HH:mm', () => {
    expect(parseHHmmToMinutes('09:00')).toBe(9 * 60);
    expect(parseHHmmToMinutes('9:00')).toBe(9 * 60);
    expect(parseHHmmToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('allows 24:00 as end-of-day', () => {
    expect(parseHHmmToMinutes('24:00')).toBe(24 * 60);
  });

  it('rejects invalid times', () => {
    expect(parseHHmmToMinutes('24:01')).toBeNull();
    expect(parseHHmmToMinutes('25:00')).toBeNull();
    expect(parseHHmmToMinutes('12:60')).toBeNull();
    expect(parseHHmmToMinutes('')).toBeNull();
    expect(parseHHmmToMinutes('noon')).toBeNull();
  });
});
