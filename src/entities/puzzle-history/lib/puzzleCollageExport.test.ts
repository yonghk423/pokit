import { PUZZLE_HISTORY_TARGETS } from '../model/types';
import { seedCountForTarget } from './puzzleRevealLayout';
import { listCompletedCollageTiles } from './puzzleCollageExport';

describe('listCompletedCollageTiles', () => {
  it('includes seeds and only completed pieces, in paint order', () => {
    for (const targetCount of PUZZLE_HISTORY_TARGETS) {
      const completed = Array.from({ length: targetCount }, (_, index) => index).filter(
        (index) => index % 2 === 0,
      );
      const tiles = listCompletedCollageTiles(targetCount, completed);
      const progress = tiles.filter((tile) => tile.puzzleIndex != null);
      expect(tiles.filter((tile) => tile.puzzleIndex == null)).toHaveLength(
        seedCountForTarget(targetCount),
      );
      expect(progress.map((tile) => tile.puzzleIndex).sort((a, b) => a! - b!)).toEqual(
        completed,
      );
      for (let i = 1; i < tiles.length; i += 1) {
        expect(tiles[i]!.z).toBeGreaterThanOrEqual(tiles[i - 1]!.z);
      }
    }
  });
});
