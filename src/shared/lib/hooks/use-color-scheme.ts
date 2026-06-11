import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';

export function useColorScheme(): 'light' | 'dark' {
  return useAppearanceStore((s) => s.mode);
}
