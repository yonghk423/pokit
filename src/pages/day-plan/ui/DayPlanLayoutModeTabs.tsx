import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

/** 데일리 타임라인 헤더 — 전체 / 시간대별 / 스파인 레이아웃 */
export type DayPlanLayoutMode = 'bag' | 'sections' | 'spine';

type TabDef = {
  key: DayPlanLayoutMode;
  icon: string;
  accessibilityLabel: string;
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
};

/** 오늘 탭 헤더 — 원형 아이콘 레이아웃 전환 */
export function DayPlanLayoutModeTabs({
  mode,
  onSelectMode,
  c,
  isDark,
}: Props) {
  const pill = tabPillColors(isDark);

  return (
    <View style={styles.root}>
      {TABS.map((item) => {
        const active = mode === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.accessibilityLabel}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectMode(item.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: active ? pill.activeBg : pill.inactiveBg,
                borderColor: active ? pill.activeBorder : pill.inactiveBorder,
                borderWidth: active ? 2 : 1,
              },
              pressed && styles.pressed,
            ]}>
            <IconSymbol
              name={item.icon as 'sun.horizon.fill'}
              size={15}
              color={active ? pill.activeIcon : pill.inactiveIcon}
            />
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
  tab: {
    width: 34,
    height: 34,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
