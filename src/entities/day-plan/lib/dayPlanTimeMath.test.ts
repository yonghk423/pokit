import {
  defaultEditorBlockTimesFromNow,
  formatMinutesToHHmm,
  snapMinutes,
} from './dayPlanTimeMath';

describe('formatMinutesToHHmm', () => {
  it('formats midnight and end-of-day', () => {
    expect(formatMinutesToHHmm(0)).toBe('00:00');
    expect(formatMinutesToHHmm(24 * 60)).toBe('24:00');
    expect(formatMinutesToHHmm(9 * 60 + 30)).toBe('09:30');
  });

  it('clamps out-of-range values', () => {
    expect(formatMinutesToHHmm(-10)).toBe('00:00');
    expect(formatMinutesToHHmm(9999)).toBe('24:00');
  });
});

describe('snapMinutes', () => {
  it('snaps to 5-minute steps by default', () => {
    expect(snapMinutes(7)).toBe(5);
    expect(snapMinutes(8)).toBe(10);
    expect(snapMinutes(142)).toBe(140);
  });
});

describe('defaultEditorBlockTimesFromNow', () => {
  it('returns snapped start and minimum 15-minute span', () => {
    const now = new Date(2025, 4, 24, 10, 7, 0);
    const { startTime, endTime } = defaultEditorBlockTimesFromNow(now, 60);
    expect(startTime).toBe('10:05');
    expect(endTime).toBe('11:05');
  });
});
