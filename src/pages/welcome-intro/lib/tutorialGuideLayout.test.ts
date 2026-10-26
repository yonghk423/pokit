import { tutorialGuideLayout } from './tutorialGuideLayout';

it.each([
  [393, 852, { x: 120, y: 220, width: 150, height: 165 }],
  [393, 852, { x: 320, y: 70, width: 44, height: 44 }],
  [393, 852, { x: 30, y: 730, width: 330, height: 44 }],
  [320, 410, { x: 20, y: 90, width: 280, height: 44 }],
  [1024, 1366, { x: 450, y: 620, width: 140, height: 140 }],
] as const)('keeps the guide inside a %sx%s visible viewport without covering a target with available space', (width, height, target) => {
  const guide = tutorialGuideLayout(width, height, target);
  expect(guide.x).toBeGreaterThanOrEqual(0);
  expect(guide.y).toBeGreaterThanOrEqual(0);
  expect(guide.x + guide.width).toBeLessThanOrEqual(width);
  expect(guide.y + guide.height).toBeLessThanOrEqual(height);
  expect(guide.y >= target.y + target.height || guide.y + guide.height <= target.y).toBe(true);
});
it('points down toward a bottom action and up toward a top action', () => {
  expect(tutorialGuideLayout(393, 852, { x: 100, y: 740, width: 180, height: 44 }).pose).toBe('down');
  expect(tutorialGuideLayout(393, 852, { x: 310, y: 70, width: 44, height: 44 }).pose).toBe('up');
});
it('places the opening guide above the target at the large size', () => {
  const guide = tutorialGuideLayout(393, 852, { x: 104, y: 340, width: 185, height: 165 }, 'above');
  expect(guide.compact).toBe(false);
  expect(guide.y).toBeLessThan(24);
  expect(guide.y + guide.height).toBeLessThan(340);
});
it('uses a welcome pose while the target is not yet laid out', () => {
  expect(tutorialGuideLayout(393, 852, null).pose).toBe('welcome');
});
