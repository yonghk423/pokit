import { create } from 'zustand';

import type { AppearanceMode } from '@shared/lib/storage/settingsStorage';
import { loadAppearanceMode, saveAppearanceMode } from '@shared/lib/storage/settingsStorage';

type AppearanceState = {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  hydrate: () => void;
};

export const useAppearanceStore = create<AppearanceState>((set) => ({
  mode: 'light',
  setMode: (mode) => {
    saveAppearanceMode(mode);
    set({ mode });
  },
  hydrate: () => {
    set({ mode: loadAppearanceMode() });
  },
}));
