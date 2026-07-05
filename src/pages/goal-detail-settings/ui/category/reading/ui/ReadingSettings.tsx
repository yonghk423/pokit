import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  deriveReadingBookProgress,
  ensureReadingBookPages,
  getInitialReadingLiveActivityConfig,
  makeReadingBookId,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  type ReadingBookEntry,
  type ReadingLiveActivityConfig,
  type ReadingMetricKey,
} from '@entities/day-plan';
import {
  AladinAttributionLine,
  AladinBookSearchSheet,
  openAladinProductPage,
  type AladinBookDetail,
} from '@features/aladin-book-search';
import { isAladinApiConfigured } from '@shared/config/aladin';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import type { GoalDetailCategoryKey } from '../../../../model/types';

const PRIMARY = 'rgb(0, 0, 0)';
const READING_ACCENT = RetroFlatColors.light.primary;

const METRIC_OPTIONS: { key: ReadingMetricKey; label: string }[] = [
  { key: 'pages_read', label: '읽은 페이지' },
  { key: 'pages_left', label: '남은 페이지' },
  { key: 'focus_level', label: '집중도' },
];

type SettingsPalette = ReturnType<typeof goalDetailSettingsPalette>;

export type ReadingDetailDataConfig = ReadingLiveActivityConfig;
export const DEFAULT_READING_DATA_CONFIG = DEFAULT_READING_LIVE_ACTIVITY_CONFIG;
export const getInitialReadingDataConfig = getInitialReadingLiveActivityConfig;

function pageToInputValue(value: unknown, fallback: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.max(0, Math.round(value)));
  }
  return String(fallback);
}

