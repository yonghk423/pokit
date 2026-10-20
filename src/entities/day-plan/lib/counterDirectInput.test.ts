import { normalizeCounterDetailConfig } from './customFlowTemplateConfigs';
import { applyCounterDelta, resetCounterCount, setCounterCount } from './customFlowTemplateRuntime';

const today = '2026-10-20';
const makeConfig = () => normalizeCounterDetailConfig({
  templateKey: 'counter', goalCount: 50, currentCount: 35, countDateKey: today,
  history: [{ dateKey: today, count: 35 }, { dateKey: '2026-10-19', count: 20 }],
});

it('sets an exact count and replaces today’s history while preserving past records', () => {
  const next = setCounterCount(makeConfig(), 42, today);
  expect(next.currentCount).toBe(42);
  expect(next.history).toEqual([{ dateKey: today, count: 42 }, { dateKey: '2026-10-19', count: 20 }]);
});

it('records zero when directly cleared or reset', () => {
  for (const next of [setCounterCount(makeConfig(), 0, today), resetCounterCount(makeConfig(), today)]) {
    expect(next.currentCount).toBe(0);
    expect(next.history.find((row) => row.dateKey === today)?.count).toBe(0);
  }
});

it('supports counts beyond the goal and keeps subsequent adjustments consistent', () => {
  const next = setCounterCount(makeConfig(), 60, today);
  expect(applyCounterDelta(next, 1, today).currentCount).toBe(61);
  expect(applyCounterDelta(next, -1, today).currentCount).toBe(59);
});

it('bounds counts, rejects non-finite values and rolls over yesterday before editing today', () => {
  expect(setCounterCount(makeConfig(), -5, today).currentCount).toBe(0);
  expect(setCounterCount(makeConfig(), 10000, today).currentCount).toBe(9999);
  expect(setCounterCount(makeConfig(), NaN, today).currentCount).toBe(35);
  const next = setCounterCount(makeConfig(), 7, '2026-10-21');
  expect(next.countDateKey).toBe('2026-10-21');
  expect(next.history.slice(0, 2)).toEqual([{ dateKey: '2026-10-21', count: 7 }, { dateKey: today, count: 35 }]);
});
