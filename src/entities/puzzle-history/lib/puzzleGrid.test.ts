import { buildPuzzleRevealLayout } from './puzzleRevealLayout';
import { buildPuzzleGrid } from './puzzleGrid';

describe('buildPuzzleGrid', () => {
  it('exposes one cell per target, backed by reveal layout', () => {
    for (const targetCount of [1, 10, 20, 50, 100] as const) {
      const grid = buildPuzzleGrid(targetCount);
      const layout = buildPuzzleRevealLayout(targetCount);
      expect(grid.cells).toHaveLength(targetCount);
      expect(layout.units).toHaveLength(targetCount);
    }
  });
});
