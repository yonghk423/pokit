import type { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const CARD_FILL = '#000000';
const IOS_SECONDARY_LABEL = '#8E8E93';
const IOS_TERTIARY_FILL = '#3A3A3C';
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
const PROG_H = 6;
const BTN_RADIUS = 8;
const BTN_GAP = 8;
const BTN_VPAD = 7;
const BTN_FONT = 12;

export type LockPreviewMetric = {
  value: string;
  label: string;
  valueSize?: 'big' | 'small';
};

export function LockActivityPreviewCard({
  icon,
  iconWeight = 'semibold',
  rhythmTitle,
  fallbackTitle,
  metrics = [],
  noteBelowHeader,
  progressPct,
  footerCaption,
}: {
  icon: SymbolViewProps['name'];
  iconWeight?: SymbolWeight;
  rhythmTitle: string;
  fallbackTitle: string;
  metrics?: LockPreviewMetric[];
  noteBelowHeader?: string;
  progressPct: number;
  footerCaption: string;
}) {
  const titleText = rhythmTitle?.trim() || fallbackTitle;
  const pctRaw = Number.isFinite(progressPct) ? Math.round(progressPct) : 0;
  const pct = Math.max(0, Math.min(100, pctRaw));

  const metricRow =
    metrics.length > 0 ? (
      <View style={styles.metricRow}>
        {metrics.map((m, index) => (
          <View key={`${m.label}-${index}`} style={styles.metricCol}>
            <Text
              style={[m.valueSize === 'small' ? styles.metricValueSmall : styles.metricValueBig]}
              numberOfLines={1}>
              {m.value}
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>
              {m.label}
            </Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.previewWrap}>
      <View style={styles.laCard}>
        <View style={styles.laInner}>
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <IconSymbol name={icon} size={ICON_INNER} color="#fff" weight={iconWeight} />
            </View>
            <View style={styles.headerTitles}>
              <Text style={styles.kicker}>활성 플로우</Text>
              <Text style={styles.title} numberOfLines={1}>
                {titleText}
              </Text>
            </View>
            <Text style={styles.timer} selectable={false}>
              --:--
            </Text>
          </View>

          {noteBelowHeader ? (
            <Text style={styles.note} numberOfLines={2}>
              {noteBelowHeader}
            </Text>
          ) : null}

          {metricRow}

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
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
        {footerCaption}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { gap: 10 },
  caption: { fontSize: 12, fontWeight: '600', paddingHorizontal: 2 },
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
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
  note: { fontSize: 12, fontWeight: '600', color: IOS_SECONDARY_LABEL, lineHeight: 16 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: METRIC_GAP },
  metricCol: { flex: 1, gap: METRIC_LABEL_GAP },
  metricValueBig: { color: '#fff', fontSize: VALUE_BIG, fontWeight: '800', letterSpacing: -0.5 },
  metricValueSmall: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: IOS_SECONDARY_LABEL },
  progressTrack: {
    height: PROG_H,
    borderRadius: 999,
    backgroundColor: IOS_TERTIARY_FILL,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', gap: BTN_GAP },
  actionBtn: {
    flex: 1,
    borderRadius: BTN_RADIUS,
    paddingVertical: BTN_VPAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPause: { backgroundColor: IOS_TERTIARY_FILL },
  actionPauseText: { color: '#fff', fontSize: BTN_FONT, fontWeight: '600' },
  actionDone: { backgroundColor: IOS_SYSTEM_ORANGE },
  actionDoneText: { color: '#fff', fontSize: BTN_FONT, fontWeight: '600' },
});
