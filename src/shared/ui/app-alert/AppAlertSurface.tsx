import { createContext, useContext, useId, useLayoutEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { activeAlertScope, useAppAlertStore } from '@shared/lib/app-alert';
import { AppAlertHost } from './AppAlertHost';

export const AlertDepthContext = createContext(0);

export function useAppAlertScope(active: boolean) {
  const id = useId();
  const depth = useContext(AlertDepthContext) + 1;
  useLayoutEffect(() => {
    if (!active) return;
    useAppAlertStore.getState().registerScope({ id, depth });
    return () => useAppAlertStore.getState().releaseScope(id);
  }, [active, depth, id]);
  return { id, depth };
}

export function AppAlertSurface({ children, scopeId, depth, enabled = true }: {
  children: ReactNode;
  scopeId: string;
  depth: number;
  enabled?: boolean;
}) {
  const request = useAppAlertStore((state) => state.queue[0]);
  const scopes = useAppAlertStore((state) => state.scopes);
  const covered = enabled && Boolean(request) && activeAlertScope(scopes) === scopeId;
  return (
    <AlertDepthContext.Provider value={depth}>
      <View style={styles.fill} collapsable={false}>
        <View style={styles.fill} accessibilityElementsHidden={covered} importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'} pointerEvents={covered ? 'none' : 'auto'}>
          {children}
        </View>
        {enabled ? <AppAlertHost scopeId={scopeId} /> : null}
      </View>
    </AlertDepthContext.Provider>
  );
}

export function AppAlertRoot({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  return <AppAlertSurface scopeId="root" depth={0} enabled={enabled}>{children}</AppAlertSurface>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
