import { hasGoogleCalendarAccess } from './calendarProAccess';
import type { DeviceEvent } from './calendarDates';
import { googleSdk } from '../googleSignin';

const base = 'https://tasks.googleapis.com/tasks/v1';

async function readPages<T>(path: string, token: string, params: URLSearchParams): Promise<T[]> {
  const items: T[] = [];
  do {
    if (!hasGoogleCalendarAccess()) return [];
    const response = await fetch(base + path + '?' + params, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw new Error('google_tasks_fetch');
    const page = await response.json() as { items?: T[]; nextPageToken?: string };
    items.push(...(page.items ?? []));
    if (!page.nextPageToken) break;
    params.set('pageToken', page.nextPageToken);
  } while (true);
  return items;
}

function localDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export async function googleTasks(email: string, start: Date, end: Date): Promise<DeviceEvent[]> {
  if (!hasGoogleCalendarAccess()) return [];
  const sdk = googleSdk();
  const login = await sdk.signInSilently();
  if (login.type !== 'success' || login.data.user.email !== email) throw new Error('google_reconnect');
  const { accessToken } = await sdk.getTokens();
  const lists = await readPages<{ id: string; title: string }>('/users/@me/lists', accessToken, new URLSearchParams({ maxResults: '100' }));
  const events: DeviceEvent[] = [];
  const from = localDate(start), until = localDate(end);
  for (const list of lists) {
    const params = new URLSearchParams({ dueMin: from + 'T00:00:00Z', dueMax: until + 'T00:00:00Z', maxResults: '100', showHidden: 'true', showCompleted: 'true', showAssigned: 'true' });
    const tasks = await readPages<{ id: string; title: string; due?: string; deleted?: boolean }>('/lists/' + encodeURIComponent(list.id) + '/tasks', accessToken, params);
    for (const task of tasks) {
      const day = task.due?.slice(0, 10);
      if (!day || day < from || day >= until || task.deleted) continue;
      const startDate = new Date(day + 'T00:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      events.push({ id: 'google-task:' + list.id + ':' + task.id, calendarId: 'google-task:' + list.id, calendarTitle: 'Google Tasks · ' + list.title, sourceName: 'Google', title: task.title, startDate, endDate, allDay: true });
    }
  }
  return hasGoogleCalendarAccess() ? events : [];
}
