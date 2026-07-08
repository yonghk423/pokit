import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

/** 데일리 타임라인 헤더 — 전체 / 시간대별 / 스파인 레이아웃 */
export type DayPlanLayoutMode = 'bag' | 'sections' | 'spine';

type TabDef = {
  key: DayPlanLayoutMode;
  icon: string;
  accessibilityLabel: string;
};

export const DAY_PLAN_LAYOUT_MODE_LABELS_KO: Record<DayPlanLayoutMode, string> = {
  bag: '목록',
  sections: '시간대',
  spine: '타임라인',
};

const TABS: TabDef[] = [
  {
    key: 'bag',
    icon: 'list.bullet.rectangle',
    accessibilityLabel: '전체 루틴',
  },
  {
    key: 'sections',
    icon: 'sun.horizon.fill',
    accessibilityLabel: '시간대별 보기',
  },
  {
    key: 'spine',
    icon: 'clock',
    accessibilityLabel: '타임라인 보기',
  },
];

type Props = {
  mode: DayPlanLayoutMode;
  onSelectMode: (mode: DayPlanLayoutMode) => void;
  c: DayPlanPalette;
  isDark: boolean;
  /** 비어 있으면 전체 표시 */
  visibleModes?: readonly DayPlanLayoutMode[];
  /** true면 선택된 탭을 다시 눌러도 onSelectMode 호출 */
  allowReselect?: boolean;
  /** 아이콘 아래 모드 이름(목록·시간대·타임라인) 표시 */
  showLabels?: boolean;
};

/** 오늘 탭 헤더 — 원형 아이콘 레이아웃 전환 */
export function DayPlanLayoutModeTabs({
  mode,
  onSelectMode,
  c,
  isDark,
  visibleModes,
  allowReselect = false,
  showLabels = false,
}: Props) {
  const pill = tabPillColors(isDark);
  const tabs = visibleModes
    ? TABS.filter((item) => visibleModes.includes(item.key))
    : TABS;

  if (tabs.length === 0) return null;
  if (!showLabels && tabs.length <= 1) return null;

  return (
    <View style={[styles.root, showLabels && styles.rootLabeled]}>
      {tabs.map((item) => {
        const active = mode === item.key;
        const label = DAY_PLAN_LAYOUT_MODE_LABELS_KO[item.key];
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={showLabels ? label : item.accessibilityLabel}
            onPress={() => {
              if (active && !allowReselect) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectMode(item.key);
            }}
            style={({ pressed }) => [
              showLabels ? styles.labeledTab : styles.tab,
              {
                backgroundColor: active ? pill.activeBg : pill.inactiveBg,
                borderColor: active ? pill.activeBorder : pill.inactiveBorder,
                borderWidth: active ? 2 : 1,
              },
              pressed && styles.pressed,
            ]}>
            <View
              style={[
                styles.iconBox,
                showLabels && styles.iconBoxLabeled,
                !showLabels && {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                },
              ]}>
              <IconSymbol
                name={item.icon as 'sun.horizon.fill'}
                size={15}
                color={active ? pill.activeIcon : pill.inactiveIcon}
              />
            </View>
            {showLabels ? (
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: active ? c.onSurface : c.onVariant },
                ]}
                numberOfLines={1}>
                {label}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rootLabeled: {
    gap: 8,
  },
  tab: {
    width: 34,
    height: 34,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labeledTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxLabeled: {
    width: 18,
    height: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  pressed: {
    opacity: 0.72,
  },
});
