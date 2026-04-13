import { StyleSheet, Text, View } from 'react-native';

import {
  deriveReadingProgress,
  normalizeReadingMetricSelection,
  type ReadingLiveActivityConfig,
  type ReadingMetricKey,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';

import { ORANGE, SessionDarkShell } from './sessionCardShared';

const IOS_SECONDARY = '#8E8E93';
const IOS_TERTIARY = '#3A3A3C';

function formatPagesP(n: number) {
  return `${Math.max(0, Math.round(n))}p`;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
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
  remainingSec,
  progressPct,
  isPaused,
}: Props) {
  const selected = normalizeReadingMetricSelection(dataConfig.selectedMetrics);
  const titleText = title?.trim() || '딥 리딩';

  return (
    <SessionDarkShell>
      <View style={styles.inner}>
        <Text style={styles.heroKicker}>{isPaused ? '일시정지' : '독서 세션'}</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {titleText}
        </Text>

        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <IconSymbol name="book.fill" size={16} color="#fff" weight="semibold" />
          </View>
          <View style={styles.headerSpacer} />
          <Text style={styles.timerHero}>{formatClock(remainingSec)}</Text>
        </View>

        {selected.length > 0 && (
          <View style={styles.metricRow}>
            {selected.map((key, i) => {
              const m = getMetricDisplay(key, dataConfig);
              return (
                <View key={`${key}-${i}`} style={styles.metricCol}>
                  <Text style={m.big ? styles.valBig : styles.valSmall} numberOfLines={1}>
                    {m.value}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={1}>
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
      </View>
    </SessionDarkShell>
  );
}

const styles = StyleSheet.create({
  inner: {
    gap: 14,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: IOS_TERTIARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { flex: 1 },
  timerHero: {
    color: IOS_SECONDARY,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  metricCol: { flex: 1, gap: 2 },
  valBig: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  valSmall: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: IOS_SECONDARY },
  trackOuter: {
    height: 6,
    borderRadius: 999,
    backgroundColor: IOS_TERTIARY,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
});
