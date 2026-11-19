import { photoWallLayout } from './photoWallLayout';

it.each([288, 358, 768])('keeps all prints inside a %ipx wall without overlapping rows', width => {
  const { frames, height } = photoWallLayout(width, 31);
  expect(frames).toHaveLength(31);
  expect(frames.slice(0, 4).every(frame => frame.top === frames[0].top)).toBe(true);
  expect(frames[4].top).toBeGreaterThan(frames[0].top);
  expect(frames[4].left).toBe(frames[0].left);
  for (const frame of frames) {
    expect(frame.left).toBeGreaterThanOrEqual(0);
    expect(frame.left + frame.width).toBeLessThanOrEqual(width);
    expect(frame.top + frame.height).toBeLessThan(height);
    expect(frame.rotation).toBe(0);
  }
  for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) {
    const a = frames[i], b = frames[j];
    expect(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top).toBe(true);
  }
});

it('has a finite empty layout and keeps existing positions when new photos are added', () => {
  expect(Number.isFinite(photoWallLayout(350, 0).height)).toBe(true);
  expect(photoWallLayout(350, 9).frames.slice(0, 5)).toEqual(photoWallLayout(350, 5).frames);
});

it('uses the cherry ribbon photo size and spacing for every wall', () => {
  const { frames, rowStride } = photoWallLayout(360, 8);
  expect((frames[0].height - 7) / frames[0].width).toBeCloseTo(1.46);
  expect(frames[0].top).toBe(84);
  expect(frames[0].width).toBeCloseTo(72);
  expect(frames[1].left - frames[0].left - frames[0].width).toBeCloseTo(10.8);
  expect(rowStride - frames[0].height).toBeCloseTo(frames[0].width * 0.13);
  expect(frames[4].top).toBeGreaterThan(frames[0].top + frames[0].height);
  expect(frames[3].left + frames[3].width).toBeLessThan(360);
});
