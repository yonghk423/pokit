import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { canUseGoogleCalendar } from './calendarProAccess';
import { googleTasks } from './googleTasks';
import { t } from '@shared/lib/i18n/model/translate';
import { googleEvents, useGoogleCalendar } from './googleCalendar';
import { calendarSourceLabel } from './calendarSourceLabel';
import { useCallback, useEffect, useRef, useState } from 'react';
import { calendarError, deviceEvents, useAppleCalendar } from './appleCalendar';
import type { DeviceEvent } from './calendarDates';
export function useDeviceEvents(year: number, month: number, ko: boolean, enabled = true, nearbyMonths = false) {
  const isPro = useSubscriptionStore(selectIsPro);
  const canReadApple = enabled && isPro;
  const canReadGoogle = enabled && canUseGoogleCalendar(isPro);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  const [loading, setLoading] = useState(false);
  const email = useGoogleCalendar(state => state.email);
  const tasksEmail = useGoogleCalendar(state => state.tasksEmail);
  const ids = useAppleCalendar(state => state.ids);
  const connected = (canReadGoogle && !!email) || (canReadApple && ids.length > 0);
  type MonthResult = { events: DeviceEvent[]; error: string };
  const cache = useRef(new Map<string, MonthResult>());
  const source = JSON.stringify([canReadGoogle, canReadApple, email, tasksEmail, ids, ko]);
  const key = (y: number, m: number) => JSON.stringify([source, y, m]);
  const [, redraw] = useState(0);
  useEffect(() => {
    cache.current.clear();
  }, [source, connected]);
  useEffect(() => {
    if (!connected) return;
    let alive = true, revision = 0;
    const refresh = async () => {
      const current = ++revision;
      setLoading(true);
      try {
        const start = new Date(year, month - Number(nearbyMonths), 1), end = new Date(year, month + 1 + Number(nearbyMonths), 1);
        const [device, google, tasks] = await Promise.allSettled([
          canReadApple ? deviceEvents(ids, start, end) : Promise.resolve([] as DeviceEvent[]),
          canReadGoogle && email ? googleEvents(email, start, end) : Promise.resolve([] as DeviceEvent[]),
          canReadGoogle && email && tasksEmail === email ? googleTasks(email, start, end) : Promise.resolve([] as DeviceEvent[]),
        ]);
        const remote = google.status === 'fulfilled' ? google.value : [];
        const identity = (event: DeviceEvent) => JSON.stringify([event.title, +new Date(event.startDate), +new Date(event.endDate)]);
        const remoteKeys = new Set(remote.map(identity));
        const local = device.status === 'fulfilled' ? device.value.filter(event =>
          calendarSourceLabel(event.sourceName, event.sourceType, false) !== 'Google Calendar' || !remoteKeys.has(identity(event))) : [];
        const error = google.status === 'rejected' ? (translateUiText("Google 일정을 불러오지 못했어요. Google 계정 연결을 확인해주세요."))
          : tasks.status === 'rejected' ? t('settings.googleCalendar.tasksError')
          : device.status === 'rejected' ? calendarError(device.reason, ko) : '';
        if (alive && current === revision) {
          const events = [...remote, ...local, ...(tasks.status === 'fulfilled' ? tasks.value : [])];
          for (let offset = -Number(nearbyMonths); offset <= Number(nearbyMonths); offset++) {
            const date = new Date(year, month + offset, 1);
            const monthKey = key(date.getFullYear(), date.getMonth());
            if (offset === 0 || !error) cache.current.set(monthKey, { events, error });
          }
          redraw(value => value + 1);
        }
      } catch (error) {
        if (alive && current === revision) {
          cache.current.set(key(year, month), {events: [], error: calendarError(error, ko)});
          redraw(value => value + 1);
        }
      }
      finally { if (alive && current === revision) setLoading(false); }
    };
    void refresh();
    return () => { alive = false; };
  }, [email, tasksEmail, ids, year, month, ko, refreshKey, connected, nearbyMonths, canReadApple, canReadGoogle, source]);
  // Clear synchronously on disconnect, even before the effect runs.
  return { connected, ...((connected && cache.current.get(key(year, month))) || { events: [], error: '' }), loading: connected && loading, refresh };
}
