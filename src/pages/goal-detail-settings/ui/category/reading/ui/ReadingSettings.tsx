import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';


import {
  DEFAULT_READING_LIVE_ACTIVITY_CONFIG,
  bookMatchesReadingLibraryQuery,
  ensureReadingBookPages,
  getInitialReadingLiveActivityConfig,
  makeReadingBookId,
  normalizeReadingBookStatus,
  normalizeReadingLiveActivityConfig,
  resolveReadingBookAuthor,
  resolveReadingBookCoverUrl,
  SEED_READING_LITTLE_PRINCE_BOOK_ID,
  sortReadingBooksByAddedAt,
  type ReadingBookEntry,
  type ReadingBookStatus,
  type ReadingLibrarySortOrder,
  type ReadingLiveActivityConfig,
} from '@entities/day-plan';
import { BookSearchSheet, type BookSearchSelection } from './BookSearchSheet';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  clearReadingBookstoreSearchGuidePending,
  clearReadingBookstoreTapGuidePending,
  loadReadingBookstoreSearchGuidePending,
  loadReadingBookstoreTapGuidePending,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import {
  PostItCardShell,
  POST_IT_YELLOW_DARK,
  POST_IT_YELLOW_LIGHT,
} from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import { useGoalDetailSettingsPalette, type GoalDetailSettingsPalette } from '../../lib/settingsPalette';

import { ReadingAddBookSheet } from './ReadingAddBookSheet';
import { ReadingBookDetailSheet } from './ReadingBookDetailSheet';
import { ReadingBookstoreAtmosphere } from './ReadingBookstoreAtmosphere';
import {
  readingAccentOnInk,
  readingStatusDoneFace,
  readingStatusReadingFace,
} from '../lib/readingAccent';

import type { GoalDetailCategoryKey } from '../../../../model/types';

type SettingsPalette = GoalDetailSettingsPalette;

const HEADER_ICON_SHADOW = 2;
const LIST_ROW_SHADOW = 3;
const LIST_SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.14)';
const LIST_SOFT_SHADOW_DARK = 'rgba(0, 0, 0, 0.35)';

type LibraryTab = 'all' | ReadingBookStatus;

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

function nextLibrarySortOrder(order: ReadingLibrarySortOrder): ReadingLibrarySortOrder {
  return order === 'newest' ? 'oldest' : 'newest';
}

