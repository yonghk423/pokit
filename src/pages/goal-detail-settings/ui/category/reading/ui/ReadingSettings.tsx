import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingProgress,
  getInitialReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  readingDisplayTitle,
  type ReadingLiveActivityConfig,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

/** 액센트는 세션과 맞추고, 배경은 목표 상세 공통 화이트 */
const READING_EMERALD_TEXT = 'rgb(52, 211, 153)';
const READING_EMERALD = 'rgb(16, 185, 129)';
const READING_SCREEN_BG = '#ffffff';

export type ReadingDetailDataConfig = ReadingLiveActivityConfig;
export const DEFAULT_READING_DATA_CONFIG = DEFAULT_READING_LIVE_ACTIVITY_CONFIG;
export const getInitialReadingDataConfig = getInitialReadingLiveActivityConfig;

export function ReadingSettings({
  rhythmTitle,
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

  const sessionPreviewTitle = readingDisplayTitle(rhythmTitle, draftReading);

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

  const rangeLine = `${startPage}p ~ ${targetPage}p`;
  const flowNameLine = rhythmTitle.trim() || '없음';

  const cardBg = READING_SCREEN_BG;
  const borderC = 'rgba(16,185,129,0.25)';
  const fieldBg = '#ffffff';
  const muted = '#64748b';
  const onSurface = '#0f172a';
  const outline = '#94a3b8';

  const kickerColor = 'rgb(5, 122, 85)';

  return (
    <View style={styles.wrap}>
      <View style={[styles.sessionCard, { backgroundColor: cardBg, borderColor: borderC }]}>
        <View style={styles.bookIconWrap}>
          <View
            style={[
              styles.bookCircle,
              {
                backgroundColor: 'rgba(16,185,129,0.10)',
                borderColor: 'rgba(16,185,129,0.20)',
              },
            ]}>
            <IconSymbol name="book.fill" size={44} color={READING_EMERALD_TEXT} weight="light" />
          </View>
        </View>

        <View style={[styles.bookFieldPanel, { backgroundColor: fieldBg, borderColor: borderC }]}>
          <ThemedText style={[styles.bookFieldLabel, { color: muted }]}>읽는 책</ThemedText>
          <TextInput
            value={bookTitleStr}
            onChangeText={setBookTitleStr}
            placeholder="책 제목을 입력하세요"
            placeholderTextColor={outline}
            maxLength={120}
            multiline
            style={[styles.bookTitleInput, { color: onSurface }]}
          />
          <ThemedText style={[styles.bookFieldHint, { color: muted }]}>
            비워 두면 일정 플로우 이름「{flowNameLine}」이 세션에 표시돼요.
          </ThemedText>
        </View>

        <ThemedText style={[styles.bookKicker, { color: kickerColor }]}>몰입 미리보기</ThemedText>
        <Text style={[styles.bookTitle, { color: onSurface }]} numberOfLines={4}>
          {sessionPreviewTitle}
        </Text>
        <ThemedText style={[styles.contextHint, { color: muted }]}>
          독서 세션에는 큰 타이머와 함께, 아래 목표 범위가 강조돼요.
        </ThemedText>

        <View style={styles.rangeBlock}>
          <ThemedText style={[styles.rangeLabel, { color: muted }]}>오늘의 목표 범위</ThemedText>
          <Text style={[styles.rangeValue, { color: READING_EMERALD_TEXT }]}>{rangeLine}</Text>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCol}>
            <Text style={[styles.valBig, { color: onSurface }]}>{startPage}</Text>
            <ThemedText style={[styles.metricLabel, { color: muted }]}>시작 페이지</ThemedText>
          </View>
          <View style={styles.metricCol}>
            <Text style={[styles.valSmall, { color: onSurface }]}>{targetPage}</Text>
            <ThemedText style={[styles.metricLabel, { color: muted }]}>목표 페이지</ThemedText>
          </View>
          <View style={styles.metricCol}>
            <Text style={[styles.valBig, { color: onSurface }]}>{pagesToRead}</Text>
            <ThemedText style={[styles.metricLabel, { color: muted }]}>읽을 페이지</ThemedText>
          </View>
        </View>

        <View style={[styles.inputPanel, { backgroundColor: fieldBg, borderColor: borderC }]}>
          <ThemedText style={[styles.inputPanelTitle, { color: onSurface }]}>페이지 입력</ThemedText>
          <ThemedText style={[styles.inputPanelSub, { color: muted }]}>
            숫자를 바꾸면 위 미리보기·세션·잠금화면 표시가 함께 갱신돼요.
          </ThemedText>
          <View style={styles.grid2}>
            <View style={styles.fieldCol}>
              <ThemedText style={[styles.fieldLabel, { color: muted }]}>시작 페이지</ThemedText>
              <View
                style={[
                  styles.fieldWrap,
                  { backgroundColor: '#f1f5f9', borderColor: borderC },
                ]}>
                <TextInput
                  value={startPageStr}
                  onChangeText={setStartPageStr}
                  placeholder="24"
                  placeholderTextColor={outline}
                  keyboardType="number-pad"
                  style={[styles.fieldInput, { color: onSurface }]}
                />
                <ThemedText style={[styles.fieldSuffix, { color: muted }]}>p</ThemedText>
              </View>
            </View>
            <View style={styles.fieldCol}>
              <ThemedText style={[styles.fieldLabel, { color: muted }]}>목표 페이지</ThemedText>
              <View
                style={[
                  styles.fieldWrap,
                  { backgroundColor: '#f1f5f9', borderColor: borderC },
                ]}>
                <TextInput
                  value={targetPageStr}
                  onChangeText={setTargetPageStr}
                  placeholder="120"
                  placeholderTextColor={outline}
                  keyboardType="number-pad"
                  style={[styles.fieldInput, { color: onSurface }]}
                />
                <ThemedText style={[styles.fieldSuffix, { color: muted }]}>p</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  sessionCard: {
    borderRadius: 20,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  bookIconWrap: {
    marginBottom: 4,
    alignItems: 'center',
  },
  bookCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: READING_EMERALD,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  bookFieldPanel: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  bookFieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  bookTitleInput: {
    minHeight: 44,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    paddingVertical: 8,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
  bookFieldHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  bookKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bookTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  contextHint: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rangeBlock: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  rangeLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  rangeValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  metricCol: { flex: 1, gap: 4, alignItems: 'center' },
  valBig: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  valSmall: { fontSize: 22, fontWeight: '800', letterSpacing: -0.35, textAlign: 'center' },
  metricLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  inputPanel: {
    width: '100%',
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  inputPanelTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  inputPanelSub: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  grid2: { flexDirection: 'row', gap: 12 },
  fieldCol: { flex: 1, gap: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  fieldWrap: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  fieldInput: { flex: 1, fontSize: 17, fontWeight: '800', padding: 0 },
  fieldSuffix: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
});
