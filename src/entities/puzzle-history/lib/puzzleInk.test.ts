import { PUZZLE_INK_MAX_POINTS, PUZZLE_INK_MAX_STROKES, sanitizePuzzleInkStrokes } from './puzzleInk';

describe('sanitizePuzzleInkStrokes', () => {
  it('keeps black and white strokes inside the board', () => {
    const ink = sanitizePuzzleInkStrokes([
      { color: '#FFFFFF', points: [{ x: -0.2, y: 0.2 }, { x: 1.4, y: 0.5 }] },
      { color: '#1A1A1A', points: [{ x: 0.1, y: 0.1 }] },
    ]);
    expect(ink).toEqual([
      {
        color: '#FFFFFF',
        points: [
          { x: 0, y: 0.2 },
          { x: 1, y: 0.5 },
        ],
      },
      { color: '#1A1A1A', points: [{ x: 0.1, y: 0.1 }] },
    ]);
  });

  it('drops unknown colors and empty strokes', () => {
    expect(
      sanitizePuzzleInkStrokes([
        { color: '#FF0000', points: [{ x: 0.2, y: 0.2 }] },
        { color: '#FFFFFF', points: [] },
        null,
      ]),
    ).toEqual([]);
  });

  it('keeps the newest strokes and the start of a long stroke', () => {
    const strokes = Array.from({ length: PUZZLE_INK_MAX_STROKES + 5 }, (_, index) => ({
      color: '#FFFFFF',
      points: [{ x: index / 100, y: 0.2 }],
    }));
    const ink = sanitizePuzzleInkStrokes(strokes);
    expect(ink).toHaveLength(PUZZLE_INK_MAX_STROKES);
    expect(ink[0]?.points[0]?.x).toBe(0.05);

    const long = sanitizePuzzleInkStrokes([
      {
        color: '#1A1A1A',
        points: Array.from({ length: PUZZLE_INK_MAX_POINTS + 10 }, (_, index) => ({
          x: index / 1000,
          y: 0.3,
        })),
      },
    ]);
    expect(long[0]?.points).toHaveLength(PUZZLE_INK_MAX_POINTS);
    expect(long[0]?.points[0]?.x).toBe(0);
  });
});
