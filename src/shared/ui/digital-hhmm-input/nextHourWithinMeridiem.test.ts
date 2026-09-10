import { nextHourWithinMeridiem } from './DigitalHhmmInput';

describe('nextHourWithinMeridiem', () => {
  it('keeps PM when stepping from 11 to 12 (noon)', () => {
    // 23:00 → 12:00 (오후 12시), 오전으로 넘어가지 않음
    expect(nextHourWithinMeridiem(23 * 60, 1, false)).toBe('12:00');
    expect(nextHourWithinMeridiem(23 * 60, 1, true)).toBe('12:00');
  });

  it('cycles within PM after noon', () => {
    expect(nextHourWithinMeridiem(12 * 60, 1, false)).toBe('13:00');
    expect(nextHourWithinMeridiem(12 * 60, -1, false)).toBe('23:00');
  });

  it('cycles within AM including midnight', () => {
    expect(nextHourWithinMeridiem(11 * 60, 1, false)).toBe('00:00');
    expect(nextHourWithinMeridiem(11 * 60, 1, true)).toBe('24:00');
    expect(nextHourWithinMeridiem(0, 1, false)).toBe('01:00');
    expect(nextHourWithinMeridiem(0, -1, false)).toBe('11:00');
  });
});
