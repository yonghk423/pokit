import {
  DEFAULT_SPINE_GAP_BLOCK_MINUTES,
  normalizeSpineDefaultBlockMinutes,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
} from './spineDefaultBlockMinutes';

describe('spineDefaultBlockMinutes', () => {
  it('defaults to 60 minutes', () => {
    expect(DEFAULT_SPINE_GAP_BLOCK_MINUTES).toBe(60);
  });

  it('normalizes to allowed options', () => {
    expect(normalizeSpineDefaultBlockMinutes(60)).toBe(60);
    expect(normalizeSpineDefaultBlockMinutes(45)).toBe(45);
    expect(normalizeSpineDefaultBlockMinutes(99)).toBe(60);
    expect(normalizeSpineDefaultBlockMinutes(undefined)).toBe(60);
  });

  it('exposes preset minute options', () => {
    expect(SPINE_GAP_BLOCK_MINUTE_OPTIONS).toEqual([15, 30, 45, 60, 90, 120]);
  });
});
