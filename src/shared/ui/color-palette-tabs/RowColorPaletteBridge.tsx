import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';

export type RowColorPaletteTabId = 'face' | 'ink' | 'mark';

export type RowColorPaletteTab = {
  id: RowColorPaletteTabId;
  label: string;
  panel: ReactNode;
};

type BridgeValue = {
  tabs: RowColorPaletteTab[];
  activeTab: RowColorPaletteTabId | null;
  setActiveTab: (id: RowColorPaletteTabId | null) => void;
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
  const [activeTab, setActiveTab] = useState<RowColorPaletteTabId | null>(null);
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
      activeTab,
      setActiveTab,
      ink,
      muted,
      isDark,
      claimSummaryHost,
      releaseSummaryHost,
      summaryHostClaimed,
    }),
    [
      tabs,
      activeTab,
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

/** 「요약」라벨 바로 위·폴백 헤더용 탭 스트립 */
export function RowColorPaletteTabStrip() {
  const bridge = useRowColorPaletteBridge();
  if (!bridge || bridge.tabs.length === 0) return null;

  const { tabs, activeTab, setActiveTab, ink, isDark } = bridge;
  const selectedBg = isDark ? RetroFlatColors.dark.bgMint : RetroFlatColors.light.bgMint;
  const selectedInk = isDark ? RetroFlatColors.dark.primary : RetroFlatColors.light.primary;

  return (
    <View style={styles.tabRow} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            hitSlop={4}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab(selected ? null : tab.id);
            }}
            style={({ pressed }) => [
              styles.tabChip,
              {
                /** 행 아이콘 박스와 동일 — 1px 실선 + 잉크색 */
                borderColor: ink,
                backgroundColor: selected ? selectedBg : 'transparent',
              },
              pressed && { transform: [{ translateX: 0.5 }, { translateY: 0.5 }] },
            ]}>
            <ThemedText
              style={[styles.tabLabel, { color: selected ? selectedInk : ink }]}
              numberOfLines={1}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RowColorPaletteActivePanel() {
  const bridge = useRowColorPaletteBridge();
  if (!bridge?.activeTab) return null;
  const tab = bridge.tabs.find((row) => row.id === bridge.activeTab);
  if (!tab) return null;
  return <View style={styles.panel}>{tab.panel}</View>;
}

/** RoutineSummaryField가 탭을 붙잡지 못할 때(체크리스트 등) 하단 폴백 */
export function RowColorPaletteFallbackHost() {
  const bridge = useRowColorPaletteBridge();
  /** 요약 필드 claim useLayoutEffect 이후에만 그려 중복 플래시 방지 */
  const [armed, setArmed] = useState(false);
  useLayoutEffect(() => {
    setArmed(true);
  }, []);

  if (!armed || !bridge || bridge.tabs.length === 0 || bridge.summaryHostClaimed) {
    return null;
  }

  return (
    <View style={styles.fallback}>
      <RowColorPaletteTabStrip />
      <RowColorPaletteActivePanel />
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    flexWrap: 'wrap',
    gap: 5,
  },
  tabChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 13,
  },
  panel: {
    marginTop: 10,
    alignSelf: 'stretch',
  },
  fallback: {
    alignSelf: 'stretch',
    gap: 10,
    paddingTop: 4,
  },
});
