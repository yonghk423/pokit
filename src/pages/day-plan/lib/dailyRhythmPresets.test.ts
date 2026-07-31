import { DEFAULT_DAILY_RHYTHM, isDefaultDailyRhythm } from './dailyRhythmPresets';

describe('dailyRhythmPresets', () => {
  it('기본 일과는 오전 7시–오후 11시', () => {
    expect(DEFAULT_DAILY_RHYTHM).toEqual({ start: '07:00', end: '23:00' });
    expect(isDefaultDailyRhythm('07:00', '23:00')).toBe(true);
    expect(isDefaultDailyRhythm('08:00', '02:00')).toBe(false);
  });
});
