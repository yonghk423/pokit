import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

export const HeroCharacterPickerActionContext = createContext<{ register: (action: ((restoreOnly?: boolean) => void) | null) => void; open: (deferUntilFocus?: boolean) => void; registerPhoto: (action: (() => void) | null) => void; openPhoto: (deferUntilFocus?: boolean) => void; registerAdd: (action: (() => void) | null) => void; openAdd: () => void; photoActive: boolean; setPhotoActive: (active: boolean) => void } | null>(null);
export function HeroCharacterPickerActionProvider({ children }: { children: ReactNode }) {
  const action = useRef<((restoreOnly?: boolean) => void) | null>(null);
  const pendingHome = useRef(false);
  const photoAction = useRef<(() => void) | null>(null);
  const pendingPhoto = useRef(false);
  const addAction = useRef<(() => void) | null>(null);
  const [photoActive, setPhotoActive] = useState(false);
  const register = useCallback((next: ((restoreOnly?: boolean) => void) | null) => { action.current = next; if (next && pendingHome.current) { pendingHome.current = false; next(true); } }, []);
  const open = useCallback((deferUntilFocus = false) => { pendingPhoto.current = false; setPhotoActive(false); if (deferUntilFocus || !action.current) { pendingHome.current = true; return; } pendingHome.current = false; action.current(); }, []);
  const registerPhoto = useCallback((next: (() => void) | null) => {
    photoAction.current = next;
    if (next && pendingPhoto.current) { pendingPhoto.current = false; next(); }
  }, []);
  const openPhoto = useCallback((deferUntilFocus = false) => {
    pendingHome.current = false;
    if (deferUntilFocus || !photoAction.current) { pendingPhoto.current = true; return; }
    photoAction.current();
  }, []);
  const registerAdd = useCallback((next: (() => void) | null) => { addAction.current = next; }, []);
  const openAdd = useCallback(() => { addAction.current?.(); }, []);
  const value = useMemo(() => ({ register, open, registerPhoto, openPhoto, registerAdd, openAdd, photoActive, setPhotoActive }), [register, open, registerPhoto, openPhoto, registerAdd, openAdd, photoActive]);
  return <HeroCharacterPickerActionContext.Provider value={value}>{children}</HeroCharacterPickerActionContext.Provider>;
}
