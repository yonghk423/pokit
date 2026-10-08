import {
  PUZZLE_IMAGE_MAX_EDGE,
  PUZZLE_THUMB_EDGE,
  puzzleImageDownscaleWidth,
  resolvePuzzleBoardImageUri,
} from './puzzleHistoryImageOptimize';

describe('puzzleHistoryImageOptimize', () => {
  it('does not upscale when already within max edge', () => {
    expect(puzzleImageDownscaleWidth(1080, 1080)).toBeNull();
    expect(puzzleImageDownscaleWidth(800, 800)).toBeNull();
  });

  it('downscales long edge to max', () => {
    expect(puzzleImageDownscaleWidth(3000, 3000)).toBe(PUZZLE_IMAGE_MAX_EDGE);
    expect(puzzleImageDownscaleWidth(4000, 2000)).toBe(PUZZLE_IMAGE_MAX_EDGE);
    expect(puzzleImageDownscaleWidth(2000, 4000)).toBe(540);
    expect(puzzleImageDownscaleWidth(1440, 1440)).toBe(PUZZLE_IMAGE_MAX_EDGE);
  });

  it('thumb edge constant is list-sized', () => {
    expect(PUZZLE_THUMB_EDGE).toBeLessThanOrEqual(280);
    expect(PUZZLE_THUMB_EDGE).toBeGreaterThanOrEqual(200);
  });

  it('prefers thumbnail for wall / mid boards', () => {
    expect(
      resolvePuzzleBoardImageUri('file:///full.jpg', 'file:///thumb.jpg', 120),
    ).toBe('file:///thumb.jpg');
    expect(
      resolvePuzzleBoardImageUri('file:///full.jpg', 'file:///thumb.jpg', 360),
    ).toBe('file:///thumb.jpg');
    expect(
      resolvePuzzleBoardImageUri('file:///full.jpg', 'file:///thumb.jpg', 400),
    ).toBe('file:///full.jpg');
    expect(resolvePuzzleBoardImageUri('file:///full.jpg', undefined, 100)).toBe(
      'file:///full.jpg',
    );
  });
});
