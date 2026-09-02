import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AladinAttributionLine,
  AladinApiError,
  openAladinProductPage,
  resolveAladinBookDetail,
  searchAladinBooks,
  type AladinBookDetail,
} from '@features/aladin-book-search';
import {
  OpenLibraryAttributionLine,
  OpenLibraryApiError,
  openOpenLibraryBookPage,
  resolveOpenLibraryBookDetail,
  searchOpenLibraryBooks,
  type OpenLibraryBookDetail,
  type OpenLibrarySearchBookItem,
} from '@features/open-library-book-search';
import { isAladinApiConfigured } from '@shared/config/aladin';
import {
  bookSearchProviderLabel,
  isBookSearchAvailable,
  resolveBookSearchProvider,
  type BookSearchProvider,
} from '@shared/lib/bookSearch/resolveBookSearchProvider';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

export type BookSearchSelection =
  | { source: 'aladin'; book: AladinBookDetail }
  | { source: 'openlibrary'; book: OpenLibraryBookDetail };

type UnifiedBookSearchItem = {
  key: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl: string;
  link: string;
  pubDate: string;
  source: 'aladin' | 'openlibrary';
  aladinItem?: AladinBookDetail;
  openLibraryItem?: OpenLibraryBookDetail;
};

type UnifiedBookSearchDetail = UnifiedBookSearchItem & {
  totalPages?: number;
  description: string;
};

type SheetMode = 'search' | 'detail';

type Props = {
  visible: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onSelect: (selection: BookSearchSelection) => void;
};

function mapAladinItem(item: AladinBookDetail): UnifiedBookSearchItem {
  return {
    key: `aladin:${item.itemId}`,
    title: item.title,
    author: item.author,
    publisher: item.publisher,
    coverUrl: item.coverUrl,
    link: item.link,
    pubDate: item.pubDate,
    source: 'aladin',
    aladinItem: item,
  };
}

function mapOpenLibraryItem(item: OpenLibrarySearchBookItem): UnifiedBookSearchItem {
  return {
    key: `openlibrary:${item.workKey}`,
    title: item.title,
    author: item.author,
    publisher: '',
    coverUrl: item.coverUrl,
    link: item.link,
    pubDate: item.publishYear ?? '',
    source: 'openlibrary',
    openLibraryItem: item,
  };
}

function toUnifiedDetail(
  item: UnifiedBookSearchItem,
  detail: AladinBookDetail | OpenLibraryBookDetail,
): UnifiedBookSearchDetail {
  return {
    ...item,
    title: detail.title,
    author: detail.author,
    coverUrl: detail.coverUrl,
    link: detail.link,
    totalPages: detail.totalPages,
    description: detail.description,
    publisher: 'publisher' in detail ? detail.publisher : '',
    pubDate: 'pubDate' in detail ? detail.pubDate : detail.publishYear ?? '',
  };
}

