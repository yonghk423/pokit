import { create } from 'zustand';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { googleSdk } from '../googleSignin';
import type { DeviceEvent } from './calendarDates';

const key = 'pokit:google-calendar-email';
const scope = 'https://www.googleapis.com/auth/calendar.events.readonly';
export const useGoogleCalendar = create<{ email: string | null }>(() => ({
  email: localStorageClient.getJson<string>(key) ?? null,
}));
export function selectGoogleCalendar(email: string | null) {
  localStorageClient.setJson(key, email);
  useGoogleCalendar.setState({ email });
}
export async function connectGoogleCalendar() {
  const sdk = googleSdk();
  await sdk.hasPlayServices();
  const login = await sdk.signIn();
  if (login.type !== 'success') return;
  const grant = login.data.scopes.includes(scope) ? login : await sdk.addScopes({ scopes: [scope] });
  if (!grant || grant.type !== 'success') return;
  if (!grant.data.scopes.includes(scope)) throw new Error('Google 캘린더 일정 읽기 권한이 필요합니다.');
  selectGoogleCalendar(grant.data.user.email);
}

type GoogleDate = { date?: string; dateTime?: string };
function timestamp(value: GoogleDate) {
  return value.dateTime ?? value.date + 'T00:00:00';
}
export async function googleEvents(email: string, start: Date, end: Date): Promise<DeviceEvent[]> {
  const sdk = googleSdk();
  const login = await sdk.signInSilently();
  if (login.type !== 'success' || login.data.user.email !== email) throw new Error('google_reconnect');
  const { accessToken } = await sdk.getTokens();
  const events: DeviceEvent[] = [];
  const params = new URLSearchParams({ singleEvents: 'true', timeMin: start.toISOString(), timeMax: end.toISOString(), maxResults: '2500' });
  do {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + params, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!response.ok) throw new Error('google_calendar_fetch');
    const page = await response.json() as { nextPageToken?: string; items?: { id: string; summary?: string; start?: GoogleDate; end?: GoogleDate; status?: string }[] };
    for (const item of page.items ?? []) {
      if (!item.start || !item.end || item.status === 'cancelled') continue;
      events.push({ id: 'google:' + item.id, calendarId: 'google:' + email, sourceName: 'Google', calendarTitle: email, title: item.summary ?? '', startDate: timestamp(item.start), endDate: timestamp(item.end), allDay: !!item.start.date });
    }
    if (!page.nextPageToken) break;
    params.set('pageToken', page.nextPageToken);
  } while (true);
  return events;
}
