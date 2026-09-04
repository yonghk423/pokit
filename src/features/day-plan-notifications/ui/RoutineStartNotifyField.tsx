import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  collectRoutineStartNotifySlots,
  formatMinutesToHHmm,
  hasResolvableRoutineStartTime,
  useDayPlanDraftStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import {
  isRoutineStartNotifyEnabled,
  persistRoutineStartNotifyToggle,
} from '../model/syncRoutineStartNotifications';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { formatHhmmClock, t, useTranslation } from '@shared/lib/i18n';
import { loadDayMealSlotSchedule } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

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

/** 목표 상세 — 루틴 시작 알림 on/off */
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
    if (!canResolve) {
      return tr('routineNotify.needMyRoutineTime');
    }
    const stored = findStoredSpineStartHhmm(sets, categoryKey);
    const slots = collectRoutineStartNotifySlots({
      enabledCategoryKeys: [categoryKey],
      ...resolveInput,
    });
    const clocks = slots.map((s) => formatHhmmClock(s.hhmm, locale)).join(', ');
    if (clocks) {
      return enabled
        ? tr('routineNotify.withClocksOn', { clocks })
        : tr('routineNotify.withClocksOff', { clocks });
    }
    if (stored) {
      return enabled
        ? tr('routineNotify.bagWithAlarm', { clock: formatHhmmClock(stored, locale) })
        : tr('routineNotify.bagWithoutAlarm', { clock: formatHhmmClock(stored, locale) });
    }
    return enabled ? tr('routineNotify.genericOn') : tr('routineNotify.genericOff');
  }, [canResolve, categoryKey, enabled, locale, resolveInput, sets, tr]);

  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';

  const onToggle = useCallback(
    async (next: boolean) => {
      if (busy) return;
      if (next && !canResolve) {
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
    [busy, canResolve, categoryKey, tr],
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
});
