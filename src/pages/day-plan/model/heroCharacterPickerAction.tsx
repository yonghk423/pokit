import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

export const HeroCharacterPickerActionContext = createContext<{ register: (action: (() => void) | null) => void; open: () => void; registerPhoto: (action: (() => void) | null) => void; openPhoto: () => void; registerAdd: (action: (() => void) | null) => void; openAdd: () => void; photoActive: boolean; setPhotoActive: (active: boolean) => void } | null>(null);
export function HeroCharacterPickerActionProvider({ children }: { children: ReactNode }) {
  const action = useRef<(() => void) | null>(null);
  const photoAction = useRef<(() => void) | null>(null);
  const addAction = useRef<(() => void) | null>(null);
  const [photoActive, setPhotoActive] = useState(false);
  const register = useCallback((next: (() => void) | null) => { action.current = next; }, []);
  const open = useCallback(() => { action.current?.(); }, []);
  const registerPhoto = useCallback((next: (() => void) | null) => { photoAction.current = next; }, []);
  const openPhoto = useCallback(() => { photoAction.current?.(); }, []);
  const registerAdd = useCallback((next: (() => void) | null) => { addAction.current = next; }, []);
  const openAdd = useCallback(() => { addAction.current?.(); }, []);
  const value = useMemo(() => ({ register, open, registerPhoto, openPhoto, registerAdd, openAdd, photoActive, setPhotoActive }), [register, open, registerPhoto, openPhoto, registerAdd, openAdd, photoActive]);
  return <HeroCharacterPickerActionContext.Provider value={value}>{children}</HeroCharacterPickerActionContext.Provider>;
}
