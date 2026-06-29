import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  type ReadingLiveActivityConfig,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import type { GoalDetailCategoryKey } from '../../../../model/types';

const READING_EMERALD = 'rgb(16, 185, 129)';

export type ReadingDetailDataConfig = ReadingLiveActivityConfig;
export const DEFAULT_READING_DATA_CONFIG = DEFAULT_READING_LIVE_ACTIVITY_CONFIG;
export const getInitialReadingDataConfig = getInitialReadingLiveActivityConfig;

export function ReadingSettings({
  rhythmTitle,
  categoryKey = 'reading',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
}) {
  const cfg = {
    ...DEFAULT_READING_DATA_CONFIG,
    ...(dataConfig as Partial<ReadingDetailDataConfig> | null | undefined),
  } as ReadingDetailDataConfig;

  const scheme = useColorScheme();
  const palette = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );

  const [displayName, setDisplayName] = useState(cfg.displayName ?? '');
  const [bookTitleStr, setBookTitleStr] = useState(cfg.bookTitle);
  const [summary, setSummary] = useState(cfg.summary ?? '');
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

  useEffect(() => {
    setDisplayName((prev) => (prev === (cfg.displayName ?? '') ? prev : (cfg.displayName ?? '')));
  }, [cfg.displayName]);

  useEffect(() => {
    setSummary((prev) => (prev === (cfg.summary ?? '') ? prev : (cfg.summary ?? '')));
  }, [cfg.summary]);

  const startPage = Math.max(0, parseInt(startPageStr, 10) || 0);
  const targetPage = Math.max(0, parseInt(targetPageStr, 10) || 0);

  const draftReading = useMemo(
    (): ReadingLiveActivityConfig => ({
      displayName,
      bookTitle: bookTitleStr,
      startPage,
      targetPage,
      selectedMetrics: normalizeReadingMetricSelection(cfg.selectedMetrics),
      summary,
    }),
    [bookTitleStr, cfg.selectedMetrics, displayName, startPage, summary, targetPage],
  );

  const { pagesRead: pagesToRead } = deriveReadingProgress(draftReading);

  useEffect(() => {
    const payload = {
      displayName: displayName.trim(),
      bookTitle: bookTitleStr.trim(),
      startPage,
      targetPage,
      selectedMetrics: normalizeReadingMetricSelection(cfg.selectedMetrics),
      summary: summary.trim(),
    };
    const serialized = JSON.stringify(payload);
    if (lastPushedPayloadRef.current === serialized) {
      return;
    }
    lastPushedPayloadRef.current = serialized;
    onChangeDataConfig(payload);
  }, [onChangeDataConfig, bookTitleStr, cfg.selectedMetrics, displayName, startPage, summary, targetPage]);

  const muted = '#6b7280';
  const onSurface = '#111827';
  const outline = '#9ca3af';

  return (
    <View style={styles.shell}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={palette}
      />

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={palette} />

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
