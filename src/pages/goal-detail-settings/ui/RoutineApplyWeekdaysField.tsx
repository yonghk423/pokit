import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { notifyFixedFlowApplyScheduleChanged } from '@entities/day-plan';
import {
  formatApplyWeekdaysHint,
  loadCategoryApplyWeekdays,
  saveCategoryApplyWeekdays,
  clearCategoryApplyWeekdays,
  WEEKDAY_PRESET_DAILY,
  type WeekdayIndex,
} from '@shared/lib/storage';
import { ApplyWeekdayPicker } from '@shared/ui/ApplyWeekdayPicker';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  categoryKey: string;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  isDark: boolean;
};

export function RoutineApplyWeekdaysField({
  categoryKey,
  ink,
  muted,
  line,
  surface,
  isDark,
}: Props) {
  const initial = useMemo(
    () => loadCategoryApplyWeekdays(categoryKey) ?? [...WEEKDAY_PRESET_DAILY],
    [categoryKey],
  );
  const [enabled, setEnabled] = useState(() => loadCategoryApplyWeekdays(categoryKey) != null);
  const [weekdays, setWeekdays] = useState<WeekdayIndex[]>(initial);

  useEffect(() => {
    const saved = loadCategoryApplyWeekdays(categoryKey);
    setEnabled(saved != null);
    setWeekdays(saved ?? [...WEEKDAY_PRESET_DAILY]);
  }, [categoryKey]);

  const persist = useCallback(
    (nextEnabled: boolean, nextWeekdays: WeekdayIndex[]) => {
      if (nextEnabled) {
        saveCategoryApplyWeekdays(categoryKey, nextWeekdays);
      } else {
        clearCategoryApplyWeekdays(categoryKey);
      }
      notifyFixedFlowApplyScheduleChanged();
    },
    [categoryKey],
  );

  const handleToggleEnabled = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    persist(nextEnabled, weekdays);
  };

  const handleChangeWeekdays = (next: WeekdayIndex[]) => {
    setWeekdays(next);
    if (enabled) persist(true, next);
  };

  return (
    <View style={[styles.card, { borderColor: line, backgroundColor: surface }]}>
      <View style={styles.headerRow}>
        <ThemedText style={[styles.title, { color: ink }]}>요일별 자동 담기</ThemedText>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          accessibilityLabel={enabled ? '요일별 자동 담기 끄기' : '요일별 자동 담기 켜기'}
          onPress={handleToggleEnabled}
          style={({ pressed }) => [
            styles.toggleChip,
            {
              borderColor: enabled ? ink : line,
              backgroundColor: enabled ? 'rgba(0,0,0,0.08)' : 'transparent',
              opacity: pressed ? 0.86 : 1,
            },
          ]}>
          <ThemedText style={[styles.toggleLabel, { color: enabled ? ink : muted }]}>
            {enabled ? '켜짐' : '꺼짐'}
          </ThemedText>
        </Pressable>
      </View>
      {enabled ? (
        <>
          <ThemedText style={[styles.sub, { color: muted }]}>
            선택 요일마다 오늘 탭에 자동 추가 · {formatApplyWeekdaysHint(weekdays)}
          </ThemedText>
          <ApplyWeekdayPicker
            selectedWeekdays={weekdays}
            onChange={handleChangeWeekdays}
            isDark={isDark}
            ink={ink}
            muted={muted}
            line={line}
            surface={surface}
            compact
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.15,
    flex: 1,
  },
  sub: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  toggleChip: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
