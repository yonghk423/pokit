import { createContext, useContext, type ReactNode } from 'react';

export type UiSurfacePresentation = 'default' | 'note';

/** 포스트잇·노트 면 위 텍스트/라인 — light-ink 면(네이비·다크그린 등) 대응 */
export type NoteSurfaceColors = {
  onSurface: string;
  onVariant: string;
  outline?: string;
  outlineVariant?: string;
  /** true면 화이트 잉크 면 — 트랙·칩 반투명도 밝은 계열 */
  usesLightInk?: boolean;
};

type UiSurfacePresentationContextValue = {
  presentation: UiSurfacePresentation;
  noteColors: NoteSurfaceColors | null;
};

const UiSurfacePresentationContext = createContext<UiSurfacePresentationContextValue>({
  presentation: 'default',
  noteColors: null,
});

export function UiSurfacePresentationProvider({
  value,
  noteColors = null,
  children,
}: {
  value: UiSurfacePresentation;
  noteColors?: NoteSurfaceColors | null;
  children: ReactNode;
}) {
  return (
    <UiSurfacePresentationContext.Provider
      value={{ presentation: value, noteColors: value === 'note' ? noteColors : null }}>
      {children}
    </UiSurfacePresentationContext.Provider>
  );
}

export function useUiSurfacePresentation(): UiSurfacePresentation {
  return useContext(UiSurfacePresentationContext).presentation;
}

export function useNoteSurfaceColors(): NoteSurfaceColors | null {
  return useContext(UiSurfacePresentationContext).noteColors;
}
