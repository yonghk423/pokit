import type { ReactNode } from 'react';
import { View, type LayoutRectangle } from 'react-native';
export { clearTutorialOffPathHandler, setTutorialHole, setTutorialOffPathHandler } from './offPath';
export type GuideFrame = { target: LayoutRectangle | null; width: number; height: number };
type Layer = {
  show: (entry: { id: string; render: (frame: GuideFrame) => ReactNode }) => void;
  hide: (id: string) => void;
  target: (id: string, view: View | null) => void;
};
export const useTutorialGuideLayer = (): Layer | null => null;
/** Retired overlay host: retain the existing flex boundary without guide timers or input overlays. */
export function TutorialGuideLayer({ children }: { children: ReactNode }) {
  return <View collapsable={false} style={{ flex: 1 }}>{children}</View>;
}
