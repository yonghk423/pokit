import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { horizonDocumentHasContent, type HorizonGoalDocument } from '@shared/lib/storage/horizonGoalBlocks';
import type { HorizonCompletionEntry } from '@shared/lib/storage/horizonCompletionsStorage';
import { HorizonDocumentReadView } from '@shared/ui/horizon-document-read-view';
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
  isDark: boolean;
  resolveDocument?: (entry: HorizonCompletionEntry) => HorizonGoalDocument;
  resolveActivityLines?: (entry: HorizonCompletionEntry) => string[];
};

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일 완료`;
}

type RowProps = {
  row: HorizonCompletionEntry;
  tone: Tone;
  isDark: boolean;
  isFirst: boolean;
  expanded: boolean;
  onToggle: () => void;
  document: HorizonGoalDocument;
  activityLines: string[];
};

function CompletionAccordionRow({
  row,
  tone,
  isDark,
  isFirst,
  expanded,
  onToggle,
  document,
  activityLines,
}: RowProps) {
  const hasDocument = horizonDocumentHasContent(document);
  const hasActivity = activityLines.length > 0;
  const hasSummary = Boolean(row.summaryText?.trim());

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

          {hasDocument ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel} lightColor={tone.muted} darkColor={tone.muted}>
                스토리 기록
              </ThemedText>
              <HorizonDocumentReadView
                document={document}
                ink={tone.ink}
                muted={tone.muted}
                isDark={isDark}
              />
            </View>
          ) : null}

          {hasActivity ? (
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel} lightColor={tone.muted} darkColor={tone.muted}>
                데일리 활동
              </ThemedText>
              <View style={styles.activityList}>
                {activityLines.map((line) => (
                  <ThemedText
                    key={`${row.periodKey}-${line}`}
                    style={styles.activityLine}
                    lightColor={tone.ink}
                    darkColor={tone.ink}>
                    {line}
                  </ThemedText>
                ))}
              </View>
            </View>
          ) : null}

          {!hasDocument && !hasActivity ? (
            hasSummary ? (
              <ThemedText style={styles.rowSummary} lightColor={tone.ink} darkColor={tone.ink}>
                {row.summaryText?.trim()}
              </ThemedText>
            ) : (
              <ThemedText style={styles.rowSummaryMissing} lightColor={tone.muted} darkColor={tone.muted}>
                이 기간에 남은 기록이 없어요.
              </ThemedText>
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function StatisticsCompletionList({
  title,
  emptyHint,
  entries,
  tone,
  isDark,
  resolveDocument,
  resolveActivityLines,
}: Props) {
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
            isDark={isDark}
            isFirst={index === 0}
            expanded={expandedKeys.has(row.periodKey)}
            onToggle={() => toggleKey(row.periodKey)}
            document={resolveDocument?.(row) ?? { version: 2, blocks: [] }}
            activityLines={resolveActivityLines?.(row) ?? []}
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
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
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
  activityList: {
    gap: 4,
  },
  activityLine: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    letterSpacing: -0.1,
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
