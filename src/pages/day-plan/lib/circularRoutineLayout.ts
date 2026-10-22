/** Time-free routines follow the scheduled routines, retaining their list order. */
export function orderCircularRoutines<T extends { startMinutes?: number; startsNextDay?: boolean }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const time = (item: T) => item.startMinutes == null
      ? Number.POSITIVE_INFINITY
      : item.startMinutes + (item.startsNextDay ? 1440 : 0);
    return time(a.item) - time(b.item) || a.index - b.index;
  }).map(({ item }) => item);
}

/**
 * Minimum wheel slots so ~6 sectors fit in the visible right semicircle (30° each).
 * Fewer routines still use this grid; extra slots stay empty paper.
 */
export const CIRCULAR_MIN_SECTOR_COUNT = 12;

export function circularSectorStepDeg(count: number): number {
  return 360 / Math.max(1, count);
}

/** First sector center: right-side semicircle stays balanced around 0° (east). */
export function circularFirstSectorDeg(count: number): number {
  return -90 + circularSectorStepDeg(count) / 2;
}

/** @deprecated Use circularFirstSectorDeg(count). Kept for older 8-slot layout (45°). */
export const CIRCULAR_FIRST_SECTOR_DEG = circularFirstSectorDeg(8);

export type CircularWheelHit =
  | { kind: 'open' | 'complete' | 'time'; index: number }
  | null;

function wrapDegrees(deg: number): number {
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/**
 * Map a viewport tap on the left-anchored wheel to a sector action.
 * Center is at (0, viewportHeight / 2); rotation is the current wheel angle in degrees.
 */
export function hitCircularWheelTap(input: {
  x: number;
  y: number;
  viewportHeight: number;
  rotationDeg: number;
  count: number;
  orbitRadius: number;
  wheelScale: number;
  visibleRadius: number;
}): CircularWheelHit {
  const count = Math.max(1, input.count);
  const step = circularSectorStepDeg(count);
  const first = circularFirstSectorDeg(count);
  const dx = input.x;
  const dy = input.y - input.viewportHeight / 2;
  const distance = Math.hypot(dx, dy);
  if (distance < input.visibleRadius * 0.12 || distance > input.visibleRadius + 8) return null;

  const screenDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const localDeg = screenDeg - input.rotationDeg;
  const index = ((Math.round((localDeg - first) / step) % count) + count) % count;
  if (Math.abs(wrapDegrees(localDeg - (first + index * step))) > step / 2 + 0.01) {
    return null;
  }

  const sectorDeg = (first + index * step + input.rotationDeg) * Math.PI / 180;
  const cx = Math.cos(sectorDeg) * input.orbitRadius * input.wheelScale;
  const cy = input.viewportHeight / 2 + Math.sin(sectorDeg) * input.orbitRadius * input.wheelScale;
  const lx = input.x - cx;
  const ly = input.y - cy;
  if (ly > 26 && Math.hypot(lx, ly - 42) < 26) return { kind: 'complete', index };
  if (ly > 2 && ly < 30 && Math.abs(lx) < 58) return { kind: 'time', index };
  return { kind: 'open', index };
}
