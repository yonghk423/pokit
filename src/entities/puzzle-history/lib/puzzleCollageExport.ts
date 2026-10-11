import type { PuzzleHistoryTarget } from '../model/types';
import { buildPuzzleRevealLayout, type PostItFill } from './puzzleRevealLayout';

/** 완성 콜라주를 그릴 때 쓰는 조각. 화면 보드와 같은 정규화 좌표다. */
export type CollageDrawTile = {
  /** 시드 조각이면 null */
  puzzleIndex: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotate: number;
  fill: PostItFill;
  solidColor?: string;
  imgX: number;
  imgY: number;
};

/**
 * 화면에 붙어 있는 콜라주와 같은 장만 뽑는다.
 * 시드는 항상 포함하고, 진행 조각은 완료된 것만 포함한다.
 */
export function listCompletedCollageTiles(
  targetCount: PuzzleHistoryTarget,
  completedPuzzleIndices: Iterable<number>,
): CollageDrawTile[] {
  const layout = buildPuzzleRevealLayout(targetCount);
  const completed = new Set(completedPuzzleIndices);
  const tiles: CollageDrawTile[] = [
    ...layout.seeds.map((tile) => ({
      puzzleIndex: null,
      x: tile.x,
      y: tile.y,
      w: tile.w,
      h: tile.h,
      z: tile.z,
      rotate: tile.rotate,
      fill: tile.fill,
      solidColor: tile.solidColor,
      imgX: tile.imgX,
      imgY: tile.imgY,
    })),
    ...layout.units
      .filter((tile) => completed.has(tile.puzzleIndex))
      .map((tile) => ({
        puzzleIndex: tile.puzzleIndex,
        x: tile.x,
        y: tile.y,
        w: tile.w,
        h: tile.h,
        z: tile.z,
        rotate: tile.rotate,
        fill: tile.fill,
        solidColor: tile.solidColor,
        imgX: tile.imgX,
        imgY: tile.imgY,
      })),
  ];
  tiles.sort((a, b) => a.z - b.z);
  return tiles;
}
