import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  collectRoutineStartNotifySlots,
  formatHhmmClockKo,
  hasResolvableRoutineStartTime,
  useDayPlanDraftStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import {
  isRoutineStartNotifyEnabled,
  persistRoutineStartNotifyToggle,
} from '@features/day-plan-notifications';
import { loadDayMealSlotSchedule } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  categoryKey: string;
  ink: string;
  muted: string;
  border: string;
  isDark?: boolean;
};

/** 목표 상세 — 루틴 시작 시각에 맞춘 알림 on/off */
export function RoutineStartNotifyField({
  categoryKey,
  ink,
  muted,
  border,
  isDark = false,
}: Props) {
  const sets = useFixedFlowSetsStore((s) => s.sets);
  const activeSetIds = useFixedFlowSetsStore((s) => s.activeSetIds);
  const planBlocks = useDayPlanStore((s) => s.blocks);
  const { priorityMealSlotOverrides, prioritySectionsMealSlots } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityMealSlotOverrides: s.priorityMealSlotOverrides,
      prioritySectionsMealSlots: s.prioritySectionsMealSlots,
    })),
  );

  const [enabled, setEnabled] = useState(() => isRoutineStartNotifyEnabled(categoryKey));
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEnabled(isRoutineStartNotifyEnabled(categoryKey));
    }, [categoryKey]),
  );

  const resolveInput = useMemo(() => {
    return {
      categoryKey,
      sets,
      activeSetIds,
      mealSchedule: loadDayMealSlotSchedule(),
      planBlocks,
      sectionsMealSlots: {
        ...priorityMealSlotOverrides,
        ...prioritySectionsMealSlots,
      },
    };
  }, [
    activeSetIds,
    categoryKey,
    planBlocks,
    priorityMealSlotOverrides,
    prioritySectionsMealSlots,
    sets,
  ]);

  const canResolve = useMemo(
    () => hasResolvableRoutineStartTime(resolveInput),
    [resolveInput],
  );

  const timeHint = useMemo(() => {
    if (!canResolve) {
      return '나만의 루틴에서 시작 시간(타임라인·시간대)을 정하면 그 시각에 알려 드려요.';
    }
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: [categoryKey],
      ...resolveInput,
    });
    const clocks = slots.map((s) => formatHhmmClockKo(s.hhmm)).join(', ');
    return clocks
      ? `루틴 시작 · ${clocks}에 알려 드려요.`
      : '루틴이 시작되는 시각에 알려 드려요.';
  }, [canResolve, categoryKey, resolveInput]);

  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';

  const onToggle = useCallback(
    async (next: boolean) => {
      if (busy) return;
      if (next && !canResolve) {
        Alert.alert(
          '시작 알림',
          '루틴 시작 시간이 아직 없어요. 나만의 루틴에서 타임라인 또는 시간대를 정해 주세요.',
        );
        return;
      }
      setBusy(true);
      try {
        const ok = await persistRoutineStartNotifyToggle(categoryKey, next);
        if (next && !ok) {
          setEnabled(false);
          Alert.alert('알림', '알림을 켜려면 기기에서 알림 권한을 허용해 주세요.');
          return;
        }
        setEnabled(next && ok);
        void Haptics.notificationAsync(
          next && ok
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, canResolve, categoryKey],
  );

  return (
    <View style={[styles.wrap, { borderColor: border }]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <ThemedText style={[styles.title, { color: ink }]}>시작 알림</ThemedText>
          <ThemedText style={[styles.hint, { color: muted }]}>{timeHint}</ThemedText>
        </View>
        <Switch
          accessibilityLabel={`시작 알림 ${enabled ? '켜짐' : '꺼짐'}`}
          value={enabled}
          disabled={busy}
          onValueChange={(next) => {
            void onToggle(next);
          }}
          trackColor={{ false: trackOff, true: '#000000' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={trackOff}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
});
