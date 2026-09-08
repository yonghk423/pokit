import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  deriveReadingBookProgress,
  ensureReadingBookPages,
  normalizeReadingBookMemo,
  normalizeReadingBookStatus,
  READING_BOOK_MEMO_MAX,
  readingBookExternalLinkLabel,
  resolveReadingBookAuthor,
  resolveReadingBookCatalogSource,
  resolveReadingBookCoverUrl,
  resolveReadingBookExternalLink,
  resolveReadingBookTotalPages,
  type ReadingBookEntry,
  type ReadingBookStatus,
} from '@entities/day-plan';
import { readingBookEntryToShareText } from '@entities/day-plan/lib/readingBookShareText';
import { AladinAttributionLine, openAladinProductPage } from '@features/aladin-book-search';
import { OpenLibraryAttributionLine, openOpenLibraryBookPage } from '@features/open-library-book-search';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const CHIP_SHADOW = 2;

function pageToInputValue(value: unknown, fallback: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.max(0, Math.round(value)));
  }
  return String(fallback);
}

type Props = {
  visible: boolean;
  entry: ReadingBookEntry | null;
  palette: Palette;
  onClose: () => void;
  onChange: (next: ReadingBookEntry) => void;
  onRemove: () => void;
};

export function ReadingBookDetailSheet({
  visible,
  entry,
  palette,
  onClose,
  onChange,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const faceWhite = isDark ? tone.surfaceAlt : '#FFFFFF';
  const { height: windowHeight } = useWindowDimensions();
  const c = palette;
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewportHeightRef = useRef(300);
  const memoSectionLayoutRef = useRef({ y: 0, height: 0 });
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isMemoFocused, setIsMemoFocused] = useState(false);

  const statusOptions = useMemo(
    (): { key: ReadingBookStatus; label: string }[] => [
      { key: 'want', label: t('goalDetail.reading.status.want') },
      { key: 'reading', label: t('goalDetail.reading.status.reading') },
      { key: 'done', label: t('goalDetail.reading.status.done') },
    ],
    [t],
  );

  const resolved = entry ? ensureReadingBookPages(entry) : null;
  const [startPageStr, setStartPageStr] = useState('1');
  const [targetPageStr, setTargetPageStr] = useState('100');
  const [memo, setMemo] = useState('');
  const [pageFieldFocus, setPageFieldFocus] = useState<'start' | 'target' | null>(null);

  // entry 식별자·저장된 페이지만 의존 — ensureReadingBookPages 결과 객체는 매 렌더 새로 생겨
  // 입력 중 값이 리셋되는 것을 막는다.
  useEffect(() => {
    if (!entry) return;
    const next = ensureReadingBookPages(entry);
    setStartPageStr(pageToInputValue(next.startPage, 1));
    setTargetPageStr(
      pageToInputValue(next.targetPage, resolveReadingBookTotalPages(next) ?? 100),
    );
    setMemo(next.memo ?? '');
  }, [entry?.id, entry?.startPage, entry?.targetPage, entry?.memo, entry?.totalPages]);

  useEffect(() => {
    if (!visible) {
      setKeyboardInset(0);
      setIsMemoFocused(false);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const scrollMemoIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const { y, height } = memoSectionLayoutRef.current;
      const viewportHeight = scrollViewportHeightRef.current;
      const targetY = y + height - viewportHeight + 32;
      scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
    });
  }, []);

  useEffect(() => {
    if (!visible || keyboardInset <= 0 || !isMemoFocused) return;
    const timer = setTimeout(() => scrollMemoIntoView(), Platform.OS === 'ios' ? 80 : 120);
    return () => clearTimeout(timer);
  }, [visible, keyboardInset, isMemoFocused, scrollMemoIntoView]);

  if (!entry || !resolved) return null;

  const sheetMaxHeight = Math.round(windowHeight * 0.88);

  const startPage = Math.max(0, parseInt(startPageStr, 10) || 0);
  const targetPage = Math.max(0, parseInt(targetPageStr, 10) || 0);
  const totalPages = resolveReadingBookTotalPages(entry);
  const { pagesRead, progressPct } = deriveReadingBookProgress({
    startPage,
    targetPage,
    totalPages,
  });
  const status = normalizeReadingBookStatus(entry.status);
  const metaLine = resolveReadingBookAuthor(entry) || null;
  const coverUrl = resolveReadingBookCoverUrl(entry);
  const externalLink = resolveReadingBookExternalLink(entry);
  const catalogSource = resolveReadingBookCatalogSource(entry);
  const externalLinkLabel = readingBookExternalLinkLabel(catalogSource);

  const commitPages = (nextStart: number, nextTarget: number) => {
    onChange(
      ensureReadingBookPages({
        ...entry,
        startPage: nextStart,
        targetPage: nextTarget,
      }),
    );
  };

  const setStatus = (nextStatus: ReadingBookStatus) => {
    onChange({ ...entry, status: nextStatus });
  };

  const commitMemo = () => {
    onChange({
      ...entry,
      memo: normalizeReadingBookMemo(memo),
    });
  };

  const shareBook = async () => {
    const shareEntry = ensureReadingBookPages({
      ...entry,
      startPage,
      targetPage,
      memo: normalizeReadingBookMemo(memo),
    });
    const message = readingBookEntryToShareText(shareEntry);
    try {
      await Share.share({
        message,
        title: entry.title,
      });
    } catch {
      Alert.alert(t('goalDetail.reading.shareFailTitle'), t('goalDetail.reading.shareFailBody'));
    }
  };

  const sheetBottomInset =
    keyboardInset > 0 ? 12 : Math.max(insets.bottom, 16);
  const effectiveSheetMaxHeight =
    keyboardInset > 0
      ? Math.min(sheetMaxHeight, windowHeight - keyboardInset - 16)
      : sheetMaxHeight;
  const effectiveScrollMaxHeight = Math.max(180, effectiveSheetMaxHeight - 72);
  scrollViewportHeightRef.current = effectiveScrollMaxHeight;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('dayPlan.close')} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surfaceLowest,
              borderColor: c.outline,
              marginBottom: keyboardInset > 0 ? keyboardInset : 0,
              paddingBottom: sheetBottomInset,
              maxHeight: effectiveSheetMaxHeight,
            },
          ]}>
            <View style={[styles.sheetHandle, { backgroundColor: c.outlineVariant }]} />

            <View style={styles.sheetHeader}>
              <ThemedText style={[styles.sheetTitle, { color: c.onSurface }]} numberOfLines={2}>
                {entry.title}
              </ThemedText>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('goalDetail.reading.shareA11y')}
                  onPress={() => {
                    void shareBook();
                  }}
                  hitSlop={8}
                  style={styles.headerActionBtn}>
                  <IconSymbol name="square.and.arrow.up" size={16} color={c.onSurface} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('dayPlan.close')}
                  onPress={onClose}
                  hitSlop={8}
                  style={styles.headerActionBtn}>
                  <IconSymbol name="xmark" size={14} color={c.onVariant} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={[styles.sheetScroll, { maxHeight: effectiveScrollMaxHeight }]}
              contentContainerStyle={[
                styles.sheetBody,
                keyboardInset > 0 && isMemoFocused && { paddingBottom: 56 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}>
            <View style={styles.bookHero}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.bookCover}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[styles.bookCover, styles.bookCoverFallback, { borderColor: c.outlineVariant }]}>
                  <IconSymbol name="book.closed.fill" size={22} color={c.outline} />
                </View>
              )}
              <View style={styles.bookHeroText}>
                {metaLine ? (
                  <ThemedText style={[styles.bookMeta, { color: c.onVariant }]} numberOfLines={2}>
                    {metaLine}
                  </ThemedText>
                ) : null}
                {externalLink && externalLinkLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (catalogSource === 'aladin') {
                        void openAladinProductPage(externalLink);
                        return;
                      }
                      void openOpenLibraryBookPage(externalLink);
                    }}
                    style={({ pressed }) => pressed && { opacity: 0.72 }}>
                    <ThemedText style={[styles.aladinLink, { color: c.onVariant }]}>
                      {externalLinkLabel}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.statusSection}>
              <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>
                {t('goalDetail.reading.statusLabel')}
              </ThemedText>
              <View style={styles.statusRow}>
                {statusOptions.map((opt) => {
                  const on = status === opt.key;
                  const shadow = on ? 3 : CHIP_SHADOW;
                  return (
                    <View
                      key={opt.key}
                      style={[
                        styles.chipShell,
                        { marginRight: shadow, marginBottom: shadow },
                      ]}>
                      <View
                        pointerEvents="none"
                        style={[
                          styles.chipShadow,
                          {
                            backgroundColor: shadowInk,
                            transform: [{ translateX: shadow }, { translateY: shadow }],
                          },
                        ]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        onPress={() => setStatus(opt.key)}
                        style={({ pressed }) => [
                          styles.statusChip,
                          {
                            backgroundColor: on ? tone.primaryContainer : faceWhite,
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}>
                        <ThemedText
                          style={{
                            fontSize: 12,
                            fontWeight: on ? '800' : '600',
                            color: on ? tone.primary : c.onVariant,
                          }}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.goalSection}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>
                {t('goalDetail.reading.todayGoal')}
              </ThemedText>
              <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
                {t('goalDetail.reading.todayGoalHint')}
              </ThemedText>

            <View style={styles.progressRow}>
              <ThemedText style={[styles.progressLine, { color: c.onSurface }]}>
                {startPage}P → {targetPage}P
              </ThemedText>
              <ThemedText style={[styles.progressSub, { color: c.onVariant }]}>
                {t('goalDetail.reading.pagesRead', { pages: pagesRead })}
                {totalPages != null
                  ? t('goalDetail.reading.bookProgress', { percent: progressPct })
                  : ''}
              </ThemedText>
            </View>
            {totalPages != null ? (
              <View style={[styles.progressTrack, { backgroundColor: c.outlineVariant }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPct}%`, backgroundColor: isDark ? tone.text : '#000000' },
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.pageFields}>
              {(
                [
                  {
                    key: 'start' as const,
                    label: t('goalDetail.reading.start'),
                    accent: false,
                    editable: true,
                    content: (
                      <View
                        style={[
                          styles.pageFieldEditableValue,
                          {
                            borderBottomColor:
                              pageFieldFocus === 'start' ? tone.primary : shadowInk,
                          },
                        ]}>
                        <ThemedTextInput
                          value={startPageStr}
                          onChangeText={setStartPageStr}
                          onFocus={() => setPageFieldFocus('start')}
                          onBlur={() => {
                            setPageFieldFocus(null);
                            commitPages(startPage, targetPage);
                          }}
                          placeholder="1"
                          placeholderTextColor={c.outline}
                          keyboardType="number-pad"
                          selectionColor={tone.primary}
                          style={[styles.pageFieldInput, { color: c.onSurface }]}
                        />
                        <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
                      </View>
                    ),
                  },
                  {
                    key: 'target' as const,
                    label: t('goalDetail.reading.target'),
                    accent: false,
                    editable: true,
                    content: (
                      <View
                        style={[
                          styles.pageFieldEditableValue,
                          {
                            borderBottomColor:
                              pageFieldFocus === 'target' ? tone.primary : shadowInk,
                          },
                        ]}>
                        <ThemedTextInput
                          value={targetPageStr}
                          onChangeText={setTargetPageStr}
                          onFocus={() => setPageFieldFocus('target')}
                          onBlur={() => {
                            setPageFieldFocus(null);
                            commitPages(startPage, targetPage);
                          }}
                          placeholder="100"
                          placeholderTextColor={c.outline}
                          keyboardType="number-pad"
                          selectionColor={tone.primary}
                          style={[styles.pageFieldInput, { color: c.onSurface }]}
                        />
                        <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
                      </View>
                    ),
                  },
                  {
                    key: 'total' as const,
                    label: t('goalDetail.reading.total'),
                    accent: false,
                    editable: false,
                    content:
                      totalPages != null ? (
                        <View style={styles.pageFieldInputRow}>
                          <ThemedText style={[styles.pageFieldValue, { color: c.onSurface }]}>
                            {totalPages}
                          </ThemedText>
                          <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={[styles.pageFieldValueMuted, { color: c.outline }]}>—</ThemedText>
                      ),
                  },
                  {
                    key: 'read' as const,
                    label: t('goalDetail.reading.pagesToRead'),
                    accent: true,
                    editable: false,
                    content: (
                      <ThemedText style={[styles.pageFieldValue, { color: tone.primary }]}>
                        {pagesRead}
                      </ThemedText>
                    ),
                  },
                ]
              ).map((field) => (
                <View
                  key={field.key}
                  style={[
                    styles.chipShell,
                    styles.pageFieldShell,
                    { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.chipShadow,
                      {
                        backgroundColor: shadowInk,
                        transform: [
                          { translateX: CHIP_SHADOW },
                          { translateY: CHIP_SHADOW },
                        ],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.pageField,
                      {
                        backgroundColor: field.accent ? tone.primaryContainer : faceWhite,
                      },
                    ]}>
                    <View style={styles.pageFieldLabelRow}>
                      <ThemedText style={[styles.pageFieldLabel, { color: c.onVariant }]}>
                        {field.label}
                      </ThemedText>
                      {field.editable ? (
                        <IconSymbol name="pencil" size={8} color={c.onVariant} />
                      ) : null}
                    </View>
                    {field.content}
                  </View>
                </View>
              ))}
            </View>
            </View>

            <View
              style={styles.memoSection}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                memoSectionLayoutRef.current = { y, height };
              }}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>
                {t('goalDetail.reading.memo')}
              </ThemedText>
              <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
                {t('goalDetail.reading.memoHint')}
              </ThemedText>
              <View
                style={[
                  styles.chipShell,
                  { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.chipShadow,
                    {
                      backgroundColor: shadowInk,
                      transform: [
                        { translateX: CHIP_SHADOW },
                        { translateY: CHIP_SHADOW },
                      ],
                    },
                  ]}
                />
                <ThemedTextInput
                  value={memo}
                  onChangeText={(text) => setMemo(text.slice(0, READING_BOOK_MEMO_MAX))}
                  onFocus={() => {
                    setIsMemoFocused(true);
                    scrollMemoIntoView();
                  }}
                  onBlur={() => {
                    setIsMemoFocused(false);
                    commitMemo();
                  }}
                  placeholder={t('goalDetail.reading.memoPlaceholder')}
                  placeholderTextColor={c.outline}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.memoInput,
                    {
                      color: c.onSurface,
                      backgroundColor: faceWhite,
                    },
                  ]}
                />
              </View>
            </View>

            {catalogSource === 'aladin' ? (
              <AladinAttributionLine color={c.outline} compact />
            ) : catalogSource === 'openlibrary' ? (
              <OpenLibraryAttributionLine color={c.outline} compact />
            ) : null}

            <View
              style={[
                styles.chipShell,
                { marginRight: 3, marginBottom: 3 },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.chipShadow,
                  {
                    backgroundColor: tone.danger,
                    transform: [{ translateX: 3 }, { translateY: 3 }],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('goalDetail.reading.removeA11y', { title: entry.title })}
                onPress={() => {
                  onRemove();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.removeBtn,
                  {
                    backgroundColor: pressed
                      ? isDark
                        ? '#B3261E'
                        : '#F5B8B2'
                      : tone.dangerBg,
                    opacity: pressed ? 0.94 : 1,
                  },
                ]}>
                <ThemedText style={[styles.removeBtnText, { color: tone.danger }]}>
                  {t('goalDetail.reading.removeFromLibrary')}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 24 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { paddingHorizontal: 16, gap: 14, paddingBottom: 16 },
  bookHero: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  bookCover: { width: 64, height: 90, backgroundColor: '#f3f4f6' },
  bookCoverFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  bookHeroText: { flex: 1, gap: 6, paddingTop: 4 },
  bookMeta: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  aladinLink: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  statusSection: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: -0.1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipShell: {
    position: 'relative',
  },
  chipShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  statusChip: {
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
    zIndex: 1,
  },
  goalSection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLine: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  progressSub: { fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 4, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
  pageFields: { flexDirection: 'row', gap: 4 },
  pageFieldShell: {
    flex: 1,
    minWidth: 0,
  },
  pageField: {
    flex: 1,
    borderWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 2,
    alignItems: 'center',
    minWidth: 0,
    zIndex: 1,
  },
  pageFieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  pageFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pageFieldInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  pageFieldEditableValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
    borderBottomWidth: 2,
    paddingBottom: 1,
    minWidth: 28,
    justifyContent: 'center',
  },
  pageFieldInput: { fontSize: 15, fontWeight: '600', textAlign: 'center', padding: 0, minWidth: 22 },
  pageFieldSuffix: { fontSize: 10, fontWeight: '600' },
  pageFieldValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  pageFieldValueMuted: { fontSize: 15, fontWeight: '500' },
  memoSection: { gap: 8 },
  memoInput: {
    minHeight: 88,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    zIndex: 1,
  },
  removeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    paddingVertical: 14,
    marginTop: 4,
    zIndex: 1,
  },
  removeBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});
