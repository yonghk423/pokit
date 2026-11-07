import { polaroidScatter } from './polaroidScatter';

it('keeps an irregular overlapping arrangement stable across renders', () => {
  const keys = ['one', 'two', 'three', 'four', 'five', 'six'];
  const first = polaroidScatter(360, keys);
  expect(polaroidScatter(360, keys)).toEqual(first);
  expect(first.frames.some(frame => frame.rotation < 0)).toBe(true);
  expect(first.frames.some(frame => frame.rotation > 0)).toBe(true);
  const [left, right] = first.frames;
  expect(left.left + left.width).toBeGreaterThan(right.left);
  expect(left.top).not.toBe(right.top);
});

it('fits the scroll canvas around rotated cards and measured long captions', () => {
  for (const width of [288, 360, 768]) {
    const { frames, height } = polaroidScatter(width, ['one', 'two', 'three'], { three: 460 });
    for (const frame of frames) {
      const angle = Math.abs(frame.rotation) * Math.PI / 180;
      const bottom = frame.top + frame.height / 2 + (frame.width * Math.sin(angle) + frame.height * Math.cos(angle)) / 2;
      expect(height).toBeGreaterThan(bottom);
      expect(frame.width).toBeGreaterThan(width * 0.17);
    }
  }
});

it('scatters date packets with different sizes, offsets and stable positions', () => {
  const dates = ['2026-11-07', '2026-11-06', '2026-11-05', '2026-11-04'];
  const layout = polaroidScatter(360, dates, {}, 'packets');
  expect(layout).toEqual(polaroidScatter(360, dates, {}, 'packets'));
  expect(new Set(layout.frames.map(frame => frame.width)).size).toBeGreaterThan(1);
  expect(layout.frames[0].top).not.toBe(layout.frames[1].top);
  expect(layout.frames[0].left).not.toBe(layout.frames[2].left);
  for (const frame of layout.frames) expect(layout.height).toBeGreaterThan(frame.top + frame.height);
});
