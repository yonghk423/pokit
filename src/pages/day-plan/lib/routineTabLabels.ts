import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

export type RoutineTabKey = 'catalog' | 'templates' | 'myRoutines';

const TAB_KEYS: RoutineTabKey[] = ['catalog', 'templates', 'myRoutines'];
const listeners = new Set<() => void>();

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().slice(0, 16);
  return name || null;
}

export function readRoutineTabLabels(): Partial<Record<RoutineTabKey, string>> {
  const saved = localStorageClient.getJson<Record<string, unknown>>(StorageKeys.routineTabLabels);
  return Object.fromEntries(
    TAB_KEYS.flatMap((key) => {
      const name = trimmed(saved?.[key]);
      return name ? [[key, name]] : [];
    }),
  );
}

export function writeRoutineTabLabels(labels: Partial<Record<RoutineTabKey, string>>) {
  const next = Object.fromEntries(
    TAB_KEYS.flatMap((key) => {
      const name = trimmed(labels[key]);
      return name ? [[key, name]] : [];
    }),
  );
  localStorageClient.setJson(StorageKeys.routineTabLabels, next);
  listeners.forEach((listener) => listener());
}

export function subscribeRoutineTabLabels(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 받침이 있으면 을, 없으면 를. 한글이 아니면 조사를 붙이지 않는다. */
export function objectParticle(name: string): string {
  const last = Array.from(name.trim()).pop() ?? '';
  const code = last.codePointAt(0) ?? 0;
  if (code < 0xac00 || code > 0xd7a3) return '';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}
