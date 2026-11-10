import { Platform } from 'react-native';
import { create } from 'zustand';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import type { DeviceEvent } from './calendarDates';
const KEY = 'pokit:apple-calendar-selection:v1';
const DISCONNECTED_KEY = 'yourday:calendar-disconnected';
export const useAppleCalendar = create<{ ids: string[]; disconnected: boolean; disconnect: () => void; reconnect: () => void; select: (ids: string[]) => void }>(set => ({
  ids: localStorageClient.getJson<boolean>(DISCONNECTED_KEY) === true ? [] : localStorageClient.getJson<string[]>(KEY) ?? [],
  disconnected: localStorageClient.getJson<boolean>(DISCONNECTED_KEY) === true,
  disconnect: () => { localStorageClient.setJson(KEY, []); localStorageClient.setJson(DISCONNECTED_KEY, true); set({ ids: [], disconnected: true }); },
  reconnect: () => { localStorageClient.setJson(DISCONNECTED_KEY, false); set({ disconnected: false }); },
  select: ids => { localStorageClient.setJson(KEY, ids); set({ ids }); },
}));
export type DeviceCalendar = { id: string; title: string; color: string; sourceName: string; sourceType?: string };
async function api() {
  if (Platform.OS !== 'ios') throw new Error('ios_only');
  try { return require('expo-calendar/legacy') as typeof import('expo-calendar/legacy'); } catch { throw new Error('rebuild_required'); }
}
export async function deviceCalendars(request = false): Promise<DeviceCalendar[]> {
  const calendar = await api();
  const permission = request ? await calendar.requestCalendarPermissionsAsync() : await calendar.getCalendarPermissionsAsync();
  if (!permission.granted) throw new Error('permission_denied');
  return (await calendar.getCalendarsAsync(calendar.EntityTypes.EVENT)).map(value => ({
    id: value.id, title: value.title, color: value.color, sourceName: value.source?.name ?? '', ...(value.source?.type ? { sourceType: value.source.type } : {}),
  }));
}
export async function deviceEvents(ids: string[], start: Date, end: Date): Promise<DeviceEvent[]> {
  if (!ids.length) return [];
  const calendar = await api();
  if (!(await calendar.getCalendarPermissionsAsync()).granted) throw new Error('permission_denied');
  const available = (await calendar.getCalendarsAsync(calendar.EntityTypes.EVENT));
  const valid = ids.filter(id => available.some(value => value.id === id));
  if (!valid.length) throw new Error('calendar_selection_expired');
  const events = await calendar.getEventsAsync(valid, start, end);
  return events.map(value => ({ id: value.id, calendarId: value.calendarId, title: value.title, startDate: value.startDate, endDate: value.endDate, allDay: value.allDay, calendarTitle: available.find(calendar => calendar.id === value.calendarId)?.title, sourceName: available.find(calendar => calendar.id === value.calendarId)?.source?.name, sourceType: available.find(calendar => calendar.id === value.calendarId)?.source?.type }));
}
export function calendarError(error: unknown, ko: boolean) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'permission_denied') return ko ? '아이폰 설정에서 캘린더 전체 접근을 허용해주세요.' : 'Allow full calendar access in iPhone Settings.';
  if (code === 'calendar_selection_expired') return ko ? '선택한 캘린더를 아이폰에서 찾을 수 없어요. 설정에서 목록을 새로고침하고 다시 선택해주세요.' : 'Selected calendars are no longer available. Refresh and select them again in Settings.';
  if (code === 'rebuild_required') return ko ? '캘린더 연결을 사용하려면 앱 업데이트가 필요해요.' : 'Update the app to connect your calendar.';
  return ko ? '캘린더를 불러오지 못했어요. 다시 시도해주세요.' : 'Could not load calendars. Please try again.';
}
