import { StyleSheet, Text, View } from 'react-native';

import type { LockFlowLiveActivityChecklistRow } from '@features/live-activity-sync';
import { CategoryImmersionTheme } from '@shared/config/categoryImmersionTheme';
import { IconSymbol } from '@shared/ui/icon-symbol';

const E = CategoryImmersionTheme.editorial;
const ON = E.onDark;
const MUTED = E.meta;
const BORDER = E.glassBorder;
const PRIMARY = CategoryImmersionTheme.work.accent;

type Props = {
  checklistTitle: string;
  checklistCountLabel: string;
  checklistRows: LockFlowLiveActivityChecklistRow[];
  checklistSummaryLine1: string;
  checklistSummaryLine2: string;
};

function stateMeta(state: LockFlowLiveActivityChecklistRow['state']) {
  switch (state) {
    case 'completed':
      return { color: MUTED };
    case 'current':
      return { color: PRIMARY };
    case 'skipped':
      return { color: 'rgba(0,0,0,0.35)' };
    default:
      return { color: MUTED };
  }
}

export function ChecklistSessionCard({
  checklistTitle,
  checklistCountLabel,
  checklistRows,
  checklistSummaryLine1,
  checklistSummaryLine2,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.dot} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {checklistTitle}
            </Text>
          </View>
          <Text style={styles.headerCount}>{checklistCountLabel}</Text>
        </View>

        <View style={styles.rows}>
          {checklistRows.map((row) => {
            const isCurrent = row.state === 'current';
            const isDone = row.state === 'completed';
            const isSkip = row.state === 'skipped';
            const meta = stateMeta(row.state);

            return (
              <View
                key={row.blockId}
                style={[styles.row, isCurrent && styles.currentRow]}>
                <View style={styles.rowLeft}>
                  {isDone ? (
                    <View style={styles.doneIcon}>
                      <IconSymbol name="checkmark.circle.fill" size={22} color={PRIMARY} />
                    </View>
                  ) : isCurrent ? (
                    <View style={styles.currentIcon}>
                      <View style={styles.currentDot} />
                    </View>
                  ) : isSkip ? (
                    <View style={styles.pendingIcon}>
                      <IconSymbol name="minus.circle" size={22} color="rgba(0,0,0,0.22)" />
                    </View>
                  ) : (
                    <View style={styles.pendingIcon}>
                      <View style={styles.pendingDot} />
                    </View>
                  )}
                  <View style={styles.textCol}>
                    <Text
                      style={[
                        styles.rowTitle,
                        isDone && styles.doneTitle,
                        isCurrent && styles.activeTitle,
                        isSkip && styles.skipTitle,
                      ]}
                      numberOfLines={1}>
                      {row.title}
                    </Text>
                    <View style={styles.metaLine}>
                      {isCurrent && <IconSymbol name="clock" size={10} color={PRIMARY} />}
                      <Text style={[styles.metaText, { color: meta.color }]}>{row.timeLabel}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.chevron, isCurrent && { color: PRIMARY }]}>
                  {isCurrent ? '▶' : '›'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>{checklistSummaryLine1}</Text>
          <Text style={styles.summaryText}>{checklistSummaryLine2}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: E.glassBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  inner: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  headerTitle: {
    flex: 1,
    color: ON,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerCount: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  rows: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginHorizontal: -4,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  doneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  pendingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  rowTitle: {
    color: ON,
    fontSize: 15,
    fontWeight: '600',
  },
  doneTitle: {
    color: MUTED,
    textDecorationLine: 'line-through',
  },
  activeTitle: {
    color: ON,
    fontWeight: '700',
  },
  skipTitle: {
    color: 'rgba(0,0,0,0.35)',
  },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '700' },
  chevron: { color: 'rgba(0,0,0,0.15)', fontSize: 18, fontWeight: '700' },
  summaryBox: {
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    gap: 2,
  },
  summaryText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
});
