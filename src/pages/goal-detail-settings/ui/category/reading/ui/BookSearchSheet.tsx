import { BookExtras } from '@features/yes24-book-search/CatalogActions';
import { getYes24DisplayTitle } from '@features/yes24-book-search/displayTitle';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { PaperGrain } from '@shared/ui/paper-grain';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { AppModal as Modal } from '@shared/ui/app-modal';
import { Image } from 'expo-image';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  resolveYes24BookDetail,
  searchYes24Books,
  type Yes24BookDetail,
  type Yes24SearchBookItem,
} from '@features/yes24-book-search';
import { RetroFlatColors, SOLID_SHADOW_OFFSET } from '@shared/config/retroFlat';
import { containsHangul } from '@shared/lib/bookSearch/resolveBookSearchProvider';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import {
  READING_ACCENT,
  READING_ACCENT_ON,
} from '../lib/readingAccent';

export type BookSearchSelection = { source: 'yes24'; book: Yes24BookDetail };

type UnifiedBookSearchItem = Yes24SearchBookItem & { key: string };
type UnifiedBookSearchDetail = UnifiedBookSearchItem;

type SheetMode = 'search' | 'detail';

const SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.10)';
const SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.10)';
const SEARCH_SOFT_OFFSET = 1;

type Props = {
  initialBook?: Yes24SearchBookItem | null;
  diaryStyle?: boolean;
  visible: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onDismiss?: () => void;
  onSelect: (selection: BookSearchSelection) => void;
};

function mapYes24Item(item: Yes24SearchBookItem): UnifiedBookSearchItem {
  return { ...item, key: `yes24:${item.itemId}` };
}

