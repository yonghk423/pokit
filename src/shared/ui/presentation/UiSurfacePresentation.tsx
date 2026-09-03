import { createContext, useContext, type ReactNode } from 'react';

export type UiSurfacePresentation = 'default' | 'note';

const UiSurfacePresentationContext = createContext<UiSurfacePresentation>('default');

export function UiSurfacePresentationProvider({
  value,
  children,
}: {
  value: UiSurfacePresentation;
  children: ReactNode;
}) {
  return (
    <UiSurfacePresentationContext.Provider value={value}>
      {children}
    </UiSurfacePresentationContext.Provider>
  );
}

export function useUiSurfacePresentation(): UiSurfacePresentation {
  return useContext(UiSurfacePresentationContext);
}