function ReadingBookListRow({
  entry,
  palette,
  isDark,
  onPress,
  statusLabelText,
}: {
  entry: ReadingBookEntry;
  palette: SettingsPalette;
  isDark: boolean;
  onPress: () => void;
  statusLabelText: string;
}) {
  const c = palette;
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const status = normalizeReadingBookStatus(entry.status);
  const author = resolveReadingBookAuthor(entry);
  const coverUrl = resolveReadingBookCoverUrl(entry);
  const softShadow = isDark ? LIST_SOFT_SHADOW_DARK : LIST_SOFT_SHADOW_LIGHT;
  const faceWhite = isDark ? tone.surfaceAlt : '#FFFFFF';
  const pagesLine = `${entry.startPage}P → ${entry.targetPage}P`;
  const statusFace =
    status === 'done'
      ? readingStatusDoneFace(isDark)
      : status === 'want'
        ? isDark
          ? 'rgba(255, 236, 179, 0.28)'
          : '#FFE8A8'
        : readingStatusReadingFace(isDark);
  const statusLabelColor =
    status === 'want' ? c.onSurface : readingAccentOnInk(isDark);

  return (
    <View
      style={[
        styles.listRowShell,
        {
          marginRight: LIST_ROW_SHADOW,
          marginBottom: LIST_ROW_SHADOW,
        },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.listRowShadow,
          {
            backgroundColor: softShadow,
            transform: [{ translateX: LIST_ROW_SHADOW }, { translateY: LIST_ROW_SHADOW }],
          },
        ]}
      />
      <View style={[styles.listRowFace, { backgroundColor: faceWhite }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={statusLabelText}
          onPress={() => {
            void Haptics.selectionAsync();
            onPress();
          }}
          style={styles.listRow}>
          {coverUrl ? (
            <View style={styles.listCoverFrame}>
              <Image source={{ uri: coverUrl }} style={styles.listCover} contentFit="cover" />
            </View>
          ) : (
            <View
              style={[
                styles.listCoverFrame,
                styles.listCoverFallback,
                { backgroundColor: c.surfaceLow },
              ]}>
              <IconSymbol name="book.closed.fill" size={18} color={c.outline} />
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
            ) : null}
            <View style={styles.listMetaChips}>
              <View style={[styles.statusChip, { backgroundColor: statusFace }]}>
                <ThemedText style={[styles.statusChipText, { color: statusLabelColor }]}>
                  {statusLabelText}
                </ThemedText>
              </View>
              <ThemedText style={[styles.pagesChipText, { color: c.onVariant }]} numberOfLines={1}>
                {pagesLine}
              </ThemedText>
            </View>
          </View>
          <View style={styles.listTrailing}>
            {status === 'done' ? (
              <IconSymbol name="checkmark.circle.fill" size={16} color={isDark ? '#FAFAFA' : '#111111'} />
            ) : null}
            <IconSymbol name="chevron.right" size={14} color={c.outline} />
          </View>
        </Pressable>
      </View>
    </View>
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
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = useGoalDetailSettingsPalette(isDark);
  const c = palette;
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const headerBtnFace = isDark ? tone.surfaceAlt : '#FFFFFF';

  const librarySortLabels = useMemo(
    (): Record<ReadingLibrarySortOrder, string> => ({
      newest: t('goalDetail.reading.sort.newest'),
      oldest: t('goalDetail.reading.sort.oldest'),
    }),
    [t],
  );

  const libraryTabs = useMemo(
    (): { key: LibraryTab; label: string }[] => [
      { key: 'all', label: t('goalDetail.reading.filter.all') },
      { key: 'reading', label: t('goalDetail.reading.filter.reading') },
      { key: 'done', label: t('goalDetail.reading.filter.done') },
    ],
    [t],
  );

  const readingStatusLabel = useCallback(
    (status: ReadingBookStatus) => {
      if (status === 'want') return t('goalDetail.reading.status.want');
      if (status === 'done') return t('goalDetail.reading.status.done');
      return t('goalDetail.reading.status.reading');
    },
    [t],
  );

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
  const [selectedMetrics, setSelectedMetrics] = useState(initialConfig.selectedMetrics);
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [listSearchActive, setListSearchActive] = useState(false);
  const [librarySortOrder, setLibrarySortOrder] = useState<ReadingLibrarySortOrder>('newest');
  const [showTapGuideNote, setShowTapGuideNote] = useState(false);
  const [showSearchGuideNote, setShowSearchGuideNote] = useState(false);

  const lastPushedRef = useRef<string | null>(JSON.stringify(initialConfig));
  const hydratedKeyRef = useRef<string | null>(JSON.stringify(initialConfig));
  const pendingLocalRef = useRef(false);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  onChangeDataConfigRef.current = onChangeDataConfig;

  const dismissTapGuide = useCallback(() => {
    clearReadingBookstoreTapGuidePending();
    setShowTapGuideNote(false);
  }, []);

  const dismissSearchGuide = useCallback(() => {
    clearReadingBookstoreSearchGuidePending();
    setShowSearchGuideNote(false);
  }, []);

  useEffect(() => {
    const next = normalizeReadingLiveActivityConfig(dataConfig);
    const key = JSON.stringify(next);
    if (key === lastPushedRef.current || key === hydratedKeyRef.current) {
      pendingLocalRef.current = false;
      hydratedKeyRef.current = key;
      lastPushedRef.current = key;
      return;
    }
    // 로컬 편집을 부모에 올리는 중이면 디스크로 다시 덮지 않음
    if (pendingLocalRef.current) return;
    hydratedKeyRef.current = key;
    lastPushedRef.current = key;
    setDisplayName(next.displayName ?? '');
    setBooks(next.books.map((book) => ensureReadingBookPages(book)));
    setSummary(next.summary ?? '');
    setSelectedMetrics(next.selectedMetrics);
  }, [dataConfig]);

  useEffect(() => {
    setShowSearchGuideNote(loadReadingBookstoreSearchGuidePending());
  }, [books.length]);

  useEffect(() => {
    const hasSeed = books.some((book) => book.id === SEED_READING_LITTLE_PRINCE_BOOK_ID);
    const pending = loadReadingBookstoreTapGuidePending();
    if (!hasSeed || !pending) {
      if (!pending) setShowTapGuideNote(false);
      return;
    }
    setShowTapGuideNote(true);
  }, [books]);

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
      selectedMetrics,
      summary,
    });
  }, [books, displayName, selectedMetrics, summary]);

  useEffect(() => {
    const serialized = JSON.stringify(draftReading);
    if (lastPushedRef.current === serialized) {
      pendingLocalRef.current = false;
      return;
    }
    lastPushedRef.current = serialized;
    pendingLocalRef.current = true;
    onChangeDataConfigRef.current(draftReading);
  }, [draftReading]);

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
      <ReadingBookstoreAtmosphere isDark={isDark} />
      <View style={styles.libraryCanvas}>
        <View style={styles.libraryHeader}>
          <View style={styles.libraryHeaderLeft}>
            <ThemedText style={[styles.libraryTitle, { color: c.onSurface }]}>
              {t('goalDetail.reading.library')}
            </ThemedText>
            <ThemedText style={[styles.libraryCount, { color: c.onVariant }]}>
              {t('goalDetail.reading.bookCount', { count: books.length })}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            {showSearchGuideNote ? (
              <View
                style={styles.searchGuideNoteWrap}
                pointerEvents="none"
                accessibilityRole="text">
                <PostItCardShell
                  isDark={isDark}
                  compact
                  faceColor={isDark ? POST_IT_YELLOW_DARK : POST_IT_YELLOW_LIGHT}
                  shadowColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'}
                  contentStyle={styles.searchGuideNoteContent}>
                  <ThemedText
                    style={[
                      styles.searchGuideNoteText,
                      { color: isDark ? 'rgba(255,255,255,0.92)' : '#1A1A1A' },
                    ]}>
                    {t('goalDetail.reading.searchGuideNote')}
                  </ThemedText>
                </PostItCardShell>
              </View>
            ) : null}
            <View
              style={[
                styles.headerIconShell,
                { marginRight: HEADER_ICON_SHADOW, marginBottom: HEADER_ICON_SHADOW },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.headerIconShadow,
                  {
                    backgroundColor: shadowInk,
                    transform: [
                      { translateX: HEADER_ICON_SHADOW },
                      { translateY: HEADER_ICON_SHADOW },
                    ],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('goalDetail.reading.addBook')}
                onPress={() => setAddSheetVisible(true)}
                style={[styles.headerIconBtn, { backgroundColor: headerBtnFace }]}>
                <IconSymbol name="plus" size={15} color={c.onSurface} />
              </Pressable>
            </View>
            {searchEnabled ? (
              <View
                style={[
                  styles.headerIconShell,
                  { marginRight: HEADER_ICON_SHADOW, marginBottom: HEADER_ICON_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.headerIconShadow,
                    {
                      backgroundColor: shadowInk,
                      transform: [
                        { translateX: HEADER_ICON_SHADOW },
                        { translateY: HEADER_ICON_SHADOW },
                      ],
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('goalDetail.reading.searchBook')}
                  onPress={() => {
                    dismissSearchGuide();
                    setSearchSheetVisible(true);
                  }}
                  style={[styles.headerIconBtn, { backgroundColor: headerBtnFace }]}>
                  <IconSymbol name="magnifyingglass" size={15} color={c.onSurface} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: c.outlineVariant }]}>
          {libraryTabs.map((tab) => {
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
              accessibilityLabel={t('goalDetail.reading.sortA11y', {
                sort: librarySortLabels[librarySortOrder],
              })}
              hitSlop={8}
              onPress={() => {
                void Haptics.selectionAsync();
                setLibrarySortOrder((order) => nextLibrarySortOrder(order));
              }}
              style={styles.listSortTrigger}>
              <ThemedText style={[styles.listMetaText, { color: c.onVariant }]}>
                {librarySortLabels[librarySortOrder]}
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
                  <ThemedTextInput
                    value={libraryQuery}
                    onChangeText={setLibraryQuery}
                    placeholder={t('goalDetail.reading.searchPlaceholder')}
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
                    accessibilityLabel={t('goalDetail.reading.closeSearch')}
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
                  accessibilityLabel={t('goalDetail.reading.searchList')}
                  hitSlop={8}
                  onPress={() => setListSearchActive(true)}
                  style={styles.listSearchTriggerBtn}>
                  <ThemedText style={[styles.listSearchTrigger, { color: c.onVariant }]}>
                    {t('goalDetail.reading.search')}
                  </ThemedText>
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
            <View style={styles.listShell}>
              {showTapGuideNote ? (
                <View style={styles.tapGuideNoteWrap} accessibilityRole="text">
                  <PostItCardShell
                    isDark={isDark}
                    compact
                    faceColor={isDark ? POST_IT_YELLOW_DARK : POST_IT_YELLOW_LIGHT}
                    shadowColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'}
                    contentStyle={styles.tapGuideNoteContent}>
                    <ThemedText
                      style={[
                        styles.tapGuideNoteText,
                        { color: isDark ? 'rgba(255,255,255,0.92)' : '#1A1A1A' },
                      ]}>
                      {t('goalDetail.reading.tapGuideNote')}
                    </ThemedText>
                  </PostItCardShell>
                </View>
              ) : null}
              {displayBooks.map((entry) => (
                <ReadingBookListRow
                  key={entry.id}
                  entry={entry}
                  palette={palette}
                  isDark={isDark}
                  onPress={() => {
                    dismissTapGuide();
                    setDetailBookId(entry.id);
                  }}
                  statusLabelText={readingStatusLabel(normalizeReadingBookStatus(entry.status))}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={[styles.emptyTitle, { color: c.onSurface }]}>
                {libraryQuery.trim().length > 0
                  ? t('goalDetail.reading.emptySearch')
                  : activeTab === 'all'
                    ? t('goalDetail.reading.emptyLibrary')
                    : t('goalDetail.reading.emptyFilter')}
              </ThemedText>
              {libraryQuery.trim().length > 0 ? (
                <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}>
                  {t('goalDetail.reading.emptySearchHint')}
                </ThemedText>
              ) : (
                <View style={styles.emptyBodyRow}>
                  <IconSymbol name="plus" size={13} color={c.onVariant} />
                  <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}>
                    {' '}{t('goalDetail.reading.emptyAddHint1')}{' '}
                  </ThemedText>
                  <IconSymbol name="magnifyingglass" size={13} color={c.onVariant} />
                  <ThemedText style={[styles.emptyBody, { color: c.onVariant }]}>
                    {' '}{t('goalDetail.reading.emptyAddHint2')}
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
        isDark={isDark}
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
  root: { flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' },
  libraryCanvas: { flex: 1, minHeight: 0, width: '100%', zIndex: 1 },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 14,
  },
  libraryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  libraryTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  libraryCount: { fontSize: 14, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  searchGuideNoteWrap: {
    transform: [{ rotate: '-2deg' }],
  },
  searchGuideNoteContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 132,
  },
  searchGuideNoteText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  headerIconShell: {
    position: 'relative',
  },
  headerIconShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    zIndex: 1,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },

  listShell: {
    gap: 10,
  },
  tapGuideNoteWrap: {
    alignSelf: 'flex-start',
    marginBottom: 2,
    transform: [{ rotate: '-1.5deg' }],
  },
  tapGuideNoteContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 220,
  },
  tapGuideNoteText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  listRowShell: {
    position: 'relative',
  },
  listRowShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  listRowFace: {
    borderWidth: 0,
    borderRadius: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 88,
  },
  listCoverFrame: {
    width: 52,
    height: 72,
    borderWidth: 0,
    overflow: 'hidden',
  },
  listCover: { width: '100%', height: '100%' },
  listCoverFallback: { alignItems: 'center', justifyContent: 'center' },
  listBody: { flex: 1, minWidth: 0, gap: 4 },
  listTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, lineHeight: 20 },
  listAuthor: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  listMetaChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  statusChip: {
    borderWidth: 0,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusChipText: { fontSize: 10, fontWeight: '800', letterSpacing: -0.1 },
  pagesChipText: { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
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
