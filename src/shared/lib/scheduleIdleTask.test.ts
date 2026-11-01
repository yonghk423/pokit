import { scheduleIdleTask } from './scheduleIdleTask';
const originalRequest = globalThis.requestIdleCallback;
const originalCancel = globalThis.cancelIdleCallback;
afterEach(() => {
  Object.assign(globalThis, { requestIdleCallback: originalRequest, cancelIdleCallback: originalCancel });
  jest.useRealTimers();
});
it('defers work to idle time and prevents a late callback after cancellation', () => {
  let invoke!: () => void;
  const cancel = jest.fn();
  Object.assign(globalThis, { requestIdleCallback: (callback: () => void) => { invoke = callback; return 7; }, cancelIdleCallback: cancel });
  const work = jest.fn();
  const task = scheduleIdleTask(work);
  expect(work).not.toHaveBeenCalled();
  task.cancel(); invoke();
  expect(work).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledWith(7);
});
it('runs a scheduled callback when idle', () => {
  let invoke!: () => void;
  Object.assign(globalThis, { requestIdleCallback: (callback: () => void) => { invoke = callback; return 1; } });
  const work = jest.fn();
  scheduleIdleTask(work); invoke();
  expect(work).toHaveBeenCalledTimes(1);
});
it('supports cancelling the timer fallback when the idle API is unavailable', () => {
  jest.useFakeTimers();
  Object.assign(globalThis, { requestIdleCallback: undefined });
  const work = jest.fn();
  scheduleIdleTask(work).cancel();
  jest.runAllTimers();
  expect(work).not.toHaveBeenCalled();
  scheduleIdleTask(work);
  jest.runAllTimers();
  expect(work).toHaveBeenCalledTimes(1);
});
