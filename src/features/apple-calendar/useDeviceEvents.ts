import { useCallback, useEffect, useState } from 'react';
import { calendarError, deviceEvents, useAppleCalendar } from './appleCalendar';
import type { DeviceEvent } from './calendarDates';
export function useDeviceEvents(year: number, month: number, ko: boolean) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  const [loading, setLoading] = useState(false);
  const ids = useAppleCalendar(state => state.ids);
  const [result, setResult] = useState<{ events: DeviceEvent[]; error: string }>({ events: [], error: '' });
  useEffect(() => {
    let alive = true, revision = 0;
    const refresh = async () => {
      const current = ++revision;
      setLoading(true);
      try {
        const events = await deviceEvents(ids, new Date(year, month, 1), new Date(year, month + 1, 1));
        if (alive && current === revision) setResult({ events, error: '' });
      } catch (error) { if (alive && current === revision) setResult({ events: [], error: calendarError(error, ko) }); }
      finally { if (alive && current === revision) setLoading(false); }
    };
    void refresh();
    return () => { alive = false; };
  }, [ids, year, month, ko, refreshKey]);
  // Clear synchronously on disconnect, even before the effect runs.
  return { ...(ids.length ? result : { events: [], error: '' }), loading: ids.length > 0 && loading, refresh };
}
