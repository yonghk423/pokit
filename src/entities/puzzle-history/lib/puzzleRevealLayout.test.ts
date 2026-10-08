import {
  buildPuzzleRevealLayout,
  PUZZLE_POSTIT_HEIGHT,
  PUZZLE_POSTIT_WIDTH,
  seedCountForTarget,
  totalRevealArea,
} from './puzzleRevealLayout';
import type { PuzzleHistoryTarget } from '../model/types';

const TARGETS: PuzzleHistoryTarget[] = [1, 10, 20, 50, 100];

describe('buildPuzzleRevealLayout (post-it collage)', () => {
  it.each(TARGETS)(
    'target %i → seed + exactly that many progress units',
    (targetCount) => {
      const layout = buildPuzzleRevealLayout(targetCount);
      expect(layout.units).toHaveLength(targetCount);
      expect(layout.seeds).toHaveLength(seedCountForTarget(targetCount));
      expect(new Set(layout.units.map((u) => u.puzzleIndex)).size).toBe(targetCount);
      expect(totalRevealArea(layout)).toBeGreaterThan(0.08);
      for (const unit of layout.units) {
        expect(unit.w).toBeGreaterThan(0);
        expect(unit.h).toBeGreaterThan(0);
        expect(unit.fill === 'image' || unit.fill === 'solid').toBe(true);
      }
    },
  );

  it('uses portrait post-it canvas', () => {
    const layout = buildPuzzleRevealLayout(10);
    expect(layout.viewBoxWidth).toBe(PUZZLE_POSTIT_WIDTH);
    expect(layout.viewBoxHeight).toBe(PUZZLE_POSTIT_HEIGHT);
  });

  it('keeps tiles roughly on the board', () => {
    const layout = buildPuzzleRevealLayout(10);
    const all = [...layout.seeds, ...layout.units];
    expect(all.length).toBe(seedCountForTarget(10) + 10);
    for (const p of all) {
      expect(p.x).toBeGreaterThanOrEqual(-0.05);
      expect(p.y).toBeGreaterThanOrEqual(-0.05);
      expect(p.x + p.w).toBeLessThanOrEqual(1.08);
      expect(p.y + p.h).toBeLessThanOrEqual(1.08);
    }
  });

  it('uses only photo post-its (no solid accents)', () => {
    const layout = buildPuzzleRevealLayout(10);
    const all = [...layout.seeds, ...layout.units];
    expect(all.every((t) => t.fill === 'image')).toBe(true);
  });
});
