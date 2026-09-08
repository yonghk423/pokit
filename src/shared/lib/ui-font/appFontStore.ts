import { create } from 'zustand';

import {
  loadAppFontId,
  loadAppFontSizeId,
  saveAppFontId,
  saveAppFontSizeId,
  type AppFontId,
  type AppFontSizeId,
} from '@shared/lib/storage';

import { DEFAULT_APP_FONT_ID } from './appFontIds';
import { resolveAppFontOpticalScale } from './appFontOpticalScale';
import { DEFAULT_APP_FONT_SIZE_ID, resolveAppFontSizeScale } from './appFontSize';

type AppFontState = {
  fontId: AppFontId;
  sizeId: AppFontSizeId;
  setFontId: (fontId: AppFontId) => void;
  setSizeId: (sizeId: AppFontSizeId) => void;
  hydrate: () => void;
};

export const useAppFontStore = create<AppFontState>((set) => ({
  fontId: DEFAULT_APP_FONT_ID,
  sizeId: DEFAULT_APP_FONT_SIZE_ID,
  setFontId: (fontId) => {
    saveAppFontId(fontId);
    set({ fontId });
  },
  setSizeId: (sizeId) => {
    saveAppFontSizeId(sizeId);
    set({ sizeId });
  },
  hydrate: () => {
    set({
      fontId: loadAppFontId(),
      sizeId: loadAppFontSizeId(),
    });
  },
}));

/** 실제 UI에 적용할 폰트 — ko/en/ja 공통 */
export function getEffectiveAppFontId(
  storedId: AppFontId = useAppFontStore.getState().fontId,
): AppFontId {
  return storedId;
}

export function useEffectiveAppFontId(): AppFontId {
  return useAppFontStore((s) => s.fontId);
}

export function getAppFontSizeScale(
  sizeId: AppFontSizeId = useAppFontStore.getState().sizeId,
  fontId: AppFontId = useAppFontStore.getState().fontId,
): number {
  return resolveAppFontSizeScale(sizeId) * resolveAppFontOpticalScale(fontId);
}

export function useAppFontSizeScale(): number {
  const sizeId = useAppFontStore((s) => s.sizeId);
  const fontId = useAppFontStore((s) => s.fontId);
  return resolveAppFontSizeScale(sizeId) * resolveAppFontOpticalScale(fontId);
}

export function useAppFontSizeId(): AppFontSizeId {
  return useAppFontStore((s) => s.sizeId);
}
