import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';

export type CanvasEvent = { id: string; title: string; time?: string; pen?: string; paper?: string; inlineTitle?: string; illustrations?: string[]; illustration?: string };
const monthSnapshots = new Map<string, string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const notify = () => listeners.forEach(listener => listener());
export function saveCanvasEvents(date: string, events: CanvasEvent[]) {
  localStorageClient.setJson(`pokit:canvas-events:${date}`, events);
  monthSnapshots.delete(date.slice(0, 7));
  notify();
}
export function canvasEventDates(year: number, month: number): string[] {
  return Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => getLocalDateKey(new Date(year, month, i + 1, 12)))
    .filter(date => (localStorageClient.getJson<CanvasEvent[]>(`pokit:canvas-events:${date}`) ?? []).some(event => event.title.trim()));
}
export function useCanvasEventDates(year: number, month: number) {
  useFocusEffect(useCallback(() => { monthSnapshots.clear(); notify(); }, []));
  const monthKey = getLocalDateKey(new Date(year, month, 1, 12)).slice(0, 7);
  const snapshot = () => {
    const cached = monthSnapshots.get(monthKey);
    if (cached !== undefined) return cached;
    const value = canvasEventDates(year, month).join(',');
    monthSnapshots.set(monthKey, value);
    return value;
  };
  const dates = useSyncExternalStore(subscribe, snapshot, snapshot);
  return dates ? dates.split(',') : [];
}
