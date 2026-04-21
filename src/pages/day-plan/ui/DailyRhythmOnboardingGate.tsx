import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { defaultPriorityWindowFromNow } from '../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { DailyRhythmTimeEditorBody } from './DailyRhythmTimeEditorBody';

type Props = {
  visible: boolean;
  isDark: boolean;
  c: DayPlanPalette;
  onConfirm: (startHhmm: string, endHhmm: string) => void;
  onSkip: () => void;
};

export function DailyRhythmOnboardingGate({ visible, isDark, c, onConfirm, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const safeTop =
    insets.top > 8
      ? insets.top
      : Platform.OS === 'ios'
        ? 54
        : Math.max(Number(StatusBar.currentHeight) || 0, 24);
  const [seedKey, setSeedKey] = useState(0);
  const seed = useMemo(() => defaultPriorityWindowFromNow(), [seedKey]);

  useEffect(() => {
    if (!visible) return;
    setSeedKey((k) => k + 1);
  }, [visible]);

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
          seedStart={seed.startTime}
          seedEnd={seed.endTime}
          seedKey={seedKey}
          variant="onboarding"
          primaryLabel="이대로 시작하기"
          onPrimaryPress={onConfirm}
          secondaryLabel="건너뛰기 · 지금 기본값 유지"
          onSecondaryPress={onSkip}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
