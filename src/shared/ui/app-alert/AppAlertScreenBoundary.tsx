import { useFocusEffect } from 'expo-router';
import { useCallback, useContext, useId, type ReactNode } from 'react';

import { useAppAlertStore } from '@shared/lib/app-alert';
import { AlertDepthContext, AppAlertSurface } from './AppAlertSurface';

/** Keeps alerts inside a native-stack full-screen presentation. */
export function AppAlertScreenBoundary({ children }: { children: ReactNode }) {
  const id = useId();
  const depth = useContext(AlertDepthContext) + 1;
  useFocusEffect(useCallback(() => {
    useAppAlertStore.getState().registerScope({ id, depth });
    return () => useAppAlertStore.getState().releaseScope(id);
  }, [depth, id]));
  return <AppAlertSurface scopeId={id} depth={depth}>{children}</AppAlertSurface>;
}
