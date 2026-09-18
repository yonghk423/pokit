import { create } from 'zustand';

type AppClockState = {
  epoch: number;
  bump: () => void;
};

/** UI가 가짜 오늘에 다시 그리도록 하는 세대 번호 */
export const useAppClockStore = create<AppClockState>((set) => ({
  epoch: 0,
  bump: () => set((s) => ({ epoch: s.epoch + 1 })),
}));

let overrideMs: number | null = null;

/** 앱이 보는 ‘지금’. __DEV__에서만 오버라이드된다. */
export function getClockNow(): Date {
  return overrideMs == null ? new Date() : new Date(overrideMs);
}

export function getDevClockOverrideMs(): number | null {
  return overrideMs;
}

export function setDevClockNow(date: Date | null): void {
  if (!__DEV__) return;
  overrideMs = date ? date.getTime() : null;
  useAppClockStore.getState().bump();
}

/** 앱 오늘을 다음날 오전 8시로 옮긴다. */
export function advanceDevClockToNextLocalMorning(hour = 8, minute = 0): Date {
  const now = getClockNow();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    hour,
    minute,
    0,
    0,
  );
  setDevClockNow(next);
  return next;
}

export function clearDevClock(): void {
  if (!__DEV__) return;
  if (overrideMs == null) return;
  overrideMs = null;
  useAppClockStore.getState().bump();
}

export function useAppClockEpoch(): number {
  return useAppClockStore((s) => s.epoch);
}
