import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import { formatDateKeyDisplayKo } from '../../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  dateKey: string;
  weekdayLabel: string;
  text: string;
  onChangeText: (value: string) => void;
  syncLabel?: string;
};

export function HorizonWeekDayMemoCard({
  c,
  isDark,
  dateKey,
  weekdayLabel,
  text,
  onChangeText,
  syncLabel,
}: Props) {
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const header = `${formatDateKeyDisplayKo(dateKey)} · ${weekdayLabel}`;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.headerRow}>
        <ThemedText style={[styles.eyebrow, { color: c.onVariant }]}>날짜 메모</ThemedText>
        {syncLabel ? (
          <ThemedText style={[styles.sync, { color: c.outline }]}>{syncLabel}</ThemedText>
        ) : null}
      </View>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>{header}</ThemedText>
      <TextInput
        key={dateKey}
        value={text}
        onChangeText={onChangeText}
        placeholder="이 날짜에 적어 둘 메모"
        placeholderTextColor={c.outline}
        multiline
        scrollEnabled={false}
        textAlignVertical="top"
        maxLength={500}
        style={[
          styles.input,
          {
            color: c.onSurface,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sync: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  input: {
    minHeight: 72,
    maxHeight: 140,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
