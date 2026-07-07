import {
  formatCounterRemainingMessage,
  normalizeCounterUnitKey,
  resolveCounterUnitLabel,
} from './counterUnits';
import { normalizeCounterDetailConfig } from './customFlowTemplateConfigs';
import { applyCounterDelta, applyCounterFillRemaining, ensureCounterDayBoundary } from './customFlowTemplateRuntime';

describe('counterUnits', () => {
  it('infers unit key from legacy unit label', () => {
    expect(normalizeCounterUnitKey(undefined, '잔')).toBe('glass');
    expect(resolveCounterUnitLabel('glass')).toBe('잔');
    expect(resolveCounterUnitLabel('custom', '세트')).toBe('세트');
  });

  it('formats remaining message by unit', () => {
    expect(formatCounterRemainingMessage(5, '잔')).toBe('5잔 더 하면 목표예요');
    expect(formatCounterRemainingMessage(3, '회')).toBe('3번 더 하면 목표예요');
  });
});

describe('counter runtime', () => {
  it('normalizes legacy counter config with unit key and steps', () => {
    const cfg = normalizeCounterDetailConfig({
      templateKey: 'counter',
      activityLabel: '물 마시기',
      unitLabel: '잔',
      goalCount: 8,
      currentCount: 3,
    });
    expect(cfg.unitKey).toBe('glass');
    expect(cfg.stepSize).toBe(1);
    expect(cfg.secondaryStepSize).toBe(5);
  });

  it('tracks history when count changes', () => {
    const base = normalizeCounterDetailConfig({
      templateKey: 'counter',
      goalCount: 8,
      currentCount: 2,
      countDateKey: '2026-07-07',
    });
    const next = applyCounterDelta(base, 1, '2026-07-07');
    expect(next.currentCount).toBe(3);
    expect(next.history.some((row) => row.dateKey === '2026-07-07' && row.count === 3)).toBe(true);
  });

  it('fills remaining count to goal', () => {
    const base = normalizeCounterDetailConfig({
      templateKey: 'counter',
      goalCount: 8,
      currentCount: 3,
      countDateKey: '2026-07-07',
    });
    const next = applyCounterFillRemaining(base, '2026-07-07');
    expect(next.currentCount).toBe(8);
  });

  it('archives yesterday count when daily reset rolls over', () => {
    const base = normalizeCounterDetailConfig({
      templateKey: 'counter',
      goalCount: 8,
      currentCount: 6,
      countDateKey: '2026-07-06',
      dailyReset: true,
    });
    const next = ensureCounterDayBoundary(base, '2026-07-07');
    expect(next.currentCount).toBe(0);
    expect(next.history).toEqual(expect.arrayContaining([{ dateKey: '2026-07-06', count: 6 }]));
  });
});
