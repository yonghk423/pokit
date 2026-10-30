import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getClockNow, useAppClockEpoch } from './appClock';

/** Refresh local dates at midnight, on resume, and when the development clock changes. */
export function useTodayDate(): Date {
  const clockEpoch = useAppClockEpoch();
  const [, refresh] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      const now = getClockNow();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => { refresh(value => value + 1); schedule(); }, Math.max(1000, midnight.getTime() - now.getTime()));
    };
    schedule();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') { refresh(value => value + 1); schedule(); }
    });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [clockEpoch]);
  return getClockNow();
}
