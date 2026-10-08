import type { PuzzleHistoryTarget } from '../model/types';
import { buildPuzzleRevealLayout, type PuzzleRevealUnit } from './puzzleRevealLayout';

export type PuzzleGridCell = {
  puzzleIndex: number;
  /** 정규화 좌표 [0,1] */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PuzzleGrid = {
  targetCount: PuzzleHistoryTarget;
  /** @deprecated */
  duration: PuzzleHistoryTarget;
  cells: PuzzleGridCell[];
};

export function buildPuzzleGrid(targetCount: PuzzleHistoryTarget): PuzzleGrid {
  const layout = buildPuzzleRevealLayout(targetCount);
  return {
    targetCount,
    duration: targetCount,
    cells: layout.units.map((u: PuzzleRevealUnit) => ({
      puzzleIndex: u.puzzleIndex,
      x: u.x,
      y: u.y,
      w: u.w,
      h: u.h,
    })),
  };
}

export function cellForPuzzleIndex(
  targetCount: PuzzleHistoryTarget,
  puzzleIndex: number,
): PuzzleGridCell | null {
  const layout = buildPuzzleRevealLayout(targetCount);
  const unit = layout.units.find((u) => u.puzzleIndex === puzzleIndex);
  if (!unit) return null;
  return {
    puzzleIndex: unit.puzzleIndex,
    x: unit.x,
    y: unit.y,
    w: unit.w,
    h: unit.h,
  };
}
