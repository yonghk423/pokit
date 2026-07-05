import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import { MealSlotScheduleEditButton } from './MealSlotScheduleEditButton';
import type { MealSlotTimelinePalette } from './MealSlotTimelineView';

type Props = {
  dateLabel?: string;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  onPressEditSchedule?: () => void;
  /** 카드 상단 헤더 행 — 다른 데이플랜 탭과 같은 높이·타이포 */
  variant?: 'standalone' | 'pageHeader';
};

/** 구간 타임라인 상단 — 날짜·구간 시간 설정 */
export function MealSlotTimelineHeader({
  dateLabel,
  palette,
  isDark,
  onPressEditSchedule,
  variant = 'standalone',
}: Props) {
  const isPageHeader = variant === 'pageHeader';

  if (!dateLabel && !onPressEditSchedule) {
    return null;
  }

  return (
    <View style={[styles.root, isPageHeader && styles.rootPageHeader]}>
      <View style={styles.titleRow}>
        {dateLabel ? (
          <ThemedText
            style={[styles.title, { color: palette.ink }]}
            lightColor={palette.ink}
            darkColor={palette.ink}
            numberOfLines={2}>
            {dateLabel}
          </ThemedText>
        ) : null}
        {onPressEditSchedule ? (
          <MealSlotScheduleEditButton
            palette={palette}
            isDark={isDark}
            compact={isPageHeader}
            showLabel={!isPageHeader}
            onPress={onPressEditSchedule}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 2,
  },
  rootPageHeader: {
    paddingHorizontal: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
});
