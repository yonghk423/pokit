import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  bookMatchesReadingLibraryQuery,
  ensureReadingBookPages,
  getInitialReadingLiveActivityConfig,
  makeReadingBookId,
  normalizeReadingBookStatus,
  normalizeReadingLiveActivityConfig,
  normalizeReadingMetricSelection,
  resolveReadingBookAuthor,
  resolveReadingBookCoverUrl,
  sortReadingBooksByAddedAt,
  type ReadingBookEntry,
  type ReadingBookStatus,
  type ReadingLibrarySortOrder,
  type ReadingLiveActivityConfig,
} from '@entities/day-plan';
import { BookSearchSheet, type BookSearchSelection } from './BookSearchSheet';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import { ReadingAddBookSheet } from './ReadingAddBookSheet';
import { ReadingBookDetailSheet } from './ReadingBookDetailSheet';

import type { GoalDetailCategoryKey } from '../../../../model/types';

const LIBRARY_SORT_LABELS: Record<ReadingLibrarySortOrder, string> = {
  newest: '최신순',
  oldest: '오래된순',
};

function nextLibrarySortOrder(order: ReadingLibrarySortOrder): ReadingLibrarySortOrder {
  return order === 'newest' ? 'oldest' : 'newest';
}

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
  const author = resolveReadingBookAuthor(entry);
  const coverUrl = resolveReadingBookCoverUrl(entry);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.listRow,
        showDivider && [styles.listRowDivider, { borderTopColor: c.outlineVariant }],
        pressed && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
      ]}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.listCover} contentFit="cover" />
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

  const initialConfig = useMemo(
    () => normalizeReadingLiveActivityConfig(dataConfig),
    // 마운트 시드용 — 이후 hydrate effect가 dataConfig 변경을 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [displayName, setDisplayName] = useState(initialConfig.displayName ?? '');
  const [books, setBooks] = useState<ReadingBookEntry[]>(() =>
    initialConfig.books.map((book) => ensureReadingBookPages(book)),
  );
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [summary, setSummary] = useState(initialConfig.summary ?? '');
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [listSearchActive, setListSearchActive] = useState(false);
  const [librarySortOrder, setLibrarySortOrder] = useState<ReadingLibrarySortOrder>('newest');

  const lastPushedRef = useRef<string | null>(JSON.stringify(initialConfig));
  const hydratedKeyRef = useRef<string | null>(JSON.stringify(initialConfig));

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

  const displayBooks = useMemo(() => {
    const tabbed = books.filter((book) => bookMatchesTab(book, activeTab));
    const sorted = sortReadingBooksByAddedAt(tabbed, librarySortOrder);
    const q = libraryQuery.trim();
    if (!q) return sorted;
    return sorted.filter((book) => bookMatchesReadingLibraryQuery(book, q));
  }, [activeTab, books, libraryQuery, librarySortOrder]);

  const detailBook = useMemo(
    () => (detailBookId ? books.find((book) => book.id === detailBookId) ?? null : null),
    [books, detailBookId],
  );

  const addManualBook = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = Date.now();
    setBooks((prev) => [
      {
        id: makeReadingBookId(),
        title: trimmed,
        startPage: 1,
        targetPage: 100,
        status: activeTab === 'done' ? 'done' : 'reading',
        addedAtMs: now,
      },
      ...prev,
    ]);
  };

  const addCatalogBook = (selection: BookSearchSelection) => {
    const now = Date.now();
    const base = {
      id: makeReadingBookId(),
      startPage: 1,
      status: (activeTab === 'done' ? 'done' : 'reading') as ReadingBookStatus,
      addedAtMs: now,
    };

    if (selection.source === 'aladin') {
      const book = selection.book;
      setBooks((prev) => [
        {
          ...base,
          title: book.title,
          targetPage: book.totalPages && book.totalPages > 0 ? book.totalPages : 100,
          aladin: {
            itemId: book.itemId,
            link: book.link,
            coverUrl: book.coverUrl,
            author: book.author,
            totalPages: book.totalPages,
          },
        },
        ...prev,
      ]);
      return;
    }

    const book = selection.book;
    setBooks((prev) => [
      {
        ...base,
        title: book.title,
        targetPage: book.totalPages && book.totalPages > 0 ? book.totalPages : 100,
        openLibrary: {
          workKey: book.workKey,
          editionKey: book.editionKey,
          link: book.link,
          coverUrl: book.coverUrl,
          author: book.author,
          totalPages: book.totalPages,
        },
      },
      ...prev,
    ]);
  };

  const updateBook = (id: string, next: ReadingBookEntry) => {
    setBooks((prev) => prev.map((book) => (book.id === id ? next : book)));
  };

  const removeBook = (id: string) => {
    setBooks((prev) => prev.filter((book) => book.id !== id));
    if (detailBookId === id) setDetailBookId(null);
  };

  const searchEnabled = true;

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
            {searchEnabled ? (
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

        {books.length > 0 ? (
          <View style={[styles.listMetaRow, { borderBottomColor: c.outlineVariant }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`정렬: ${LIBRARY_SORT_LABELS[librarySortOrder]}`}
              hitSlop={8}
              onPress={() => {
                void Haptics.selectionAsync();
                setLibrarySortOrder((order) => nextLibrarySortOrder(order));
              }}
              style={styles.listSortTrigger}>
              <ThemedText style={[styles.listMetaText, { color: c.onVariant }]}>
                {LIBRARY_SORT_LABELS[librarySortOrder]}
              </ThemedText>
              <IconSymbol name="arrow.up.arrow.down" size={13} color={c.onVariant} />
            </Pressable>
            <View
              style={[
                styles.listSearchSlot,
                (listSearchActive || libraryQuery.length > 0) && styles.listSearchSlotExpanded,
              ]}>
              {listSearchActive || libraryQuery.length > 0 ? (
                <>
                  <IconSymbol name="text.magnifyingglass" size={13} color={c.onVariant} />
                  <TextInput
                    value={libraryQuery}
                    onChangeText={setLibraryQuery}
                    placeholder="제목·작가"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                    returnKeyType="search"
                    autoFocus={listSearchActive}
                    onBlur={() => {
                      if (!libraryQuery.trim()) setListSearchActive(false);
                    }}
                    style={[styles.listSearchInputCompact, { color: c.onSurface }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="목록 검색 닫기"
                    hitSlop={8}
                    onPress={() => {
                      setLibraryQuery('');
                      setListSearchActive(false);
                    }}
                    style={styles.listSearchCloseBtn}>
                    <IconSymbol name="xmark" size={12} color={c.onVariant} />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="도서 목록 검색"
                  hitSlop={8}
                  onPress={() => setListSearchActive(true)}
                  style={styles.listSearchTriggerBtn}>
                  <ThemedText style={[styles.listSearchTrigger, { color: c.onVariant }]}>검색</ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {displayBooks.length > 0 ? (
            <View style={[styles.listShell, { borderColor: c.outlineVariant }]}>
              {displayBooks.map((entry, index) => (
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
                {libraryQuery.trim().length > 0
                  ? '검색 결과가 없어요'
                  : activeTab === 'all'
                    ? '아직 담긴 책이 없어요'
                    : '이 목록에 책이 없어요'}
              </ThemedText>
              {libraryQuery.trim().length > 0 ? (
                <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}>
                  다른 검색어로 다시 찾아 보세요.
                </ThemedText>
              ) : (
                <View style={styles.emptyBodyRow}>
                  <IconSymbol name="plus" size={13} color={c.onVariant} />
                  <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}> 또는 </ThemedText>
                  <IconSymbol name="magnifyingglass" size={13} color={c.onVariant} />
                  <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}>
                    {' '}을 눌러 검색을 해주세요
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
        searchEnabled={searchEnabled}
        onClose={() => setAddSheetVisible(false)}
        onAddManual={addManualBook}
        onOpenSearch={() => setSearchSheetVisible(true)}
      />

      <BookSearchSheet
        visible={searchSheetVisible}
        ink={c.onSurface}
        muted={c.onVariant}
        surface={c.surfaceLowest}
        line={c.outline}
        onClose={() => setSearchSheetVisible(false)}
        onSelect={addCatalogBook}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, width: '100%' },
  libraryCanvas: { flex: 1, minHeight: 0, width: '100%' },
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

  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listMetaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    flexShrink: 0,
  },
  listSortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    height: 32,
  },
  listSearchSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
    height: 32,
  },
  listSearchSlotExpanded: {
    justifyContent: 'flex-start',
  },
  listSearchTriggerBtn: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  listSearchTrigger: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    textDecorationLine: 'underline',
  },
  listSearchCloseBtn: {
    width: 24,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSearchInputCompact: {
    flex: 1,
    minWidth: 0,
    height: 32,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },

  listScroll: {
    flex: 1,
    minHeight: 0,
  },
  listScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
  emptyBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
