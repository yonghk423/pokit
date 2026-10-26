import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PostItColorGrid } from '@shared/ui/post-it-color-palette';
import { useTranslation } from '@shared/lib/i18n';
import { RoutineActionIcon } from '@shared/ui/routine-action-icon';
import { type DeskTool } from '@shared/ui/stationery-desk/choices';
import { StationeryCaptionIcon } from '@shared/ui/stationery-desk/StationeryCaptionIcon';

export type RowColorPaletteTabId = 'face' | 'ink';

export type RowColorPaletteTab = DeskTool;

type BridgeValue = {
  tabs: RowColorPaletteTab[];
  ink: string;
  muted: string;
  isDark: boolean;
  claimSummaryHost: () => void;
  releaseSummaryHost: () => void;
  summaryHostClaimed: boolean;
};

const RowColorPaletteBridgeContext = createContext<BridgeValue | null>(null);

export function useRowColorPaletteBridge(): BridgeValue | null {
  return useContext(RowColorPaletteBridgeContext);
}

export function RowColorPaletteBridgeProvider({
  tabs,
  ink,
  muted,
  isDark,
  children,
}: {
  tabs: RowColorPaletteTab[];
  ink: string;
  muted: string;
  isDark: boolean;
  children: ReactNode;
}) {
  const [summaryHostClaimed, setSummaryHostClaimed] = useState(false);

  const claimSummaryHost = useCallback(() => {
    setSummaryHostClaimed(true);
  }, []);
  const releaseSummaryHost = useCallback(() => {
    setSummaryHostClaimed(false);
  }, []);

  const value = useMemo(
    () => ({
      tabs,
      ink,
      muted,
      isDark,
      claimSummaryHost,
      releaseSummaryHost,
      summaryHostClaimed,
    }),
    [
      tabs,
      ink,
      muted,
      isDark,
      claimSummaryHost,
      releaseSummaryHost,
      summaryHostClaimed,
    ],
  );

  return (
    <RowColorPaletteBridgeContext.Provider value={value}>
      {children}
    </RowColorPaletteBridgeContext.Provider>
  );
}

/** Paper and ink color tabs, shared by routine detail and catalog editors. */
export function RowColorPaletteDesk() {
  const bridge = useRowColorPaletteBridge();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<RowColorPaletteTabId>('face');
  if (!bridge || bridge.tabs.length === 0) return null;
  const { tabs, ink } = bridge;
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <View style={styles.workspace}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.stationeryTools')}
        accessibilityState={{ expanded }}
        onPress={() => { void Haptics.selectionAsync(); setExpanded((value) => !value); }}
        style={styles.toolsButton}>
        <View style={styles.toolsGlyph}>
          <View style={styles.paperGlyph}><StationeryCaptionIcon kind="face" color="#FBFAF6" size={26} /></View>
          <View style={styles.penGlyph}><StationeryCaptionIcon kind="ink" color="#656960" size={27} /></View>
        </View>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <RoutineActionIcon name="expand" color={bridge.isDark ? '#C4C8C0' : '#656960'} size={15} />
        </View>
      </Pressable>
      {expanded ? <View style={styles.panel}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active.id === tab.id }}
            onPress={() => { void Haptics.selectionAsync(); setActiveId(tab.id); }}
            style={styles.tab}>
            <View style={styles.tabIconTile}>
            <StationeryCaptionIcon
              kind={tab.id}
              color={tab.choices?.find((choice) => choice.selected)?.color ?? tab.swatch ?? (tab.id === 'face' ? '#FBFAF6' : ink)}
              size={32}
            />
            {active.id === tab.id ? <View style={styles.activeTabUnderline} /> : null}
            </View>
          </Pressable>
        ))}
      </View>
      <PostItColorGrid
        texture={active.id === 'face' ? 'pigment' : 'paper'}
        label={active.label}
        choices={active.choices ?? []}
        onClear={active.reset}
        clearLabel={active.label}
        isDark={bridge.isDark}
      />
      </View> : null}
    </View>
  );
}

/** RoutineSummaryField가 탭을 붙잡지 못할 때(체크리스트 등) 하단 폴백 */
export function RowColorPaletteFallbackHost() {
  const bridge = useRowColorPaletteBridge();
  /** 요약 필드 claim useLayoutEffect 이후에만 그려 중복 플래시 방지 */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!armed || !bridge || bridge.tabs.length === 0 || bridge.summaryHostClaimed) {
    return null;
  }

  return (
    <View style={styles.fallback}>
      <RowColorPaletteDesk />
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: { alignSelf: 'stretch', gap: 14, paddingVertical: 6 },
  toolsButton: { alignSelf: 'flex-end', minHeight: 44, minWidth: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  toolsGlyph: { width: 36, height: 38 },
  paperGlyph: { position: 'absolute', left: 0, top: 4 },
  penGlyph: { position: 'absolute', right: 0, top: 0 },
  panel: { gap: 14 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  tabIconTile: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  activeTabUnderline: { position: 'absolute', bottom: 0, width: 30, height: 1.5, backgroundColor: '#B7C6B9', borderRadius: 1 },
  fallback: { alignSelf: 'stretch', paddingTop: 4 },
});
