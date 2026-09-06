import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { HistoryPeriod } from '../lib/historyPeriodRange';

type Props = {
  period: HistoryPeriod;
  onSelectPeriod: (period: HistoryPeriod) => void;
  isDark: boolean;
};

const TABS: { id: HistoryPeriod; labelKey: 'history.period.week' | 'history.period.month' }[] = [
  { id: 'week', labelKey: 'history.period.week' },
  { id: 'month', labelKey: 'history.period.month' },
];

/** 히스토리 — 루틴 탭(목록/템플릿)과 동일한 컴팩트 포스트잇 세그먼트 */
export function HistoryPeriodTabs({ period, onSelectPeriod, isDark }: Props) {
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const face = tone.primaryContainer;
  const divider = isDark ? 'rgba(241,239,255,0.22)' : 'rgba(48,97,99,0.18)';
  const activeBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.72)';
  const activeText = isDark ? tone.text : tone.primary;
  const inactiveText = isDark ? tone.textMuted : tone.primary;

  return (
    <PostItCardShell
      compact
      isDark={isDark}
      faceColor={face}
      style={styles.root}
      contentStyle={styles.track}>
      {TABS.map((tab, index) => {
        const active = period === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(tab.labelKey)}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectPeriod(tab.id);
            }}
            style={({ pressed }) => [
              styles.tab,
              index > 0 && [styles.tabJoin, { borderLeftColor: divider }],
              {
                backgroundColor: active ? activeBg : 'transparent',
              },
              pressed && { opacity: 0.88 },
            ]}>
            <ThemedText
              style={[
                styles.label,
                active && styles.labelActive,
                { color: active ? activeText : inactiveText },
              ]}
              numberOfLines={1}>
              {t(tab.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </PostItCardShell>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 2,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tabJoin: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  labelActive: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
