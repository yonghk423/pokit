import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getClockNow, useAppClockEpoch } from './appClock';

/** Refresh local dates at midnight, on resume, and when the development clock changes. */
export function useTodayDate(): Date {
  const clockEpoch = useAppClockEpoch();
  const [, refresh] = useState(0);
  const renderedDay = getClockNow().toDateString();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      const now = getClockNow();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => { refresh(value => value + 1); schedule(); }, Math.max(1000, midnight.getTime() - now.getTime()));
    };
    schedule();
    // Native timers can be delayed across midnight while the app stays open.
    // Reconcile on setup as well, including a development Fast Refresh.
    const reconcileDay = () => {
      if (getClockNow().toDateString() !== renderedDay) refresh(value => value + 1);
    };
    reconcileDay();
    const dayCheck = setInterval(reconcileDay, 30_000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') { refresh(value => value + 1); schedule(); }
    });
    return () => { clearTimeout(timer); clearInterval(dayCheck); listener.remove(); };
  }, [clockEpoch, renderedDay]);
  return getClockNow();
}
