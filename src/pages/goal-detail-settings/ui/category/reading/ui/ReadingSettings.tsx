import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  ensureReadingBookPages,
  getInitialReadingLiveActivityConfig,
  makeReadingBookId,
  normalizeReadingBookStatus,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  type ReadingBookEntry,
  type ReadingBookStatus,
  type ReadingLiveActivityConfig,
} from '@entities/day-plan';
import {
  AladinBookSearchSheet,
  type AladinBookDetail,
} from '@features/aladin-book-search';
import { isAladinApiConfigured } from '@shared/config/aladin';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import { ReadingAddBookSheet } from './ReadingAddBookSheet';
import { ReadingBookDetailSheet } from './ReadingBookDetailSheet';

import type { GoalDetailCategoryKey } from '../../../../model/types';

type LibraryTab = 'all' | ReadingBookStatus;

const LIBRARY_TABS: { key: LibraryTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'reading', label: '읽는 중' },
  { key: 'done', label: '완료' },
];

type SettingsPalette = ReturnType<typeof goalDetailSettingsPalette>;

export type ReadingDetailDataConfig = ReadingLiveActivityConfig;
export const DEFAULT_READING_DATA_CONFIG = DEFAULT_READING_LIVE_ACTIVITY_CONFIG;
export const getInitialReadingDataConfig = getInitialReadingLiveActivityConfig;

function bookMatchesTab(book: ReadingBookEntry, tab: LibraryTab): boolean {
  if (tab === 'all') return true;
  return normalizeReadingBookStatus(book.status) === tab;
}

function countBooksForTab(books: ReadingBookEntry[], tab: LibraryTab): number {
  return books.filter((book) => bookMatchesTab(book, tab)).length;
}

function statusLabel(status: ReadingBookStatus): string {
  if (status === 'want') return '읽고 싶은';
  if (status === 'done') return '완료';
  return '읽는 중';
}

function ReadingBookListRow({
  entry,
  palette,
  isDark,
  onPress,
  showDivider,
}: {
  entry: ReadingBookEntry;
  palette: SettingsPalette;
  isDark: boolean;
  onPress: () => void;
  showDivider: boolean;
}) {
  const c = palette;
  const status = normalizeReadingBookStatus(entry.status);
  const author = entry.aladin?.author?.trim();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.listRow,
        showDivider && [styles.listRowDivider, { borderTopColor: c.outlineVariant }],
        pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
      ]}>
      {entry.aladin?.coverUrl ? (
        <Image source={{ uri: entry.aladin.coverUrl }} style={styles.listCover} contentFit="cover" />
      ) : (
        <View
          style={[
            styles.listCover,
            styles.listCoverFallback,
            { borderColor: c.outlineVariant, backgroundColor: c.surfaceLow },
          ]}>
          <IconSymbol name="book.closed.fill" size={16} color={c.outline} />
        </View>
      )}
      <View style={styles.listBody}>
        <ThemedText style={[styles.listTitle, { color: c.onSurface }]} numberOfLines={2}>
          {entry.title}
        </ThemedText>
        {author ? (
          <ThemedText style={[styles.listAuthor, { color: c.onVariant }]} numberOfLines={1}>
            {author}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.listAuthor, { color: c.onVariant }]} numberOfLines={1}>
            {statusLabel(status)}
          </ThemedText>
        )}
      </View>
      <View style={styles.listTrailing}>
        {status === 'done' ? (
          <IconSymbol name="checkmark.circle.fill" size={16} color={c.onSurface} />
        ) : null}
        <IconSymbol name="chevron.right" size={14} color={c.outline} />
      </View>
    </Pressable>
  );
}

