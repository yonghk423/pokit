import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  type ReadingLiveActivityConfig,
} from '@entities/day-plan';
const READING_EMERALD = 'rgb(16, 185, 129)';

export type ReadingDetailDataConfig = ReadingLiveActivityConfig;
export const DEFAULT_READING_DATA_CONFIG = DEFAULT_READING_LIVE_ACTIVITY_CONFIG;
export const getInitialReadingDataConfig = getInitialReadingLiveActivityConfig;

export function ReadingSettings({
  rhythmTitle: _rhythmTitle,
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const cfg = {
    ...DEFAULT_READING_DATA_CONFIG,
    ...(dataConfig as Partial<ReadingDetailDataConfig> | null | undefined),
  } as ReadingDetailDataConfig;

  const [bookTitleStr, setBookTitleStr] = useState(cfg.bookTitle);
  const [startPageStr, setStartPageStr] = useState(String(cfg.startPage));
  const [targetPageStr, setTargetPageStr] = useState(String(cfg.targetPage));

  const lastPushedPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    setBookTitleStr((prev) => (prev === cfg.bookTitle ? prev : cfg.bookTitle));
  }, [cfg.bookTitle]);

  useEffect(() => {
    const sp = String(cfg.startPage);
    const tp = String(cfg.targetPage);
    setStartPageStr((prev) => (prev === sp ? prev : sp));
    setTargetPageStr((prev) => (prev === tp ? prev : tp));
  }, [cfg.startPage, cfg.targetPage]);

  const startPage = Math.max(0, parseInt(startPageStr, 10) || 0);
  const targetPage = Math.max(0, parseInt(targetPageStr, 10) || 0);

  const draftReading = useMemo(
    (): ReadingLiveActivityConfig => ({
      bookTitle: bookTitleStr,
      startPage,
      targetPage,
      selectedMetrics: normalizeReadingMetricSelection(cfg.selectedMetrics),
    }),
    [bookTitleStr, cfg.selectedMetrics, startPage, targetPage],
  );

  const { pagesRead: pagesToRead } = deriveReadingProgress(draftReading);

  useEffect(() => {
    const payload = {
      bookTitle: bookTitleStr.trim(),
      startPage,
      targetPage,
      selectedMetrics: normalizeReadingMetricSelection(cfg.selectedMetrics),
    };
    const serialized = JSON.stringify(payload);
    if (lastPushedPayloadRef.current === serialized) {
      return;
    }
    lastPushedPayloadRef.current = serialized;
    onChangeDataConfig(payload);
  }, [onChangeDataConfig, bookTitleStr, cfg.selectedMetrics, startPage, targetPage]);

  const muted = '#6b7280';
  const onSurface = '#111827';
  const outline = '#9ca3af';

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: onSurface }]}>LOCKFLOW READING</Text>
      </View>

      <View style={styles.about}>
        <Text style={[styles.sectionKicker, { color: muted }]}>ABOUT BOOK FLOW</Text>
        <Text style={[styles.aboutText, { color: onSurface }]}>
          한 권을 끝까지 밀어붙이도록 페이지 목표와 구간을 명확하게 설계합니다.
        </Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.sectionKicker, { color: muted }]}>CATEGORIES ||</Text>
        <Text style={[styles.mainTitle, { color: onSurface }]}>Reading</Text>
      </View>

      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: '#d1d5db' }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: onSurface }]}>
            {startPage}
            <Text style={styles.metricPageSuffix}>P</Text>
          </Text>
          <Text style={[styles.metricLabel, { color: muted }]}>시작</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: onSurface }]}>
            {targetPage}
            <Text style={styles.metricPageSuffix}>P</Text>
          </Text>
          <Text style={[styles.metricLabel, { color: muted }]}>목표</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: READING_EMERALD }]}>{pagesToRead}</Text>
          <Text style={[styles.metricLabel, { color: muted }]}>읽을 분량</Text>
        </View>
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: '#000' }]}>
        <View style={[styles.row, { borderBottomColor: '#d1d5db' }]}>
          <Text style={[styles.rowTitle, { color: onSurface }]}>책 제목</Text>
          <TextInput
            value={bookTitleStr}
            onChangeText={setBookTitleStr}
            placeholder="책 제목 입력"
            placeholderTextColor={outline}
            maxLength={120}
            multiline
            style={[styles.rowInput, { color: onSurface }]}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: '#d1d5db' }]}>
          <Text style={[styles.rowTitle, { color: onSurface }]}>시작 페이지</Text>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={startPageStr}
              onChangeText={setStartPageStr}
              placeholder="1"
              placeholderTextColor={outline}
              keyboardType="number-pad"
              style={[styles.inlineInput, { color: onSurface }]}
            />
            <Text style={[styles.inlineSuffix, { color: muted }]}>P</Text>
          </View>
        </View>

        <View style={[styles.row, { borderBottomColor: '#d1d5db' }]}>
          <Text style={[styles.rowTitle, { color: onSurface }]}>목표 페이지</Text>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={targetPageStr}
              onChangeText={setTargetPageStr}
              placeholder="100"
              placeholderTextColor={outline}
              keyboardType="number-pad"
              style={[styles.inlineInput, { color: onSurface }]}
            />
            <Text style={[styles.inlineSuffix, { color: muted }]}>P</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16, paddingVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  about: { gap: 8 },
  sectionKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  aboutText: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  listHeader: { gap: 6, paddingTop: 2 },
  mainTitle: { fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricPageSuffix: { fontSize: 14, fontWeight: '800', letterSpacing: 0 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  rowsWrap: { borderTopWidth: 1 },
  row: {
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    minHeight: 32,
    maxWidth: '70%',
  },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 62, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0 },
  inlineSuffix: { fontSize: 13, fontWeight: '600' },
});
