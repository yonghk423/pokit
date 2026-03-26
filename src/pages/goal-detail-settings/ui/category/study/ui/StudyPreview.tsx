import { StyleSheet, Text, View } from 'react-native';

import {
  deriveReadingProgress,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  type ReadingLiveActivityConfig,
  type ReadingMetricKey,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

/**
 * 잠금화면 Live Activity 실기/시뮬 색감에 맞춤 (반투명 카드가 아니라 검정 바 + iOS 보조 라벨 톤).
 */
const CARD_FILL = '#000000';
/** iOS secondary label — 활성 리듬, 지표 라벨, 타이머 */
const IOS_SECONDARY_LABEL = '#8E8E93';
/** 트랙·아이콘 배경·일시정지 버튼 슬롯 */
const IOS_TERTIARY_FILL = '#3A3A3C';
/** Swift `Color.orange` / 시스템 오렌지 */
const IOS_SYSTEM_ORANGE = '#FF9500';
const CARD_RADIUS = 16;
const CARD_PAD_H = 12;
const CARD_PAD_V = 11;
const INNER_GAP = 8;
const ICON_BOX = 30;
const ICON_RADIUS = 9;
const ICON_INNER = 14;
const KICKER_SIZE = 9;
const TITLE_SIZE = 15;
const TIMER_SIZE = 17;
const METRIC_GAP = 10;
const METRIC_LABEL_GAP = 2;
const VALUE_BIG = 26;
const VALUE_SMALL = 22;
const LABEL_SIZE = 9;
const PROGRESS_H = 6;
const BTN_RADIUS = 8;
const BTN_GAP = 8;
const BTN_VPAD = 7;
const BTN_FONT = 12;
const PAUSE_BG = IOS_TERTIARY_FILL;

function formatPagesP(n: number) {
  const x = Math.max(0, Math.round(n));
  return `${x}p`;
}

function getMetricText(
  key: ReadingMetricKey,
  cfg: ReadingLiveActivityConfig,
): { value: string; label: string; valueSize: 'big' | 'small' } {
  const { progressPct } = deriveReadingProgress(cfg);
  const start = Math.max(0, cfg.startPage);
  const target = Math.max(0, cfg.targetPage);
  switch (key) {
    case 'pages_read':
      return { value: formatPagesP(start), label: '시작 페이지', valueSize: 'big' };
    case 'pages_left':
      return { value: formatPagesP(target), label: '목표 페이지', valueSize: 'small' };
    case 'focus_level':
      return { value: `${progressPct}%`, label: '집중도', valueSize: 'big' };
    default:
      return { value: '—', label: '', valueSize: 'big' };
  }
}

export function StudyPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const cfg = normalizeReadingLiveActivityConfig(dataConfig);
  const selected = normalizeReadingMetricSelection(cfg.selectedMetrics);
  const { progressPct } = deriveReadingProgress(cfg);

  const titleText = rhythmTitle?.trim() || '딥 리딩';

  const metricRow =
    selected.length > 0 ? (
      <View style={styles.metricRow}>
        {selected.map((key, index) => {
          const m = getMetricText(key, cfg);
          return (
            <View key={`${key}-${index}`} style={styles.metricCol}>
              <Text
                style={[m.valueSize === 'big' ? styles.metricValueBig : styles.metricValueSmall]}
                numberOfLines={1}>
                {m.value}
              </Text>
              <Text style={styles.metricLabel} numberOfLines={1}>
                {m.label}
              </Text>
            </View>
          );
        })}
      </View>
    ) : null;

  return (
    <View style={styles.previewWrap}>
      <View style={styles.laCard}>
        <View style={styles.laInner}>
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <IconSymbol name="book.fill" size={ICON_INNER} color="#fff" weight="semibold" />
            </View>
            <View style={styles.headerTitles}>
              <Text style={styles.kicker}>활성 리듬</Text>
              <Text style={styles.title} numberOfLines={1}>
                {titleText}
              </Text>
            </View>
            <Text style={styles.timer} selectable={false}>
              --:--
            </Text>
          </View>

          {metricRow}

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          <View style={styles.actions}>
            <View style={[styles.actionBtn, styles.actionPause]}>
              <Text style={styles.actionPauseText}>일시정지</Text>
            </View>
            <View style={[styles.actionBtn, styles.actionDone]}>
              <Text style={styles.actionDoneText}>완료</Text>
            </View>
          </View>
        </View>
      </View>

      <ThemedText
        style={styles.caption}
        lightColor="#52525b"
        darkColor="rgba(255,255,255,0.45)">
        잠금화면과 동일한 Live Activity 스타일
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { gap: 10 },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  laCard: {
    width: '100%',
    borderRadius: CARD_RADIUS,
    backgroundColor: CARD_FILL,
    overflow: 'hidden',
  },
  laInner: {
    paddingHorizontal: CARD_PAD_H,
    paddingVertical: CARD_PAD_V,
    gap: INNER_GAP,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: ICON_RADIUS,
    backgroundColor: IOS_TERTIARY_FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { flex: 1, minWidth: 0, gap: 1 },
  kicker: { fontSize: KICKER_SIZE, fontWeight: '700', color: IOS_SECONDARY_LABEL },
  title: { color: '#fff', fontSize: TITLE_SIZE, fontWeight: '800', letterSpacing: -0.2 },
  timer: {
    color: IOS_SECONDARY_LABEL,
    fontSize: TIMER_SIZE,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: METRIC_GAP,
  },
  metricCol: { flex: 1, gap: METRIC_LABEL_GAP },
  metricValueBig: {
    color: '#fff',
    fontSize: VALUE_BIG,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricValueSmall: {
    color: '#fff',
    fontSize: VALUE_SMALL,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  metricLabel: { fontSize: LABEL_SIZE, fontWeight: '700', color: IOS_SECONDARY_LABEL },
  progressTrack: {
    height: PROGRESS_H,
    borderRadius: 999,
    backgroundColor: IOS_TERTIARY_FILL,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  actions: { flexDirection: 'row', gap: BTN_GAP },
  actionBtn: {
    flex: 1,
    borderRadius: BTN_RADIUS,
    paddingVertical: BTN_VPAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPause: { backgroundColor: PAUSE_BG },
  actionPauseText: { color: '#fff', fontSize: BTN_FONT, fontWeight: '600' },
  actionDone: { backgroundColor: IOS_SYSTEM_ORANGE },
  actionDoneText: { color: '#fff', fontSize: BTN_FONT, fontWeight: '600' },
});
