import { localStorageClient } from '@shared/lib/storage/localStorageClient';
export type PrintPosition = { x: number; y: number; order: number; rotation?: number };
export type PrintPositions = Record<string, PrintPosition>;
const KEY = 'pokit:print-positions:v1';
export function loadPrintPositions(): PrintPositions {
  const raw = localStorageClient.getJson<PrintPositions>(KEY);
  return Object.fromEntries(Object.entries(raw ?? {}).filter(([, value]) => value && [value.x, value.y, value.order].every(Number.isFinite) && (value.rotation === undefined || Number.isFinite(value.rotation))));
}
export function savePrintPosition(key: string, x: number, y: number, rotation?: number): PrintPositions {
  const positions = loadPrintPositions();
  positions[key] = { x, y, ...(Number.isFinite(rotation) ? { rotation } : Number.isFinite(positions[key]?.rotation) ? { rotation: positions[key].rotation } : {}), order: Math.max(0, ...Object.values(positions).map(value => value.order)) + 1 };
  localStorageClient.setJson(KEY, positions);
  return positions;
}