export function ReadingSettings({
  categoryKey: _categoryKey = 'reading',
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = useMemo(() => goalDetailSettingsPalette(isDark), [isDark]);
  const c = palette;

  const [displayName, setDisplayName] = useState('');
  const [books, setBooks] = useState<ReadingBookEntry[]>([]);
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [summary, setSummary] = useState('');
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [detailBookId, setDetailBookId] = useState<string | null>(null);

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
  }, [dataConfig]);

  const draftReading = useMemo((): ReadingLiveActivityConfig => {
    const persisted = normalizeReadingLiveActivityConfig(dataConfig);
    const normalizedBooks = books.map((book) => ensureReadingBookPages(book));
    const firstBook = normalizedBooks[0];
    return normalizeReadingLiveActivityConfig({
      displayName,
      bookTitle: firstBook?.title ?? '',
      aladinBook: firstBook?.aladin ?? null,
      books: normalizedBooks,
      startPage: firstBook?.startPage,
      targetPage: firstBook?.targetPage,
      selectedMetrics: normalizeReadingMetricSelection(persisted.selectedMetrics),
      summary,
    });
  }, [books, dataConfig, displayName, summary]);

  useEffect(() => {
    const serialized = JSON.stringify(draftReading);
    if (lastPushedRef.current === serialized) return;
    lastPushedRef.current = serialized;
    onChangeDataConfig(draftReading);
  }, [draftReading, onChangeDataConfig]);

  const filteredBooks = useMemo(
    () => books.filter((book) => bookMatchesTab(book, activeTab)),
    [activeTab, books],
  );

  const detailBook = useMemo(
    () => (detailBookId ? books.find((book) => book.id === detailBookId) ?? null : null),
    [books, detailBookId],
  );

  const addManualBook = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBooks((prev) => [
      ...prev,
      {
        id: makeReadingBookId(),
        title: trimmed,
        startPage: 1,
        targetPage: 100,
        status: activeTab === 'done' ? 'done' : 'reading',
      },
    ]);
  };

  const addAladinBook = (book: AladinBookDetail) => {
    setBooks((prev) => [
      ...prev,
      {
        id: makeReadingBookId(),
        title: book.title,
        startPage: 1,
        targetPage: book.totalPages && book.totalPages > 0 ? book.totalPages : 100,
        status: activeTab === 'done' ? 'done' : 'reading',
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
    if (detailBookId === id) setDetailBookId(null);
  };

  const aladinEnabled = isAladinApiConfigured();

  return (
    <View style={styles.root}>
      <View style={styles.libraryCanvas}>
        <View style={styles.libraryHeader}>
          <View style={styles.libraryHeaderLeft}>
            <ThemedText style={[styles.libraryTitle, { color: c.onSurface }]}>내 서재</ThemedText>
            <ThemedText style={[styles.libraryCount, { color: c.onVariant }]}>
              {books.length}권
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="도서 추가"
              onPress={() => setAddSheetVisible(true)}
              style={[styles.headerIconBtn, { borderColor: c.onSurface }]}>
              <IconSymbol name="plus" size={15} color={c.onSurface} />
            </Pressable>
            {aladinEnabled ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="도서 검색"
                onPress={() => setSearchSheetVisible(true)}
                style={[styles.headerIconBtn, { borderColor: c.onSurface }]}>
                <IconSymbol name="magnifyingglass" size={15} color={c.onSurface} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: c.outlineVariant }]}>
          {LIBRARY_TABS.map((tab) => {
            const on = activeTab === tab.key;
            const count = countBooksForTab(books, tab.key);
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabItem}>
                <ThemedText
                  style={[
                    styles.tabLabel,
                    { color: on ? c.onSurface : c.onVariant, fontWeight: on ? '800' : '600' },
                  ]}>
                  {tab.label} ({count})
                </ThemedText>
                <View
                  style={[
                    styles.tabUnderline,
                    { backgroundColor: on ? c.onSurface : 'transparent' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {filteredBooks.length > 0 ? (
          <View style={[styles.listShell, { borderColor: c.outlineVariant }]}>
            {filteredBooks.map((entry, index) => (
              <ReadingBookListRow
                key={entry.id}
                entry={entry}
                palette={palette}
                isDark={isDark}
                onPress={() => setDetailBookId(entry.id)}
                showDivider={index > 0}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyTitle, { color: c.onSurface }]}>
              {activeTab === 'all' ? '아직 담긴 책이 없어요' : '이 목록에 책이 없어요'}
            </ThemedText>
            <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}>
              우측 상단 + 또는 검색으로 책을 추가해 주세요.
            </ThemedText>
          </View>
        )}
      </View>

      <ReadingBookDetailSheet
        visible={detailBookId != null}
        entry={detailBook}
        palette={palette}
        onClose={() => setDetailBookId(null)}
        onChange={(next) => {
          if (!detailBookId) return;
          updateBook(detailBookId, next);
        }}
        onRemove={() => {
          if (!detailBookId) return;
          removeBook(detailBookId);
        }}
      />

      <ReadingAddBookSheet
        visible={addSheetVisible}
        palette={palette}
        aladinEnabled={aladinEnabled}
        onClose={() => setAddSheetVisible(false)}
        onAddManual={addManualBook}
        onOpenSearch={() => setSearchSheetVisible(true)}
      />

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
  root: { gap: 0, width: '100%' },
  libraryCanvas: { gap: 0, width: '100%' },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 14,
  },
  libraryHeaderLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  libraryTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  libraryCount: { fontSize: 14, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  tabRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
    minHeight: 44,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  tabUnderline: {
    height: 2,
    alignSelf: 'stretch',
    marginTop: 10,
    marginBottom: -StyleSheet.hairlineWidth,
  },

  listShell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 76,
  },
  listRowDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  listCover: { width: 42, height: 58 },
  listCoverFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  listBody: { flex: 1, minWidth: 0, gap: 3 },
  listTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, lineHeight: 20 },
  listAuthor: { fontSize: 12, fontWeight: '500' },
  listTrailing: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 28,
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },
});
