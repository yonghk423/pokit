import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  collectRoutineStartNotifySlots,
  formatHhmmClockKo,
  formatMinutesToHHmm,
  hasResolvableRoutineStartTime,
  parseHHmmToMinutes,
  useDayPlanDraftStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import {
  isRoutineStartNotifyEnabled,
  persistRoutineStartNotifyToggle,
  syncRoutineStartNotifications,
} from '../model/syncRoutineStartNotifications';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { loadDayMealSlotSchedule } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

type Props = {
  categoryKey: string;
  ink: string;
  muted: string;
  border: string;
  isDark?: boolean;
};

function findStoredSpineStartHhmm(
  sets: ReturnType<typeof useFixedFlowSetsStore.getState>['sets'],
  categoryKey: string,
): string | null {
  for (const set of sets) {
    for (const item of set.items) {
      if (item.categoryKey !== categoryKey) continue;
      if (typeof item.spineStartMinutes !== 'number') continue;
      if (item.spineStartMinutes < 0 || item.spineStartMinutes >= 24 * 60) continue;
      return formatMinutesToHHmm(item.spineStartMinutes);
    }
  }
  return null;
}

function defaultStartHhmm(): string {
  const draft = useDayPlanDraftStore.getState();
  return draft.priorityStart?.trim() || '09:00';
}

/** 목표 상세 — 루틴 시작 시각에 맞춘 알림 on/off (+ 목록 모드 시작 시각) */
export function RoutineStartNotifyField({
  categoryKey,
  ink,
  muted,
  border,
  isDark: isDarkProp,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = isDarkProp ?? colorScheme === 'dark';
  const layoutMode = useFixedFlowSetsStore((s) => s.fixedRoutineApplyLayoutMode);
  const sets = useFixedFlowSetsStore((s) => s.sets);
  const activeSetIds = useFixedFlowSetsStore((s) => s.activeSetIds);
  const ensureCategorySpineScheduleInAnySet = useFixedFlowSetsStore(
    (s) => s.ensureCategorySpineScheduleInAnySet,
  );
  const planBlocks = useDayPlanStore((s) => s.blocks);
  const { priorityMealSlotOverrides, prioritySectionsMealSlots, priorityStart } =
    useDayPlanDraftStore(
      useShallow((s) => ({
        priorityMealSlotOverrides: s.priorityMealSlotOverrides,
        prioritySectionsMealSlots: s.prioritySectionsMealSlots,
        priorityStart: s.priorityStart,
      })),
    );

  /** 목록 모드면 시작 시각 UI를 항상 노출 */
  const isBagLayout = layoutMode === 'bag';

  const [enabled, setEnabled] = useState(() => isRoutineStartNotifyEnabled(categoryKey));
  const [busy, setBusy] = useState(false);
  const [startHhmm, setStartHhmm] = useState(
    () => findStoredSpineStartHhmm(sets, categoryKey) ?? defaultStartHhmm(),
  );
  const [timeExpanded, setTimeExpanded] = useState(false);
  const timePalette = useMemo(() => paletteForReminderTimeCard(isDark).timeField, [isDark]);

  useFocusEffect(
    useCallback(() => {
      setEnabled(isRoutineStartNotifyEnabled(categoryKey));
      setStartHhmm(
        findStoredSpineStartHhmm(sets, categoryKey) ?? (priorityStart?.trim() || '09:00'),
      );
    }, [categoryKey, priorityStart, sets]),
  );

  const resolveInput = useMemo(() => {
    return {
      categoryKey,
      sets,
      activeSetIds,
      includeInactiveSets: false,
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
    if (isBagLayout) {
      const stored = findStoredSpineStartHhmm(sets, categoryKey);
      return stored
        ? enabled
          ? `목록 모드 · ${formatHhmmClockKo(stored)}에 시작 · 알림도 이 시각에 울려요.`
          : `목록 모드 · ${formatHhmmClockKo(stored)}에 시작 · 알림을 켜면 이 시각에 울려요.`
        : '목록 모드에서는 아래에서 시작 시간을 직접 정해 주세요.';
    }
    if (!canResolve) {
      return '나만의 루틴에서 시작 시간(타임라인·시간대)을 정하면 그 시각에 알려 드려요.';
    }
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: [categoryKey],
      ...resolveInput,
    });
    const clocks = slots.map((s) => formatHhmmClockKo(s.hhmm)).join(', ');
    return clocks
      ? enabled
        ? `루틴 시작 · ${clocks}에 알려 드려요.`
        : `알림을 켜면 ${clocks}에 알려 드려요.`
      : enabled
        ? '루틴이 시작되는 시각에 알려 드려요.'
        : '알림을 켜면 루틴이 시작되는 시각에 알려 드려요.';
  }, [canResolve, categoryKey, enabled, isBagLayout, resolveInput, sets]);

  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';

  const persistBagStartTime = useCallback(
    async (hhmm: string) => {
      const start = parseHHmmToMinutes(hhmm);
      if (start === null || start >= 24 * 60) return false;
      const end = Math.min(24 * 60, start + 30);
      if (end <= start) return false;
      const ok = ensureCategorySpineScheduleInAnySet(categoryKey, start, end, false);
      if (!ok) return false;
      await syncRoutineStartNotifications();
      return true;
    },
    [categoryKey, ensureCategorySpineScheduleInAnySet],
  );

  const onChangeStartHhmm = useCallback(
    async (next: string) => {
      setStartHhmm(next);
      if (!isBagLayout || busy) return;
      setBusy(true);
      try {
        const ok = await persistBagStartTime(next);
        if (!ok) {
          Alert.alert('시작 시간', '시작 시간을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
          return;
        }
        void Haptics.selectionAsync();
      } finally {
        setBusy(false);
      }
    },
    [busy, isBagLayout, persistBagStartTime],
  );

  const onToggle = useCallback(
    async (next: boolean) => {
      if (busy) return;
      if (next && isBagLayout) {
        const stored = findStoredSpineStartHhmm(
          useFixedFlowSetsStore.getState().sets,
          categoryKey,
        );
        if (!stored) {
          const saved = await persistBagStartTime(startHhmm);
          if (!saved) {
            Alert.alert('시작 알림', '시작 시간을 먼저 정해 주세요.');
            setTimeExpanded(true);
            return;
          }
        }
      } else if (next && !canResolve) {
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
    [busy, canResolve, categoryKey, isBagLayout, persistBagStartTime, startHhmm],
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
      {isBagLayout ? (
        <View style={styles.pickerWrap}>
          <SnappedTimePickerField
            label="시작 시각"
            hint="목록 모드에서 이 루틴이 시작하는 시각이에요."
            valueHhmm={startHhmm}
            onChangeHhmm={(next) => {
              void onChangeStartHhmm(next);
            }}
            expanded={timeExpanded}
            onToggleExpand={() => setTimeExpanded((v) => !v)}
            isDark={isDark}
            palette={timePalette}
            snapStepMinutes={1}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 4,
    gap: 8,
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
  pickerWrap: {
    marginTop: 2,
  },
});
