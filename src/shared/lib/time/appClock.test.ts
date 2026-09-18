import {
  advanceDevClockToNextLocalMorning,
  clearDevClock,
  getClockNow,
  setDevClockNow,
} from './appClock';

describe('appClock', () => {
  afterEach(() => {
    clearDevClock();
  });

  it('advances the app today to the next local morning', () => {
    setDevClockNow(new Date(2026, 8, 18, 10, 21, 0));
    const next = advanceDevClockToNextLocalMorning();
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(8);
    expect(next.getDate()).toBe(19);
    expect(next.getHours()).toBe(8);
    expect(getClockNow().getDate()).toBe(19);
  });

  it('clearDevClock returns to the device clock', () => {
    setDevClockNow(new Date(2026, 8, 19, 8, 0, 0));
    clearDevClock();
    const delta = Math.abs(getClockNow().getTime() - Date.now());
    expect(delta).toBeLessThan(5_000);
  });
});