export function BookSearchSheet({ initialBook, diaryStyle, visible, ink, muted, surface, line, onClose, onDismiss, onSelect }: Props) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = !diaryStyle && scheme === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const faceWhite = isDark ? '#30342F' : '#FCFBF7';
  const pencil = isDark ? '#A2B0A5' : '#8B9589';
  const softShadow = isDark ? SOFT_SHADOW_DARK : SOFT_SHADOW_LIGHT;
  const searchCtaFill = diaryStyle ? surface : READING_ACCENT;
  const searchCtaLabel = diaryStyle ? ink : READING_ACCENT_ON;
  const searchCtaDisabledFill = isDark ? '#6C8D83' : '#DEEBE4';

  const [mode, setMode] = useState<SheetMode>('search');
  const [query, setQuery] = useState('');
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<UnifiedBookSearchItem[]>([]);
  const [previewDetail, setPreviewDetail] = useState<UnifiedBookSearchDetail | null>(null);

  const detailRequest = useRef(0);
  const resetSheet = useCallback(() => {
    setMode('search');
    setQuery('');
    setLastSubmittedQuery('');
    setResults([]);
    setPreviewDetail(null);
    setErrorMessage(null);
    setDetailErrorMessage(null);
    setLoading(false);
    setDetailLoading(false);
    setConfirming(false);
  }, []);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setErrorMessage(t('goalDetail.bookSearch.needQuery'));
      return;
    }


    setLoading(true);
    setErrorMessage(null);
    setResults([]);
    setLastSubmittedQuery(trimmed);

    try {
      const category = containsHangul(trimmed) ? 'BOOK' : 'FOREIGN';
      const result = await searchYes24Books(trimmed, { category, locale });
      setResults(result.items.map(mapYes24Item));
      if (result.items.length === 0) {
        setErrorMessage(t('goalDetail.bookSearch.noResults'));
      }
    } catch {
      setResults([]);
      setErrorMessage(t('goalDetail.bookSearch.error'));
    } finally {
      setLoading(false);
    }
  }, [locale, query, t]);

  const detailErrorText = t('goalDetail.bookSearch.detailError');
  const openDetail = useCallback(async (item: UnifiedBookSearchItem) => {
    const request = ++detailRequest.current;
    Keyboard.dismiss();
    setMode('detail');
    setPreviewDetail(null);
    setDetailErrorMessage(null);
    setDetailLoading(true);

    try {
      const detail = await resolveYes24BookDetail(item);
      if (request === detailRequest.current) setPreviewDetail(mapYes24Item(detail));
    } catch {
      if (request === detailRequest.current) setDetailErrorMessage(detailErrorText);
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }, [detailErrorText]);

  useLayoutEffect(() => {
    if (!visible) return;
    resetSheet();
    if (initialBook) void openDetail(mapYes24Item(initialBook));
    return () => { detailRequest.current++; };
  }, [initialBook, openDetail, resetSheet, visible]);

  const handleConfirmSelect = useCallback(async () => {
    if (!previewDetail) return;

    setConfirming(true);
    setDetailErrorMessage(null);
    try {
      onSelect({ source: 'yes24', book: previewDetail });
      onClose();
    } catch {

      setDetailErrorMessage(t('goalDetail.bookSearch.addError'));
    } finally {
      setConfirming(false);
    }
  }, [onClose, onSelect, previewDetail, t]);

  const handleBackToSearch = useCallback(() => {
    detailRequest.current++;
    setMode('search');
    setPreviewDetail(null);
    setDetailErrorMessage(null);
    setDetailLoading(false);
    setConfirming(false);
  }, []);

  const detailDisplay = previewDetail ? getYes24DisplayTitle(previewDetail.title, locale) : null;
  const externalLinkLabel = 'YES24';
  const openExternalLink = useCallback(() => {
    if (previewDetail?.link) void Linking.openURL(previewDetail.link).catch(() => undefined);
  }, [previewDetail]);

  return (
    <Modal visible={visible} nativeAnimation={diaryStyle ? "slide" : "none"} presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismiss}>
      <View style={[styles.sheet, { backgroundColor: isDark ? '#242923' : '#F8F7F2', paddingTop: insets.top + 12 }]}>
        <PaperGrain opacity={0.32} />
        <View style={[styles.header, { borderBottomColor: line }]}>
          {mode === 'detail' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.bookSearch.backToResults')}
              onPress={() => { tapHaptic(); if (initialBook) onClose(); else handleBackToSearch(); }}
              hitSlop={10}
              style={styles.headerBackBtn}>
              <IconSymbol name="chevron.left" size={18} color={ink} />
            </Pressable>
          ) : null}
          <ThemedText style={[styles.title, { color: ink }]}>
            {mode === 'detail' ? t('goalDetail.bookSearch.detailTitle') : t('goalDetail.bookSearch.searchTitle')}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('dayPlan.close')} onPress={onClose} style={styles.headerCloseBtn}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {mode === 'search' ? (
            <>
              <View style={styles.searchControls}>
                <View
                  style={[
                    styles.searchRowShell,
                    { marginRight: SEARCH_SOFT_OFFSET, marginBottom: SEARCH_SOFT_OFFSET, flex: 1 },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.searchRowShadow,
                      {
                        backgroundColor: diaryStyle ? 'transparent' : softShadow,
                        transform: [
                          { translateX: SEARCH_SOFT_OFFSET },
                          { translateY: SEARCH_SOFT_OFFSET },
                        ],
                      },
                    ]}
                  />
                  <View style={[styles.searchRow, { backgroundColor: diaryStyle ? 'transparent' : faceWhite }, diaryStyle && { borderBottomWidth: 1, borderBottomColor: pencil, borderRadius: 0 }]}>
                    <PaperGrain opacity={0.22} />
                    {!diaryStyle && <HanddrawnFrame color={pencil} />}
                    <IconSymbol name="magnifyingglass" size={18} color={muted} />
                    <ThemedTextInput
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
                </View>
                <View
                  style={[
                    styles.searchSubmitShell,
                    { marginRight: SEARCH_SOFT_OFFSET, marginBottom: SEARCH_SOFT_OFFSET },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.searchSubmitShadow,
                      {
                        backgroundColor: softShadow,
                        transform: [
                          { translateX: SEARCH_SOFT_OFFSET },
                          { translateY: SEARCH_SOFT_OFFSET },
                        ],
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.bookSearch.searchTitle')}
                    disabled={loading}
                    onPress={() => { tapHaptic(); void runSearch(); }}
                    style={[
                      styles.searchSubmitBtn,
                      {
                        backgroundColor: loading ? searchCtaDisabledFill : searchCtaFill,
                      },
                    ]}>
                    <PaperGrain opacity={0.22} />
                    <HanddrawnFrame color={pencil} />
                    {loading ? (
                      <ActivityIndicator size="small" color={searchCtaLabel} />
                    ) : (
                      <ThemedText style={[styles.searchSubmitText, { color: searchCtaLabel }]}>
                        {t('common.search')}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
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
                    provider: 'YES24',
                  })}
                </ThemedText>
              )}

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                {results.length > 0 && <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
                {results.map((item) => {
                  const display = getYes24DisplayTitle(item.title, locale);
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={t('goalDetail.bookSearch.detailA11y', { title: display.title })}
                      onPress={() => { tapHaptic(); void openDetail(item); }}
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
                          {display.title}
                        </ThemedText>
                        <ThemedText style={[styles.resultMeta, { color: muted }]} numberOfLines={1}>
                          {[display.editionLabel, item.author, item.publisher].filter(Boolean).join(' · ') || t('common.none')}
                        </ThemedText>
                      </View>
                      <IconSymbol name="chevron.right" size={14} color={muted} />
                    </Pressable>
                  );
                })}
                </Animated.View>}
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
                <Animated.View style={styles.detailActions} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
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
                      <ThemedText style={[styles.detailTitle, { color: ink }]}>{detailDisplay?.title ?? previewDetail.title}</ThemedText>
                      {detailDisplay?.editionLabel && (
                        <ThemedText style={[styles.resultMeta, { color: muted }]}>{detailDisplay.editionLabel}</ThemedText>
                      )}
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

                  {diaryStyle && <BookExtras key={previewDetail.itemId} itemId={previewDetail.itemId} />}
                  {previewDetail.description ? (
                    <ThemedText style={[styles.detailDescription, { color: muted }]}>
                      {previewDetail.description}
                    </ThemedText>
                  ) : null}

                  {previewDetail.link ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={externalLinkLabel}
                      onPress={() => { tapHaptic(); openExternalLink(); }}
                      style={({ pressed }) => [
                        styles.secondaryBtn, styles.paperAction,
                        { backgroundColor: faceWhite, opacity: pressed ? 0.82 : 1 },
                      ]}>
                      <PaperGrain opacity={0.5} />
                      <HanddrawnFrame color={pencil} />
                      <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>
                        {externalLinkLabel}
                      </ThemedText>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('goalDetail.bookSearch.selectA11y')}
                    accessibilityState={{ disabled: confirming, busy: confirming }}
                    disabled={confirming}
                    onPress={() => { tapHaptic('confirm'); void handleConfirmSelect(); }}
                    style={({ pressed }) => [
                      styles.secondaryBtn, styles.paperAction,
                      { backgroundColor: isDark ? '#3B4238' : '#E9DEC8', opacity: pressed ? 0.82 : 1 },
                    ]}>
                    <PaperGrain opacity={0.54} />
                    <HanddrawnFrame color={ink} />
                    {confirming ? <ActivityIndicator size="small" color={ink} /> : (
                      <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>
                        {t('goalDetail.bookSearch.selectBook')}
                      </ThemedText>
                    )}
                  </Pressable>
                </Animated.View>
              ) : (
                <View style={styles.centerBox}>
                  <ThemedText style={[styles.helper, { color: muted }]}>
                    {detailErrorMessage ?? t('goalDetail.bookSearch.detailError')}
                  </ThemedText>
                  <View
                    style={[
                      styles.btnShell,
                      {
                        marginRight: SOLID_SHADOW_OFFSET,
                        marginBottom: SOLID_SHADOW_OFFSET,
                        alignSelf: 'stretch',
                      },
                    ]}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.btnShadow,
                        {
                          backgroundColor: shadowInk,
                          transform: [
                            { translateX: SOLID_SHADOW_OFFSET },
                            { translateY: SOLID_SHADOW_OFFSET },
                          ],
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('goalDetail.bookSearch.backToResults')}
                      onPress={() => { tapHaptic(); if (initialBook) onClose(); else handleBackToSearch(); }}
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        {
                          backgroundColor: faceWhite,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}>
                      <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>
                        {t('goalDetail.bookSearch.backToResults')}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 12) }]}>
                          <ThemedText style={{ color: muted, fontSize: 12 }}>YES24</ThemedText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  detailActions: { gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchRowShell: {
    position: 'relative',
  },
  searchRowShadow: {
    ...StyleSheet.absoluteFill,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  searchSubmitShell: {
    position: 'relative',
  },
  searchSubmitShadow: {
    ...StyleSheet.absoluteFill,
  },
  searchSubmitBtn: {
    minWidth: 72,
    minHeight: 48,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  searchSubmitText: {
    fontSize: 14,
    fontWeight: '700',
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
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    zIndex: 1,
  },
  paperAction: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnShell: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  btnShadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 0,
  },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 4,
  },
});
