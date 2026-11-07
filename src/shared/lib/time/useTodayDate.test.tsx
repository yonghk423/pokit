import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useTodayDate } from './useTodayDate';

it('reconciles the date when the device clock crosses midnight without an app resume', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 6, 23, 40));
  let day = '';
  let tree!: ReactTestRenderer;
  function Probe() { day = useTodayDate().toDateString(); return null; }
  try {
    act(() => { tree = create(<Probe />); });
    expect(day).toBe(new Date(2026, 10, 6).toDateString());
    // Simulate a native clock jump while the scheduled midnight timer is pending.
    jest.setSystemTime(new Date(2026, 10, 7, 0, 10));
    act(() => { jest.advanceTimersByTime(30_000); });
    expect(day).toBe(new Date(2026, 10, 7).toDateString());
  } finally {
    act(() => tree?.unmount());
    jest.useRealTimers();
  }
});