export function BookSearchSheet({ visible, ink, muted, surface, line, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const aladinConfigured = useMemo(() => isAladinApiConfigured(), []);

  const [mode, setMode] = useState<SheetMode>('search');
  const [query, setQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<BookSearchProvider>('openlibrary');
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<UnifiedBookSearchItem[]>([]);
  const [previewDetail, setPreviewDetail] = useState<UnifiedBookSearchDetail | null>(null);

  const resetSheet = useCallback(() => {
    setMode('search');
    setQuery('');
    setActiveProvider('openlibrary');
    setLastSubmittedQuery('');
    setResults([]);
    setPreviewDetail(null);
    setErrorMessage(null);
    setDetailErrorMessage(null);
    setLoading(false);
    setDetailLoading(false);
    setConfirming(false);
  }, []);

  useEffect(() => {
    if (!visible) resetSheet();
  }, [resetSheet, visible]);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setErrorMessage(t('goalDetail.bookSearch.needQuery'));
      return;
    }

    const provider = resolveBookSearchProvider(trimmed);
    setActiveProvider(provider);

    if (!isBookSearchAvailable(provider, aladinConfigured)) {
      setErrorMessage(t('goalDetail.bookSearch.noAladinKey'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResults([]);
    setLastSubmittedQuery(trimmed);

    try {
      if (provider === 'aladin') {
        const result = await searchAladinBooks(trimmed, { maxResults: 12 });
        setResults(result.items.map(mapAladinItem));
        if (result.items.length === 0) {
          setErrorMessage(t('goalDetail.bookSearch.noResults'));
        }
        return;
      }

      const result = await searchOpenLibraryBooks(trimmed, { limit: 12 });
      setResults(result.items.map(mapOpenLibraryItem));
      if (result.items.length === 0) {
        setErrorMessage(t('goalDetail.bookSearch.noResults'));
      }
    } catch (error: unknown) {
      setResults([]);
      if (error instanceof AladinApiError || error instanceof OpenLibraryApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(t('goalDetail.bookSearch.error'));
    } finally {
      setLoading(false);
    }
  }, [aladinConfigured, query, t]);

  const openDetail = useCallback(async (item: UnifiedBookSearchItem) => {
    setMode('detail');
    setPreviewDetail(null);
    setDetailErrorMessage(null);
    setDetailLoading(true);
    setActiveProvider(item.source);

    try {
      if (item.source === 'aladin' && item.aladinItem) {
        const detail = await resolveAladinBookDetail(item.aladinItem);
        setPreviewDetail(toUnifiedDetail(item, detail));
        return;
      }

      if (item.source === 'openlibrary' && item.openLibraryItem) {
        const detail = await resolveOpenLibraryBookDetail(item.openLibraryItem);
        setPreviewDetail(toUnifiedDetail(item, detail));
        return;
      }

      setDetailErrorMessage(t('goalDetail.bookSearch.detailError'));
    } catch (error: unknown) {
      if (error instanceof AladinApiError || error instanceof OpenLibraryApiError) {
        setDetailErrorMessage(error.message);
        return;
      }
      setDetailErrorMessage(t('goalDetail.bookSearch.detailError'));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  const handleConfirmSelect = useCallback(async () => {
    if (!previewDetail) return;

    setConfirming(true);
    setDetailErrorMessage(null);
    try {
      if (previewDetail.source === 'aladin' && previewDetail.aladinItem) {
        const detail = await resolveAladinBookDetail(previewDetail.aladinItem);
        onSelect({ source: 'aladin', book: detail });
      } else if (previewDetail.openLibraryItem) {
        const detail = await resolveOpenLibraryBookDetail(previewDetail.openLibraryItem);
        onSelect({ source: 'openlibrary', book: detail });
      }
      onClose();
    } catch (error: unknown) {
      if (error instanceof AladinApiError || error instanceof OpenLibraryApiError) {
        setDetailErrorMessage(error.message);
        return;
      }
      setDetailErrorMessage(t('goalDetail.bookSearch.addError'));
    } finally {
      setConfirming(false);
    }
  }, [onClose, onSelect, previewDetail, t]);

  const handleBackToSearch = useCallback(() => {
    setMode('search');
    setPreviewDetail(null);
    setDetailErrorMessage(null);
    setDetailLoading(false);
    setConfirming(false);
  }, []);

  const externalLinkLabel =
    activeProvider === 'aladin'
      ? t('goalDetail.bookSearch.viewOnAladin')
      : t('goalDetail.bookSearch.viewOnOpenLibrary');

  const openExternalLink = useCallback(() => {
    if (!previewDetail?.link) return;
    if (previewDetail.source === 'aladin') {
      void openAladinProductPage(previewDetail.link);
      return;
    }
    void openOpenLibraryBookPage(previewDetail.link);
  }, [previewDetail]);

  const searchAvailable = aladinConfigured || true;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          {mode === 'detail' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.bookSearch.backToResults')}
              onPress={handleBackToSearch}
              hitSlop={10}
              style={styles.headerBackBtn}>
              <IconSymbol name="chevron.left" size={18} color={ink} />
            </Pressable>
          ) : null}
          <ThemedText style={[styles.title, { color: ink }]}>
            {mode === 'detail' ? t('goalDetail.bookSearch.detailTitle') : t('goalDetail.bookSearch.searchTitle')}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('dayPlan.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {!searchAvailable ? (
            <View style={styles.centerBox}>
              <ThemedText style={[styles.helper, { color: muted }]}>
                {t('goalDetail.bookSearch.unavailable')}
              </ThemedText>
            </View>
          ) : mode === 'search' ? (
            <>
              <View style={styles.searchControls}>
                <View style={[styles.searchRow, { borderColor: line, backgroundColor: surface }]}>
                  <IconSymbol name="magnifyingglass" size={18} color={muted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('goalDetail.bookSearch.placeholder')}
                    placeholderTextColor={muted}
                    autoFocus
                    returnKeyType="search"
                    onSubmitEditing={() => void runSearch()}
                    style={[styles.searchInput, { color: ink }]}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('goalDetail.bookSearch.searchTitle')}
                  disabled={loading}
                  onPress={() => void runSearch()}
                  style={({ pressed }) => [
                    styles.searchSubmitBtn,
                    { borderColor: ink, backgroundColor: ink },
                    (loading || pressed) && { opacity: 0.72 },
                  ]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={surface} />
                  ) : (
                    <ThemedText style={[styles.searchSubmitText, { color: surface }]}>
                      {t('common.search')}
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              {errorMessage ? (
                <ThemedText style={[styles.helper, { color: muted }]}>{errorMessage}</ThemedText>
              ) : lastSubmittedQuery.length === 0 ? (
                <ThemedText style={[styles.helper, { color: muted }]}>
                  {t('goalDetail.bookSearch.enterHint')}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.helper, { color: muted }]}>
                  {t('goalDetail.bookSearch.resultsFor', {
                    provider: bookSearchProviderLabel(activeProvider),
                  })}
                </ThemedText>
              )}

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                {results.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.bookSearch.detailA11y', { title: item.title })}
                    onPress={() => void openDetail(item)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      { borderBottomColor: line },
                      pressed && { opacity: 0.72 },
                    ]}>
                    {item.coverUrl ? (
                      <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />
                    ) : (
                      <View style={[styles.cover, styles.coverFallback, { borderColor: line }]}>
                        <IconSymbol name="book.closed.fill" size={18} color={muted} />
                      </View>
                    )}
                    <View style={styles.resultText}>
                      <ThemedText style={[styles.resultTitle, { color: ink }]} numberOfLines={2}>
                        {item.title}
                      </ThemedText>
                      <ThemedText style={[styles.resultMeta, { color: muted }]} numberOfLines={1}>
                        {[item.author, item.publisher].filter(Boolean).join(' · ') || t('common.none')}
                      </ThemedText>
                    </View>
                    <IconSymbol name="chevron.right" size={14} color={muted} />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.detailContent,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}>
              {detailLoading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="small" color={ink} />
                  <ThemedText style={[styles.helper, { color: muted }]}>
                    {t('goalDetail.bookSearch.loadingDetail')}
                  </ThemedText>
                </View>
              ) : previewDetail ? (
                <>
                  <View style={styles.detailHero}>
                    {previewDetail.coverUrl ? (
                      <Image
                        source={{ uri: previewDetail.coverUrl }}
                        style={styles.detailCover}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.detailCover, styles.coverFallback, { borderColor: line }]}>
                        <IconSymbol name="book.closed.fill" size={28} color={muted} />
                      </View>
                    )}
                    <View style={styles.detailTextBlock}>
                      <ThemedText style={[styles.detailTitle, { color: ink }]}>{previewDetail.title}</ThemedText>
                      {previewDetail.author ? (
                        <ThemedText style={[styles.detailMeta, { color: muted }]}>
                          {previewDetail.author}
                        </ThemedText>
                      ) : null}
                      {previewDetail.publisher ? (
                        <ThemedText style={[styles.detailMeta, { color: muted }]}>
                          {previewDetail.publisher}
                        </ThemedText>
                      ) : null}
                      {previewDetail.pubDate ? (
                        <ThemedText style={[styles.detailMeta, { color: muted }]}>
                          {t('goalDetail.bookSearch.published', { date: previewDetail.pubDate })}
                        </ThemedText>
                      ) : null}
                      {previewDetail.totalPages ? (
                        <ThemedText style={[styles.detailMeta, { color: muted }]}>
                          {t('goalDetail.bookSearch.totalPages', { pages: previewDetail.totalPages })}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>

                  {previewDetail.description ? (
                    <ThemedText style={[styles.detailDescription, { color: muted }]}>
                      {previewDetail.description}
                    </ThemedText>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={externalLinkLabel}
                    onPress={openExternalLink}
                    style={({ pressed }) => [styles.secondaryBtn, { borderColor: line }, pressed && { opacity: 0.72 }]}>
                    <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>{externalLinkLabel}</ThemedText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.bookSearch.selectA11y')}
                    disabled={confirming}
                    onPress={() => void handleConfirmSelect()}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { borderColor: ink, backgroundColor: ink },
                      (confirming || pressed) && { opacity: 0.72 },
                    ]}>
                    {confirming ? (
                      <ActivityIndicator size="small" color={surface} />
                    ) : (
                      <ThemedText style={[styles.primaryBtnText, { color: surface }]}>
                        {t('goalDetail.bookSearch.selectBook')}
                      </ThemedText>
                    )}
                  </Pressable>
                </>
              ) : (
                <View style={styles.centerBox}>
                  <ThemedText style={[styles.helper, { color: muted }]}>
                    {detailErrorMessage ?? t('goalDetail.bookSearch.detailError')}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.bookSearch.backToResults')}
                    onPress={handleBackToSearch}
                    style={({ pressed }) => [styles.secondaryBtn, { borderColor: line }, pressed && { opacity: 0.72 }]}>
                    <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>
                      {t('goalDetail.bookSearch.backToResults')}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <AladinAttributionLine color={muted} compact />
            <OpenLibraryAttributionLine color={muted} compact />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerBackBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  searchControls: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 10,
  },
  searchSubmitBtn: {
    minWidth: 72,
    minHeight: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  searchSubmitText: {
    fontSize: 14,
    fontWeight: '800',
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cover: {
    width: 44,
    height: 62,
    backgroundColor: '#f3f4f6',
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  resultText: { flex: 1, minWidth: 0, gap: 4 },
  resultTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  resultMeta: { fontSize: 12, fontWeight: '500' },
  detailContent: {
    gap: 16,
  },
  detailHero: {
    flexDirection: 'row',
    gap: 14,
  },
  detailCover: {
    width: 92,
    height: 132,
    backgroundColor: '#f3f4f6',
  },
  detailTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingTop: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  detailMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  secondaryBtn: {
    minHeight: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    minHeight: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 4,
  },
});
