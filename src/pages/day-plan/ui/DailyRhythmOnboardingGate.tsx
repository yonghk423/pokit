import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan';

import { DEFAULT_DAILY_RHYTHM } from '../lib/dailyRhythmPresets';
import { formatDateKeyCompactKo } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { DailyRhythmTimeEditorBody } from './DailyRhythmTimeEditorBody';

type Props = {
  visible: boolean;
  isDark: boolean;
  c: DayPlanPalette;
  onConfirm: (startHhmm: string, endHhmm: string) => void;
  onEndDateChoice?: (startHhmm: string, endHhmm: string, target: 'today' | 'nextDay') => void;
};

export function DailyRhythmOnboardingGate({
  visible,
  isDark,
  c,
  onConfirm,
  onEndDateChoice,
}: Props) {
  const insets = useSafeAreaInsets();
  const safeTop =
    insets.top > 8
      ? insets.top
      : Platform.OS === 'ios'
        ? 54
        : Math.max(Number(StatusBar.currentHeight) || 0, 24);
  const [seedKey, setSeedKey] = useState(0);
  const todayKey = useMemo(() => getLocalDateKey(), [seedKey]);
  const todayChoiceLabel = useMemo(
    () => `당일 · ${formatDateKeyCompactKo(todayKey)}`,
    [todayKey],
  );
  const nextDayChoiceLabel = useMemo(
    () => `다음 날 · ${formatDateKeyCompactKo(addDaysToLocalDateKey(todayKey, 1))}`,
    [todayKey],
  );

  useEffect(() => {
    if (!visible) return;
    setSeedKey((k) => k + 1);
  }, [visible]);

  const handleEndDateChoice = useCallback(
    (start: string, end: string, target: 'today' | 'nextDay') => {
      onEndDateChoice?.(start, end, target);
    },
    [onEndDateChoice],
  );

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View
        style={[
          styles.safe,
          {
            backgroundColor: c.bg,
            paddingTop: Math.max(safeTop, 12),
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}>
        <DailyRhythmTimeEditorBody
          c={c}
          isDark={isDark}
          seedStart={DEFAULT_DAILY_RHYTHM.start}
          seedEnd={DEFAULT_DAILY_RHYTHM.end}
          seedKey={seedKey}
          variant="onboarding"
          primaryLabel="시작하기"
          onPrimaryPress={onConfirm}
          onEndDateChoice={handleEndDateChoice}
          endDateChoiceTodayLabel={todayChoiceLabel}
          endDateChoiceNextDayLabel={nextDayChoiceLabel}
          priorityPlanRangeLo={todayKey}
          priorityPlanRangeHi={todayKey}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
