import { StyleSheet, Text, View } from 'react-native';

import {
  deriveReadingProgress,
  normalizeReadingMetricSelection,
  type ReadingLiveActivityConfig,
  type ReadingMetricKey,
} from '@entities/day-plan';
import { CategoryImmersionTheme } from '@shared/config/categoryImmersionTheme';
import { GoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { EditorialCategoryHeader, SessionEditorialShell } from './sessionCardShared';

const R = CategoryImmersionTheme.reading;

function formatPagesP(n: number) {
  return `${Math.max(0, Math.round(n))}p`;
}

function getMetricDisplay(
  key: ReadingMetricKey,
  cfg: ReadingLiveActivityConfig,
): { value: string; label: string; big: boolean } {
  const { progressPct } = deriveReadingProgress(cfg);
  switch (key) {
    case 'pages_read':
      return { value: formatPagesP(cfg.startPage), label: '시작 페이지', big: true };
    case 'pages_left':
      return { value: formatPagesP(cfg.targetPage), label: '목표 페이지', big: false };
    case 'focus_level':
      return { value: `${progressPct}%`, label: '집중도', big: true };
    default:
      return { value: '—', label: '', big: true };
  }
}

type Props = {
  title: string;
  dataConfig: ReadingLiveActivityConfig;
  remainingSec: number;
  progressPct: number;
  isPaused: boolean;
};

export function ReadingSessionCard({
  title,
  dataConfig,
  remainingSec: _remainingSec,
  progressPct,
  isPaused: _isPaused,
}: Props) {
  const selected = normalizeReadingMetricSelection(dataConfig.selectedMetrics);
  const titleText = title?.trim() || '딥 리딩';
  const { pagesRead: pagesToRead } = deriveReadingProgress(dataConfig);

  return (
    <SessionEditorialShell leftAccentColor={R.accent}>
      <EditorialCategoryHeader brand={R.brand} aboutKicker={R.aboutKicker} />
      <Text style={styles.flowTitle} numberOfLines={2}>
        {titleText}
      </Text>

      <View
        style={[
          styles.metricBar,
          { borderTopColor: '#000000', borderBottomColor: GoalDetailSessionUi.readingMetricBorder },
        ]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: R.onSurface }]}>{dataConfig.startPage}</Text>
          <Text style={[styles.metricLabel, { color: R.muted }]}>시작</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: R.onSurface }]}>{dataConfig.targetPage}</Text>
          <Text style={[styles.metricLabel, { color: R.muted }]}>목표</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: R.accent }]}>{pagesToRead}</Text>
          <Text style={[styles.metricLabel, { color: R.muted }]}>읽을 분량</Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <IconSymbol name="book.fill" size={18} color="#fff" weight="semibold" />
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.statusLine}>
        독서 세션
      </Text>

      {selected.length > 0 && (
        <View style={styles.metricRow}>
          {selected.map((key, i) => {
            const m = getMetricDisplay(key, dataConfig);
            return (
              <View key={`${key}-${i}`} style={styles.metricCol}>
                <Text style={m.big ? styles.valBig : styles.valSmall} numberOfLines={1}>
                  {m.value}
                </Text>
                <Text style={styles.metricLabelSmall} numberOfLines={1}>
                  {m.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.trackOuter}>
        <View
          style={[styles.trackFill, { width: `${Math.min(100, Math.max(0, progressPct))}%` }]}
        />
      </View>
    </SessionEditorialShell>
  );
}

const styles = StyleSheet.create({
  flowTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.35,
    color: R.onSurface,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginBottom: 16,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GoalDetailSessionUi.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { flex: 1 },
  statusLine: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: R.muted,
    textAlign: 'center',
  },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 16 },
  metricCol: { flex: 1, gap: 2 },
  valBig: { color: R.onSurface, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  valSmall: { color: R.onSurface, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  metricLabelSmall: { fontSize: 9, fontWeight: '700', color: R.muted },
  trackOuter: {
    marginTop: 16,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: R.accent,
  },
});
