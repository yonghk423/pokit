import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  visible: boolean;
  isDark: boolean;
  selectedMonthPrefix: string;
  todayDateKey: string;
  minYear: number;
  sheetBg: string;
  ink: string;
  muted: string;
  border: string;
  onClose: () => void;
  onSelectMonth: (year: number, month: number) => void;
};

export function HistoryMonthPickerOverlay({
  visible,
  isDark,
  selectedMonthPrefix,
  todayDateKey,
  minYear,
  sheetBg,
  ink,
  muted,
  border,
  onClose,
  onSelectMonth,
}: Props) {
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(() => Number(selectedMonthPrefix.slice(0, 4)) || new Date().getFullYear());

  useEffect(() => {
    if (visible) {
      setYear(Number(selectedMonthPrefix.slice(0, 4)) || new Date().getFullYear());
    }
  }, [selectedMonthPrefix, visible]);

  const currentYear = Number(todayDateKey.slice(0, 4));
  const currentMonth = Number(todayDateKey.slice(5, 7));
  const selectedMonth = Number(selectedMonthPrefix.slice(5, 7));
  const canGoPrevYear = year > minYear;
  const canGoNextYear = year < currentYear;

  const months = useMemo(() => Array.from({ length: 12 }, (_, idx) => idx + 1), []);

  const onMonthPress = useCallback(
    (month: number) => {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      if (prefix > todayDateKey.slice(0, 7)) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectMonth(year, month);
      onClose();
    },
    [onClose, onSelectMonth, todayDateKey, year],
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable style={styles.dim} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}>
          <View style={[styles.grabber, { backgroundColor: border }]} />
          <ThemedText style={styles.title}>월 선택</ThemedText>

          <View style={styles.yearRow}>
            <Pressable
              disabled={!canGoPrevYear}
              onPress={() => canGoPrevYear && setYear((y) => y - 1)}
              style={({ pressed }) => [styles.yearBtn, pressed && canGoPrevYear && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="이전 해">
              <IconSymbol name="chevron.left" size={18} color={canGoPrevYear ? ink : muted} />
            </Pressable>
            <ThemedText style={styles.yearLabel}>{year}년</ThemedText>
            <Pressable
              disabled={!canGoNextYear}
              onPress={() => canGoNextYear && setYear((y) => y + 1)}
              style={({ pressed }) => [styles.yearBtn, pressed && canGoNextYear && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="다음 해">
              <IconSymbol name="chevron.right" size={18} color={canGoNextYear ? ink : muted} />
            </Pressable>
          </View>

          <View style={styles.monthGrid}>
            {months.map((month) => {
              const prefix = `${year}-${String(month).padStart(2, '0')}`;
              const disabled = prefix > todayDateKey.slice(0, 7);
              const active = year === Number(selectedMonthPrefix.slice(0, 4)) && month === selectedMonth;
              const isCurrent = year === currentYear && month === currentMonth;
              return (
                <Pressable
                  key={`${year}-${month}`}
                  disabled={disabled}
                  onPress={() => onMonthPress(month)}
                  style={[
                    styles.monthBtn,
                    { borderColor: border },
                    active && { backgroundColor: isDark ? '#fafafa' : '#18181b', borderColor: isDark ? '#fafafa' : '#18181b' },
                    disabled && { opacity: 0.35 },
                  ]}>
                  <ThemedText
                    style={styles.monthLabel}
                    lightColor={active ? '#ffffff' : ink}
                    darkColor={active ? '#18181b' : ink}>
                    {month}월
                  </ThemedText>
                  {isCurrent && !active ? (
                    <ThemedText style={styles.currentDot} lightColor={muted} darkColor={muted}>
                      ·
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  yearBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    minWidth: 96,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  monthBtn: {
    width: '30%',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  currentDot: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 14,
  },
});
