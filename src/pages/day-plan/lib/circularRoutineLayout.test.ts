import {
  CIRCULAR_MIN_SECTOR_COUNT,
  circularFirstSectorDeg,
  circularSectorStepDeg,
  hitCircularWheelTap,
  orderCircularRoutines,
} from './circularRoutineLayout';

describe('orderCircularRoutines', () => {
  it('keeps every routine, orders scheduled ones first, then preserves untimed order', () => {
    const items = [
      { key: 'note' }, { key: 'evening', startMinutes: 1140 },
      { key: 'morning', startMinutes: 420 }, { key: 'count' },
    ];
    expect(orderCircularRoutines(items).map(item => item.key)).toEqual(['morning', 'evening', 'note', 'count']);
    expect(items[0].key).toBe('note');
  });
  it('keeps next-day times after tonight and handles midnight and ties', () => {
    const items = [
      { key: 'next', startMinutes: 0, startsNextDay: true },
      { key: 'a', startMinutes: 1380 }, { key: 'b', startMinutes: 1380 },
      { key: 'midnight', startMinutes: 0 },
    ];
    expect(orderCircularRoutines(items).map(item => item.key)).toEqual(['midnight', 'a', 'b', 'next']);
  });
});

describe('circular sector grid', () => {
  it('uses 30° slots so about six sectors fit in a semicircle', () => {
    expect(CIRCULAR_MIN_SECTOR_COUNT).toBe(12);
    expect(circularSectorStepDeg(12)).toBe(30);
    expect(circularFirstSectorDeg(12)).toBe(-75);
  });
});

describe('hitCircularWheelTap', () => {
  const count = CIRCULAR_MIN_SECTOR_COUNT;
  const first = circularFirstSectorDeg(count);
  const step = circularSectorStepDeg(count);
  const base = { viewportHeight: 600, rotationDeg: 0, count, orbitRadius: 200, wheelScale: 0.8, visibleRadius: 180 };

  it('opens the sector under the tap and routes lower hits to complete or time', () => {
    const rad = first * Math.PI / 180;
    const cx = Math.cos(rad) * base.orbitRadius * base.wheelScale;
    const cy = base.viewportHeight / 2 + Math.sin(rad) * base.orbitRadius * base.wheelScale;
    expect(hitCircularWheelTap({ ...base, x: cx, y: cy - 10 })).toEqual({ kind: 'open', index: 0 });
    expect(hitCircularWheelTap({ ...base, x: cx, y: cy + 42 })).toEqual({ kind: 'complete', index: 0 });
    expect(hitCircularWheelTap({ ...base, x: cx, y: cy + 14 })).toEqual({ kind: 'time', index: 0 });
  });

  it('ignores the hub and follows wheel rotation', () => {
    expect(hitCircularWheelTap({ ...base, x: 4, y: 300 })).toBeNull();
    const rad = (first + step) * Math.PI / 180;
    const cx = Math.cos(rad) * base.orbitRadius * base.wheelScale;
    const cy = base.viewportHeight / 2 + Math.sin(rad) * base.orbitRadius * base.wheelScale;
    expect(hitCircularWheelTap({ ...base, rotationDeg: step, x: cx, y: cy - 8 })).toEqual({ kind: 'open', index: 0 });
  });
});
