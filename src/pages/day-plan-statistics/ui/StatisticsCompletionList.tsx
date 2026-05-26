import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HorizonCompletionEntry } from '@shared/lib/storage/horizonCompletionsStorage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Tone = {
  card: string;
  border: string;
  muted: string;
  ink: string;
};

type Props = {
  title: string;
  emptyHint: string;
  entries: HorizonCompletionEntry[];
  tone: Tone;
};

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일 완료`;
}

type RowProps = {
  row: HorizonCompletionEntry;
  tone: Tone;
  isFirst: boolean;
  expanded: boolean;
  onToggle: () => void;
};

function CompletionAccordionRow({ row, tone, isFirst, expanded, onToggle }: RowProps) {
  return (
    <View
      style={[
        styles.row,
        !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tone.border },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.label}, ${expanded ? '접기' : '펼치기'}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.85 }]}>
        <ThemedText style={[styles.rowLabel, { color: tone.ink }]}>{row.label}</ThemedText>
        <IconSymbol
          name={expanded ? 'chevron.up' : 'chevron.down'}
          size={16}
          color={tone.muted}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.body, { borderTopColor: tone.border }]}>
          <ThemedText style={styles.rowMeta} lightColor={tone.muted} darkColor={tone.muted}>
            {formatCompletedAt(row.completedAt)}
          </ThemedText>
          {row.summaryText?.trim() ? (
            <ThemedText style={styles.rowSummary} lightColor={tone.ink} darkColor={tone.ink}>
              {row.summaryText.trim()}
            </ThemedText>
          ) : (
            <ThemedText style={styles.rowSummaryMissing} lightColor={tone.muted} darkColor={tone.muted}>
              완료 당시 본문이 저장되지 않았어요.
            </ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function StatisticsCompletionList({ title, emptyHint, entries, tone }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  const toggleKey = useCallback((periodKey: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(periodKey)) {
        next.delete(periodKey);
      } else {
        next.add(periodKey);
      }
      return next;
    });
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {entries.length === 0 ? (
        <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
          {emptyHint}
        </ThemedText>
      ) : (
        entries.map((row, index) => (
          <CompletionAccordionRow
            key={row.periodKey}
            row={row}
            tone={tone}
            isFirst={index === 0}
            expanded={expandedKeys.has(row.periodKey)}
            onToggle={() => toggleKey(row.periodKey)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  emptyNote: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  row: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  body: {
    paddingBottom: 14,
    paddingTop: 4,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowSummary: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  rowSummaryMissing: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
});
