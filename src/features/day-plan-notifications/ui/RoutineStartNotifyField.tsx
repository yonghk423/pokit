import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  collectRoutineStartNotifySlots,
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
import { formatHhmmClock, t, useTranslation } from '@shared/lib/i18n';
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
  const { t: tr, locale } = useTranslation();
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
          ? tr('routineNotify.bagWithAlarm', { clock: formatHhmmClock(stored, locale) })
          : tr('routineNotify.bagWithoutAlarm', { clock: formatHhmmClock(stored, locale) })
        : tr('routineNotify.bagPickTime');
    }
    if (!canResolve) {
      return tr('routineNotify.needMyRoutineTime');
    }
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: [categoryKey],
      ...resolveInput,
    });
    const clocks = slots.map((s) => formatHhmmClock(s.hhmm, locale)).join(', ');
    return clocks
      ? enabled
        ? tr('routineNotify.withClocksOn', { clocks })
        : tr('routineNotify.withClocksOff', { clocks })
      : enabled
        ? tr('routineNotify.genericOn')
        : tr('routineNotify.genericOff');
  }, [canResolve, categoryKey, enabled, isBagLayout, locale, resolveInput, sets, tr]);

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
          Alert.alert(t('alert.startTime.title'), t('alert.startTime.saveFailed'));
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
            Alert.alert(t('alert.startNotify.title'), t('alert.startNotify.needStartTime'));
            setTimeExpanded(true);
            return;
          }
        }
      } else if (next && !canResolve) {
        Alert.alert(tr('routineNotify.title'), tr('routineNotify.missingTime'));
        return;
      }
      setBusy(true);
      try {
        const ok = await persistRoutineStartNotifyToggle(categoryKey, next);
        if (next && !ok) {
          setEnabled(false);
          Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
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
          <ThemedText style={[styles.title, { color: ink }]}>{tr('routineNotify.title')}</ThemedText>
          <ThemedText style={[styles.hint, { color: muted }]}>{timeHint}</ThemedText>
        </View>
        <Switch
          accessibilityLabel={tr('routineNotify.toggleA11y', {
            state: enabled ? tr('routineNotify.toggleOn') : tr('routineNotify.toggleOff'),
          })}
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
            label={tr('routineNotify.startTimeLabel')}
            hint={tr('routineNotify.startTimeHint')}
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
