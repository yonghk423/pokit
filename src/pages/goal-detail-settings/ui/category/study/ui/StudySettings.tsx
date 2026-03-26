import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  type ReadingLiveActivityConfig,
  type ReadingMetricKey,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const PRIMARY = 'rgb(249, 115, 22)';

function palette(isDark: boolean) {
  if (isDark) {
    return {
      surfaceLow: '#18181b',
      surfaceLowest: '#0f0f12',
      card: '#111113',
      onSurface: '#fafafa',
      onVariant: '#a1a1aa',
      outline: '#71717a',
      outlineVariant: 'rgba(255,255,255,0.12)',
    };
  }
  return {
    surfaceLow: '#f4f4f5',
    surfaceLowest: '#ffffff',
    card: '#ffffff',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    outlineVariant: 'rgba(0,0,0,0.10)',
  };
}

const METRICS: {
  key: ReadingMetricKey;
  title: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  activeFill?: boolean;
}[] = [
    { key: 'pages_read', title: '시작 페이지', icon: 'book.fill', activeFill: true },
    { key: 'focus_level', title: '집중도', icon: 'brain.head.profile' },
    { key: 'pages_left', title: '목표 페이지', icon: 'book.pages.fill', activeFill: true },
  ];

export type StudyWidgetDataConfig = ReadingLiveActivityConfig;
export const DEFAULT_STUDY_DATA_CONFIG = DEFAULT_READING_LIVE_ACTIVITY_CONFIG;
export const getInitialStudyDataConfig = getInitialReadingLiveActivityConfig;

