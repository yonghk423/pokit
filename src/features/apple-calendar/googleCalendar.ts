import { create } from 'zustand';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { googleSdk } from '../googleSignin';
import type { DeviceEvent } from './calendarDates';

const key = 'pokit:google-calendar-email';
const tasksKey = 'pokit:google-tasks-email';
const tasksScope = 'https://www.googleapis.com/auth/tasks.readonly';
const scope = 'https://www.googleapis.com/auth/calendar.events.readonly';
const readGoogleConnection = () => ({
  tasksEmail: localStorageClient.getJson<string>(tasksKey) ?? null,
  email: localStorageClient.getJson<string>(key) ?? null,
});
export const useGoogleCalendar = create(readGoogleConnection);
export function hydrateGoogleCalendar() {
  useGoogleCalendar.setState(readGoogleConnection());
}
export function selectGoogleCalendar(email: string | null) {
  localStorageClient.setJson(key, email);
  localStorageClient.setJson(tasksKey, null);
  useGoogleCalendar.setState({ email, tasksEmail: null });
}
export async function connectGoogleCalendar() {
  const sdk = googleSdk();
  await sdk.hasPlayServices();
  const existing = useGoogleCalendar.getState().email;
  let login = existing ? await sdk.signInSilently() : await sdk.signIn();
  if (existing && (login.type !== 'success' || login.data.user.email !== existing)) {
    login = await sdk.signIn();
  }
  if (login.type !== 'success') return;
  const { scopes, user: { email } } = login.data;
  if (existing && existing !== email) throw new Error('google_reconnect');
  const required = [scope, tasksScope];
  const missing = required.filter(permission => !scopes.includes(permission));
  const grant = missing.length ? await sdk.addScopes({ scopes: missing }) : login;
  if (!grant || grant.type !== 'success') return;
  if (grant.data.user.email !== email || !required.every(permission => grant.data.scopes.includes(permission))) {
    throw new Error('google_permissions');
  }
  if (useGoogleCalendar.getState().email !== existing) return;
  localStorageClient.setJson(key, email);
  localStorageClient.setJson(tasksKey, email);
  useGoogleCalendar.setState({ email, tasksEmail: email });
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
