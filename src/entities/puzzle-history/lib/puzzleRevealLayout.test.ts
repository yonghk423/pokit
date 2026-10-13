import {
  buildPuzzleRevealLayout,
  PUZZLE_POSTIT_HEIGHT,
  PUZZLE_POSTIT_WIDTH,
  puzzleLayoutSalt,
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

  it('keeps photo windows locked to frame so completed collage matches the source', () => {
    const layout = buildPuzzleRevealLayout(50);
    const all = [...layout.seeds, ...layout.units];
    for (const p of all) {
      expect(p.imgX).toBeCloseTo(p.x, 6);
      expect(p.imgY).toBeCloseTo(p.y, 6);
      expect(p.imgW).toBeCloseTo(p.w, 6);
      expect(p.imgH).toBeCloseTo(p.h, 6);
    }
  });

  it('covers nearly the full board so the completed photo looks filled', () => {
    for (const target of [10, 20, 50] as const) {
      const layout = buildPuzzleRevealLayout(target);
      const all = [...layout.seeds, ...layout.units];
      const gw = 40;
      const gh = 48;
      let covered = 0;
      for (let gy = 0; gy < gh; gy += 1) {
        for (let gx = 0; gx < gw; gx += 1) {
          const x = (gx + 0.5) / gw;
          const y = (gy + 0.5) / gh;
          if (all.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)) {
            covered += 1;
          }
        }
      }
      expect(covered / (gw * gh)).toBeGreaterThan(0.9);
    }
  });

  it('leaves the center mostly empty on seeds so the silhouette is not spoiled early', () => {
    const sampleCenter = (
      tiles: Array<{ x: number; y: number; w: number; h: number }>,
    ) => {
      const gw = 24;
      const gh = 28;
      const r = 0.22;
      let hit = 0;
      let tot = 0;
      for (let gy = 0; gy < gh; gy += 1) {
        for (let gx = 0; gx < gw; gx += 1) {
          const x = (gx + 0.5) / gw;
          const y = (gy + 0.5) / gh;
          if (Math.abs(x - 0.5) > r || Math.abs(y - 0.5) > r) continue;
          tot += 1;
          if (tiles.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)) {
            hit += 1;
          }
        }
      }
      return tot > 0 ? hit / tot : 0;
    };

    for (const target of [10, 20, 50] as const) {
      const layout = buildPuzzleRevealLayout(target);
      expect(sampleCenter(layout.seeds)).toBeLessThan(0.55);
      expect(sampleCenter([...layout.seeds, ...layout.units])).toBeGreaterThan(0.9);
    }
  });

  it('gives each puzzle a different but stable starting collage', () => {
    const sig = (salt: number) =>
      buildPuzzleRevealLayout(20, salt).seeds
        .map((tile) => `${tile.x.toFixed(3)},${tile.y.toFixed(3)},${tile.rotate.toFixed(2)}`)
        .join('|');
    expect(sig(puzzleLayoutSalt('puzzle-a'))).not.toBe(sig(puzzleLayoutSalt('puzzle-b')));
    expect(sig(7)).toBe(sig(7));
    for (const salt of [0, 1, 7, 42, 99, 1000, 99991]) {
      const layout = buildPuzzleRevealLayout(20, salt);
      expect(layout.seeds).toHaveLength(seedCountForTarget(20));
      expect(layout.units).toHaveLength(20);
      expect(sampleCenter(layout.seeds)).toBeLessThan(0.55);
      const all = [...layout.seeds, ...layout.units];
      for (const tile of all) {
        expect(tile.imgX).toBeCloseTo(tile.x, 5);
        expect(tile.imgY).toBeCloseTo(tile.y, 5);
        expect(tile.x).toBeGreaterThanOrEqual(-0.05);
        expect(tile.y).toBeGreaterThanOrEqual(-0.05);
        expect(tile.x + tile.w).toBeLessThanOrEqual(1.08);
        expect(tile.y + tile.h).toBeLessThanOrEqual(1.08);
        expect(Math.abs(tile.rotate)).toBeLessThanOrEqual(4);
      }
    }
  });
});

function sampleCenter(
  tiles: Array<{ x: number; y: number; w: number; h: number }>,
): number {
  const gw = 24;
  const gh = 28;
  const r = 0.22;
  let hit = 0;
  let tot = 0;
  for (let gy = 0; gy < gh; gy += 1) {
    for (let gx = 0; gx < gw; gx += 1) {
      const x = (gx + 0.5) / gw;
      const y = (gy + 0.5) / gh;
      if (Math.abs(x - 0.5) > r || Math.abs(y - 0.5) > r) continue;
      tot += 1;
      if (tiles.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)) {
        hit += 1;
      }
    }
  }
  return tot > 0 ? hit / tot : 0;
}
