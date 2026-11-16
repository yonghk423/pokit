import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { googleTasks } from './googleTasks';
import { t } from '@shared/lib/i18n/model/translate';
import { googleEvents, useGoogleCalendar } from './googleCalendar';
import { calendarSourceLabel } from './calendarSourceLabel';
import { useCallback, useEffect, useState } from 'react';
import { calendarError, deviceEvents, useAppleCalendar } from './appleCalendar';
import type { DeviceEvent } from './calendarDates';
export function useDeviceEvents(year: number, month: number, ko: boolean, enabled = true) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  const [loading, setLoading] = useState(false);
  const email = useGoogleCalendar(state => state.email);
  const tasksEmail = useGoogleCalendar(state => state.tasksEmail);
  const ids = useAppleCalendar(state => state.ids);
  const connected = enabled && (!!email || ids.length > 0);
  const [result, setResult] = useState<{ events: DeviceEvent[]; error: string }>({ events: [], error: '' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true, revision = 0;
    const refresh = async () => {
      const current = ++revision;
      setLoading(true);
      try {
        const start = new Date(year, month, 1), end = new Date(year, month + 1, 1);
        const [device, google, tasks] = await Promise.allSettled([
          deviceEvents(ids, start, end),
          email ? googleEvents(email, start, end) : Promise.resolve([] as DeviceEvent[]),
          email && tasksEmail === email ? googleTasks(email, start, end) : Promise.resolve([] as DeviceEvent[]),
        ]);
        const remote = google.status === 'fulfilled' ? google.value : [];
        const identity = (event: DeviceEvent) => JSON.stringify([event.title, +new Date(event.startDate), +new Date(event.endDate)]);
        const remoteKeys = new Set(remote.map(identity));
        const local = device.status === 'fulfilled' ? device.value.filter(event =>
          calendarSourceLabel(event.sourceName, event.sourceType, false) !== 'Google Calendar' || !remoteKeys.has(identity(event))) : [];
        const error = google.status === 'rejected' ? (translateUiText("Google 일정을 불러오지 못했어요. Google 계정 연결을 확인해주세요."))
          : tasks.status === 'rejected' ? t('settings.googleCalendar.tasksError')
          : device.status === 'rejected' ? calendarError(device.reason, ko) : '';
        if (alive && current === revision) setResult({ events: [...remote, ...local, ...(tasks.status === 'fulfilled' ? tasks.value : [])], error });
      } catch (error) { if (alive && current === revision) setResult({ events: [], error: calendarError(error, ko) }); }
      finally { if (alive && current === revision) setLoading(false); }
    };
    void refresh();
    return () => { alive = false; };
  }, [email, tasksEmail, ids, year, month, ko, refreshKey, enabled]);
  // Clear synchronously on disconnect, even before the effect runs.
  return { connected, ...(connected ? result : { events: [], error: '' }), loading: connected && loading, refresh };
}