function ReadingBookCard({
  entry,
  palette,
  onChange,
  onRemove,
}: {
  entry: ReadingBookEntry;
  palette: SettingsPalette;
  onChange: (next: ReadingBookEntry) => void;
  onRemove: () => void;
}) {
  const c = palette;
  const resolved = ensureReadingBookPages(entry);
  const [startPageStr, setStartPageStr] = useState(() => pageToInputValue(resolved.startPage, 1));
  const [targetPageStr, setTargetPageStr] = useState(() =>
    pageToInputValue(resolved.targetPage, resolved.aladin?.totalPages ?? 100),
  );

  useEffect(() => {
    const next = ensureReadingBookPages(entry);
    setStartPageStr(pageToInputValue(next.startPage, 1));
    setTargetPageStr(pageToInputValue(next.targetPage, next.aladin?.totalPages ?? 100));
  }, [entry]);

  const startPage = Math.max(0, parseInt(startPageStr, 10) || 0);
  const targetPage = Math.max(0, parseInt(targetPageStr, 10) || 0);
  const { pagesRead, progressPct } = deriveReadingBookProgress({ startPage, targetPage });

  const commitPages = (nextStart: number, nextTarget: number) => {
    onChange(
      ensureReadingBookPages({
        ...entry,
        startPage: nextStart,
        targetPage: nextTarget,
      }),
    );
  };

  const metaLine = entry.aladin?.author?.trim() || null;
  const totalPages =
    typeof entry.aladin?.totalPages === 'number' && entry.aladin.totalPages > 0
      ? entry.aladin.totalPages
      : null;

  return (
    <View style={[styles.bookCard, { borderColor: c.outline }]}>
      <View style={styles.bookCardHeader}>
        {entry.aladin?.coverUrl ? (
          <Image source={{ uri: entry.aladin.coverUrl }} style={styles.bookCover} contentFit="cover" />
        ) : (
          <View style={[styles.bookCover, styles.bookCoverFallback, { borderColor: c.outlineVariant }]}>
            <IconSymbol name="book.closed.fill" size={14} color={c.outline} />
          </View>
        )}
        <View style={styles.bookCardHeaderText}>
          <ThemedText style={[styles.bookRowTitle, { color: c.onSurface }]} numberOfLines={1}>
            {entry.title}
          </ThemedText>
          {metaLine ? (
            <ThemedText style={[styles.bookRowMeta, { color: c.onVariant }]} numberOfLines={1}>
              {metaLine}
            </ThemedText>
          ) : null}
          {entry.aladin?.link ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void openAladinProductPage(entry.aladin!.link)}
              style={({ pressed }) => pressed && { opacity: 0.72 }}>
              <ThemedText style={[styles.aladinLink, { color: c.onVariant }]}>알라딘에서 보기</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${entry.title} 삭제`}
          onPress={onRemove}
          hitSlop={8}
          style={styles.bookRemoveBtn}>
          <IconSymbol name="xmark" size={11} color={c.outline} />
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        <ThemedText style={[styles.progressLine, { color: c.onSurface }]}>
          {startPage}P → {targetPage}P
        </ThemedText>
        <ThemedText style={[styles.progressSub, { color: c.onVariant }]}>
          {pagesRead}쪽 · {progressPct}%
        </ThemedText>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.outlineVariant }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPct}%`,
              backgroundColor: READING_ACCENT,
            },
          ]}
        />
      </View>

      <View style={styles.pageFields}>
        <View style={[styles.pageField, { borderColor: c.outlineVariant }]}>
          <ThemedText style={[styles.pageFieldLabel, { color: c.onVariant }]}>시작</ThemedText>
          <View style={styles.pageFieldInputRow}>
            <TextInput
              value={startPageStr}
              onChangeText={setStartPageStr}
              onBlur={() => commitPages(startPage, targetPage)}
              placeholder="1"
              placeholderTextColor={c.outline}
              keyboardType="number-pad"
              style={[styles.pageFieldInput, { color: c.onSurface }]}
            />
            <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
          </View>
        </View>
        <View style={[styles.pageField, { borderColor: c.outlineVariant }]}>
          <ThemedText style={[styles.pageFieldLabel, { color: c.onVariant }]}>목표</ThemedText>
          <View style={styles.pageFieldInputRow}>
            <TextInput
              value={targetPageStr}
              onChangeText={setTargetPageStr}
              onBlur={() => commitPages(startPage, targetPage)}
              placeholder="100"
              placeholderTextColor={c.outline}
              keyboardType="number-pad"
              style={[styles.pageFieldInput, { color: c.onSurface }]}
            />
            <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
          </View>
        </View>
        <View style={[styles.pageField, styles.pageFieldTotal, { borderColor: c.outlineVariant }]}>
          <ThemedText style={[styles.pageFieldLabel, { color: c.onVariant }]}>전체</ThemedText>
          {totalPages != null ? (
            <View style={styles.pageFieldInputRow}>
              <ThemedText style={[styles.pageFieldValue, { color: c.onSurface }]}>{totalPages}</ThemedText>
              <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
            </View>
          ) : (
            <ThemedText style={[styles.pageFieldValueMuted, { color: c.outline }]}>—</ThemedText>
          )}
        </View>
        <View style={[styles.pageField, styles.pageFieldRead, { borderColor: READING_ACCENT }]}>
          <ThemedText style={[styles.pageFieldLabel, { color: c.onVariant }]}>읽을 분량</ThemedText>
          <ThemedText style={[styles.pageFieldValue, { color: READING_ACCENT }]}>{pagesRead}</ThemedText>
        </View>
      </View>
    </View>
  );
}

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
  const palette = useMemo(() => goalDetailSettingsPalette(false), []);
  const c = palette;
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );

  const [displayName, setDisplayName] = useState('');
  const [books, setBooks] = useState<ReadingBookEntry[]>([]);
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);
  const [draftBookTitle, setDraftBookTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<ReadingMetricKey[]>([]);

  const lastPushedRef = useRef<string | null>(null);
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const next = normalizeReadingLiveActivityConfig(dataConfig);
    const key = JSON.stringify(next);
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;
    setDisplayName(next.displayName ?? '');
    setBooks(next.books.map((book) => ensureReadingBookPages(book)));
    setSummary(next.summary ?? '');
    setSelectedMetrics(normalizeReadingMetricSelection(next.selectedMetrics));
  }, [dataConfig]);

  const draftReading = useMemo((): ReadingLiveActivityConfig => {
    const normalizedBooks = books.map((book) => ensureReadingBookPages(book));
    const firstBook = normalizedBooks[0];
    return normalizeReadingLiveActivityConfig({
      displayName,
      bookTitle: firstBook?.title ?? '',
      aladinBook: firstBook?.aladin ?? null,
      books: normalizedBooks,
      startPage: firstBook?.startPage,
      targetPage: firstBook?.targetPage,
      selectedMetrics: normalizeReadingMetricSelection(selectedMetrics),
      summary,
    });
  }, [books, displayName, selectedMetrics, summary]);

  useEffect(() => {
    const serialized = JSON.stringify(draftReading);
    if (lastPushedRef.current === serialized) return;
    lastPushedRef.current = serialized;
    onChangeDataConfig(draftReading);
  }, [draftReading, onChangeDataConfig]);

  const addManualBook = () => {
    const trimmed = draftBookTitle.trim();
    if (!trimmed) return;
    setBooks((prev) => [
      ...prev,
      {
        id: makeReadingBookId(),
        title: trimmed,
        startPage: 1,
        targetPage: 100,
      },
    ]);
    setDraftBookTitle('');
  };

  const addAladinBook = (book: AladinBookDetail) => {
    setBooks((prev) => [
      ...prev,
      {
        id: makeReadingBookId(),
        title: book.title,
        startPage: 1,
        targetPage: book.totalPages && book.totalPages > 0 ? book.totalPages : 100,
        aladin: {
          itemId: book.itemId,
          link: book.link,
          coverUrl: book.coverUrl,
          author: book.author,
          totalPages: book.totalPages,
        },
      },
    ]);
  };

  const updateBook = (id: string, next: ReadingBookEntry) => {
    setBooks((prev) => prev.map((book) => (book.id === id ? next : book)));
  };

  const removeBook = (id: string) => {
    setBooks((prev) => prev.filter((book) => book.id !== id));
  };

  const toggleMetric = (key: ReadingMetricKey) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const aladinEnabled = isAladinApiConfigured();
  const hasAnyAladin = books.some((book) => !!book.aladin);

  return (
    <View style={styles.root}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={palette}
      />

      <View style={styles.heading}>
        <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>독서 설정</ThemedText>
        <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
          읽을 도서를 추가하고, 책마다 오늘의 읽기 분량을 설정해 주세요.
        </ThemedText>
      </View>

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={palette} />

      <View style={styles.bookListSection}>
        <View style={styles.bookListHeader}>
          <View style={styles.bookListHeaderLeft}>
            <IconSymbol name="book.fill" size={20} color={PRIMARY} />
            <ThemedText style={[styles.bookListTitle, { color: c.onSurface }]}>읽을 도서</ThemedText>
            <ThemedText style={[styles.bookCount, { color: c.onVariant }]}>{books.length}권</ThemedText>
          </View>
          {aladinEnabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="알라딘에서 도서 검색"
              onPress={() => setSearchSheetVisible(true)}
              style={[styles.searchBtn, { borderColor: PRIMARY }]}>
              <IconSymbol name="magnifyingglass" size={14} color={PRIMARY} />
              <ThemedText style={[styles.searchBtnText, { color: PRIMARY }]}>도서 검색</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {books.length > 0 ? (
          <View style={styles.bookList}>
            {books.map((entry) => (
              <ReadingBookCard
                key={entry.id}
                entry={entry}
                palette={palette}
                onChange={(next) => updateBook(entry.id, next)}
                onRemove={() => removeBook(entry.id)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyHint, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
            <ThemedText style={[styles.emptyHintText, { color: c.onVariant }]}>
              아래에서 직접 입력하거나 알라딘 도서 검색으로 추가해 주세요.
            </ThemedText>
          </View>
        )}

        <View style={[styles.addRow, { borderColor: c.outlineVariant }]}>
          <TextInput
            value={draftBookTitle}
            onChangeText={setDraftBookTitle}
            onSubmitEditing={addManualBook}
            returnKeyType="done"
            placeholder="책 제목을 직접 입력"
            placeholderTextColor={c.outline}
            style={[styles.addInput, { color: c.onSurface }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="도서 추가"
            onPress={addManualBook}
            style={[styles.addBtn, { backgroundColor: PRIMARY }]}>
            <IconSymbol name="plus" size={16} color="#fff" />
          </Pressable>
        </View>

        {hasAnyAladin || aladinEnabled ? (
          <AladinAttributionLine color={c.outline} compact />
        ) : null}
      </View>

      <View style={styles.metricsSection}>
        <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>세션 지표</ThemedText>
        <View style={styles.metricChipRow}>
          {METRIC_OPTIONS.map((opt) => {
            const on = selectedMetrics.includes(opt.key);
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => toggleMetric(opt.key)}
                style={[
                  styles.metricChip,
                  {
                    borderColor: on ? PRIMARY : c.outline,
                    backgroundColor: on ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: on ? '800' : '600',
                    color: on ? c.onSurface : c.onVariant,
                  }}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <AladinBookSearchSheet
        visible={searchSheetVisible}
        ink={c.onSurface}
        muted={c.onVariant}
        surface={c.surfaceLowest}
        line={c.outline}
        onClose={() => setSearchSheetVisible(false)}
        onSelect={addAladinBook}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 22 },
  heading: { gap: 6 },
  sectionTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  sectionSub: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: -0.1, marginLeft: 2 },

  bookListSection: { gap: 14 },
  bookListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookListHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookListTitle: { fontSize: 16, fontWeight: '800' },
  bookCount: { fontSize: 13, fontWeight: '600' },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchBtnText: { fontSize: 13, fontWeight: '700' },

  bookList: { gap: 10 },
  bookCard: {
    borderWidth: 2,
    padding: 10,
    gap: 8,
  },
  bookCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookCardHeaderText: { flex: 1, minWidth: 0, gap: 2 },
  bookCover: {
    width: 36,
    height: 50,
    backgroundColor: '#f3f4f6',
  },
  bookCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bookRowTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  bookRowMeta: { fontSize: 11, fontWeight: '500' },
  aladinLink: { fontSize: 10, fontWeight: '700', textDecorationLine: 'underline' },
  bookRemoveBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLine: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  progressSub: { fontSize: 11, fontWeight: '600' },
  progressTrack: {
    height: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },

  emptyHint: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHintText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  addInput: { flex: 1, fontSize: 15, fontWeight: '700', padding: 0, minHeight: 40 },
  addBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageFields: {
    flexDirection: 'row',
    gap: 4,
  },
  pageField: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 2,
    alignItems: 'center',
    minWidth: 0,
  },
  pageFieldRead: {
    justifyContent: 'center',
  },
  pageFieldTotal: {
    justifyContent: 'center',
  },
  pageFieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  pageFieldInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  pageFieldInput: { fontSize: 15, fontWeight: '800', textAlign: 'center', padding: 0, minWidth: 22 },
  pageFieldSuffix: { fontSize: 10, fontWeight: '700' },
  pageFieldValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  pageFieldValueMuted: { fontSize: 15, fontWeight: '700' },

  metricsSection: { gap: 10 },
  metricChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricChip: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
});