export function StudySettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => palette(scheme === 'dark'), [scheme]);

  const cfg = {
    ...DEFAULT_STUDY_DATA_CONFIG,
    ...(dataConfig as Partial<StudyWidgetDataConfig> | null | undefined),
  } as StudyWidgetDataConfig;

  const persistedMetricsKey = JSON.stringify(
    normalizeReadingMetricSelection(cfg.selectedMetrics),
  );

  const [startPageStr, setStartPageStr] = useState(String(cfg.startPage));
  const [targetPageStr, setTargetPageStr] = useState(String(cfg.targetPage));
  const [selected, setSelected] = useState<ReadingMetricKey[]>(
    normalizeReadingMetricSelection(cfg.selectedMetrics),
  );

  const lastPushedPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    const nextMetrics = normalizeReadingMetricSelection(cfg.selectedMetrics);
    const sp = String(cfg.startPage);
    const tp = String(cfg.targetPage);
    setStartPageStr((prev) => (prev === sp ? prev : sp));
    setTargetPageStr((prev) => (prev === tp ? prev : tp));
    setSelected((prev) =>
      JSON.stringify(prev) === JSON.stringify(nextMetrics) ? prev : nextMetrics,
    );
  }, [cfg.startPage, cfg.targetPage, persistedMetricsKey]);

  const startPage = Math.max(0, parseInt(startPageStr, 10) || 0);
  const targetPage = Math.max(0, parseInt(targetPageStr, 10) || 0);
  const { pagesRead: goalPages, progressPct } = deriveReadingProgress({
    startPage,
    targetPage,
    selectedMetrics: selected,
  });

  const toggleMetric = (k: ReadingMetricKey) => {
    setSelected((prev) => {
      const has = prev.includes(k);
      if (has) return prev.filter((x) => x !== k);
      if (prev.length >= 3) return prev;
      return [...prev, k];
    });
  };

  useEffect(() => {
    const payload = { startPage, targetPage, selectedMetrics: selected };
    const serialized = JSON.stringify(payload);
    if (lastPushedPayloadRef.current === serialized) {
      return;
    }
    lastPushedPayloadRef.current = serialized;
    onChangeDataConfig(payload);
  }, [onChangeDataConfig, selected, startPage, targetPage]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: c.surfaceLow }]}>
        <View style={styles.cardHeadRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText style={[styles.cardTitle, { color: c.onSurface }]}>오늘 읽을 분량</ThemedText>
            <ThemedText style={[styles.cardSub, { color: c.onVariant }]}>
              시작·목표 페이지로 오늘 읽을 분량을 정해 주세요.
            </ThemedText>
          </View>
          <ThemedText style={[styles.goalBig, { color: PRIMARY }]}>
            {goalPages}
            <ThemedText style={[styles.goalUnit, { color: c.onVariant }]}>p</ThemedText>
          </ThemedText>
        </View>

        <View style={styles.grid2}>
          <View style={styles.fieldCol}>
            <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>시작 페이지</ThemedText>
            <View style={[styles.fieldWrap, { backgroundColor: c.surfaceLowest, borderColor: 'transparent' }]}>
              <TextInput
                value={startPageStr}
                onChangeText={setStartPageStr}
                placeholder="24"
                placeholderTextColor={c.outline}
                keyboardType="number-pad"
                style={[styles.fieldInput, { color: c.onSurface }]}
              />
              <ThemedText style={[styles.fieldSuffix, { color: c.onVariant }]}>p</ThemedText>
            </View>
          </View>
          <View style={styles.fieldCol}>
            <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>목표 페이지</ThemedText>
            <View style={[styles.fieldWrap, { backgroundColor: c.surfaceLowest, borderColor: 'transparent' }]}>
              <TextInput
                value={targetPageStr}
                onChangeText={setTargetPageStr}
                placeholder="120"
                placeholderTextColor={c.outline}
                keyboardType="number-pad"
                style={[styles.fieldInput, { color: c.onSurface }]}
              />
              <ThemedText style={[styles.fieldSuffix, { color: c.onVariant }]}>p</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <ThemedText style={[styles.metaText, { color: c.onVariant }]}>목표 독서량: {goalPages}페이지</ThemedText>
          <ThemedText style={[styles.metaText, { color: c.onVariant }]}>진행률: {progressPct}%</ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>잠금화면 데이터 구성</ThemedText>
        <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
          잠금화면에 표시할 항목을 선택하세요. 모두 해제할 수 있어요.
        </ThemedText>

        <View style={styles.optionList}>
          {METRICS.map((m) => {
            const active = selected.includes(m.key);
            return (
              <Pressable
                key={m.key}
                onPress={() => toggleMetric(m.key)}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: active ? c.surfaceLowest : c.surfaceLow,
                    borderColor: active ? PRIMARY : c.outlineVariant,
                    borderWidth: active ? 2 : 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.optionIconWrap,
                      { backgroundColor: active ? 'rgba(249,115,22,0.12)' : 'rgba(113,113,122,0.12)' },
                    ]}>
                    <IconSymbol
                      name={m.icon}
                      size={22}
                      color={active ? PRIMARY : c.onVariant}
                      weight={active && m.activeFill ? 'semibold' : 'regular'}
                    />
                  </View>
                  <ThemedText style={[styles.optionText, { color: active ? c.onSurface : c.onVariant }]}>
                    {m.title}
                  </ThemedText>
                </View>
                <IconSymbol
                  name={active ? 'checkmark.circle.fill' : 'circle'}
                  size={22}
                  color={active ? PRIMARY : c.outline}
                  weight={active ? 'bold' : 'regular'}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  card: { borderRadius: 16, padding: 20, gap: 16 },
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  cardTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  cardSub: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  goalBig: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8, lineHeight: 32 },
  goalUnit: { fontSize: 14, fontWeight: '900' },
  grid2: { flexDirection: 'row', gap: 12 },
  fieldCol: { flex: 1, gap: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', paddingLeft: 2 },
  fieldWrap: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldInput: { flex: 1, fontSize: 16, fontWeight: '800', padding: 0 },
  fieldSuffix: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  metaText: { fontSize: 10, fontWeight: '600', fontStyle: 'italic' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, lineHeight: 18 },
  optionList: { gap: 10, marginTop: 6 },
  optionRow: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  optionIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 13, fontWeight: '800', flex: 1 },
});

