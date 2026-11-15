import { isProFreeAccessActive } from './proPromotion';

it('ends free access at December 1 midnight in Korea', () => {
  expect(isProFreeAccessActive(Date.parse('2026-11-30T23:59:59.999+09:00'))).toBe(true);
  expect(isProFreeAccessActive(Date.parse('2026-12-01T00:00:00+09:00'))).toBe(false);
  expect(isProFreeAccessActive(Date.parse('2026-12-01T00:00:01+09:00'))).toBe(false);
});
