import { Pressable, StyleSheet, View } from 'react-native';

import { formatHhmmClockKo } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { isOvernightHhmmRange } from '../lib/dayPlanEditorShared';

type Props = {
  priorityStart: string;
  priorityEnd: string;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  onPressSettings: () => void;
};

function formatPriorityWindowSummary(start: string, end: string): string {
  const overnight = isOvernightHhmmRange(start, end);
  const startLabel = formatHhmmClockKo(start);
  const endLabel = formatHhmmClockKo(end);
  if (overnight) {
    return `${startLabel} — 다음날 ${endLabel}`;
  }
  return `${startLabel} — ${endLabel}`;
}

/** 고정 루틴 타임라인 — 집중 구간 요약 + 설정 진입 */
export function FixedRoutinePriorityWindowCard({
  priorityStart,
  priorityEnd,
  isDark,
  ink,
  muted,
  line,
  cardBg,
  onPressSettings,
}: Props) {
  return (
    <View style={[styles.root, { backgroundColor: cardBg, borderColor: line }]}>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>타임라인 집중 구간</ThemedText>
        <ThemedText style={[styles.summary, { color: muted }]} numberOfLines={2}>
          {formatPriorityWindowSummary(priorityStart, priorityEnd)}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="집중 구간 설정"
        onPress={onPressSettings}
        style={({ pressed }) => [
          styles.settingsBtn,
          {
            borderColor: line,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          },
          pressed && { opacity: 0.72 },
        ]}>
        <IconSymbol name="clock" size={14} color={ink} />
        <ThemedText style={[styles.settingsBtnLabel, { color: ink }]}>설정</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2,
    flexShrink: 0,
  },
  settingsBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
