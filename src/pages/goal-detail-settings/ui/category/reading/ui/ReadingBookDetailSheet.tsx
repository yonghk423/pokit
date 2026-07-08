import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
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
  readingBookEntryToShareText,
  type ReadingBookEntry,
  type ReadingBookStatus,
} from '@entities/day-plan';
import { AladinAttributionLine, openAladinProductPage } from '@features/aladin-book-search';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const READING_ACCENT = RetroFlatColors.light.primary;

const STATUS_OPTIONS: { key: ReadingBookStatus; label: string }[] = [
  { key: 'want', label: '읽고 싶은' },
  { key: 'reading', label: '읽는 중' },
  { key: 'done', label: '완료' },
];

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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const c = palette;
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewportHeightRef = useRef(300);
  const memoSectionLayoutRef = useRef({ y: 0, height: 0 });
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isMemoFocused, setIsMemoFocused] = useState(false);

  const resolved = entry ? ensureReadingBookPages(entry) : null;
  const [startPageStr, setStartPageStr] = useState('1');
  const [targetPageStr, setTargetPageStr] = useState('100');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!resolved) return;
    setStartPageStr(pageToInputValue(resolved.startPage, 1));
    setTargetPageStr(pageToInputValue(resolved.targetPage, resolved.aladin?.totalPages ?? 100));
    setMemo(resolved.memo ?? '');
  }, [resolved]);

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
  const totalPages =
    typeof entry.aladin?.totalPages === 'number' && entry.aladin.totalPages > 0
      ? entry.aladin.totalPages
      : null;
  const { pagesRead, progressPct } = deriveReadingBookProgress({
    startPage,
    targetPage,
    totalPages,
  });
  const status = normalizeReadingBookStatus(entry.status);
  const metaLine = entry.aladin?.author?.trim() || null;

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
      Alert.alert('공유 실패', '잠시 후 다시 시도해 주세요.');
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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
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
                  accessibilityLabel="도서 정보 공유"
                  onPress={() => {
                    void shareBook();
                  }}
                  hitSlop={8}
                  style={styles.headerActionBtn}>
                  <IconSymbol name="square.and.arrow.up" size={16} color={c.onSurface} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
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
              {entry.aladin?.coverUrl ? (
                <Image
                  source={{ uri: entry.aladin.coverUrl }}
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
                {entry.aladin?.link ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openAladinProductPage(entry.aladin!.link)}
                    style={({ pressed }) => pressed && { opacity: 0.72 }}>
                    <ThemedText style={[styles.aladinLink, { color: c.onVariant }]}>
                      알라딘에서 보기
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.statusSection}>
              <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>상태</ThemedText>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const on = status === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setStatus(opt.key)}
                      style={[
                        styles.statusChip,
                        {
                          borderColor: on ? c.onSurface : c.outline,
                          backgroundColor: on ? 'rgba(0,0,0,0.06)' : 'transparent',
                        },
                      ]}>
                      <ThemedText
                        style={{
                          fontSize: 12,
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

            <View style={styles.goalSection}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>
                오늘 목표 분량
              </ThemedText>
              <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
                시작·목표 페이지로 오늘 읽을 분량을 설정해 주세요.
              </ThemedText>

            <View style={styles.progressRow}>
              <ThemedText style={[styles.progressLine, { color: c.onSurface }]}>
                {startPage}P → {targetPage}P
              </ThemedText>
              <ThemedText style={[styles.progressSub, { color: c.onVariant }]}>
                {pagesRead}쪽
                {totalPages != null ? ` · 책 ${progressPct}%` : ''}
              </ThemedText>
            </View>
            {totalPages != null ? (
              <View style={[styles.progressTrack, { backgroundColor: c.outlineVariant }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPct}%`, backgroundColor: READING_ACCENT },
                  ]}
                />
              </View>
            ) : null}

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
                    <ThemedText style={[styles.pageFieldValue, { color: c.onSurface }]}>
                      {totalPages}
                    </ThemedText>
                    <ThemedText style={[styles.pageFieldSuffix, { color: c.onVariant }]}>P</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={[styles.pageFieldValueMuted, { color: c.outline }]}>—</ThemedText>
                )}
              </View>
              <View style={[styles.pageField, styles.pageFieldRead, { borderColor: READING_ACCENT }]}>
                <ThemedText style={[styles.pageFieldLabel, { color: c.onVariant }]}>읽을 분량</ThemedText>
                <ThemedText style={[styles.pageFieldValue, { color: READING_ACCENT }]}>
                  {pagesRead}
                </ThemedText>
              </View>
            </View>
            </View>

            <View
              style={styles.memoSection}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                memoSectionLayoutRef.current = { y, height };
              }}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>메모</ThemedText>
              <ThemedText style={[styles.sectionSub, { color: c.onVariant }]}>
                읽는 동안 떠오른 생각이나 기억할 내용을 적어 두세요.
              </ThemedText>
              <TextInput
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
                placeholder="예: 3장까지 읽고 내일 이어서"
                placeholderTextColor={c.outline}
                multiline
                textAlignVertical="top"
                style={[
                  styles.memoInput,
                  {
                    color: c.onSurface,
                    borderColor: c.outlineVariant,
                    backgroundColor: c.surfaceLow,
                  },
                ]}
              />
            </View>

            {entry.aladin ? <AladinAttributionLine color={c.outline} compact /> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${entry.title} 삭제`}
              onPress={() => {
                onRemove();
                onClose();
              }}
              style={[styles.removeBtn, { borderColor: c.outline }]}>
              <IconSymbol name="trash" size={14} color={c.onVariant} />
              <ThemedText style={[styles.removeBtnText, { color: c.onVariant }]}>서재에서 삭제</ThemedText>
            </Pressable>
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
  statusChip: {
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
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
  pageField: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 2,
    alignItems: 'center',
    minWidth: 0,
  },
  pageFieldRead: { justifyContent: 'center' },
  pageFieldTotal: { justifyContent: 'center' },
  pageFieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  pageFieldInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  pageFieldInput: { fontSize: 15, fontWeight: '800', textAlign: 'center', padding: 0, minWidth: 22 },
  pageFieldSuffix: { fontSize: 10, fontWeight: '700' },
  pageFieldValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  pageFieldValueMuted: { fontSize: 15, fontWeight: '700' },
  memoSection: { gap: 8 },
  memoInput: {
    minHeight: 88,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 12,
    marginTop: 4,
  },
  removeBtnText: { fontSize: 14, fontWeight: '700' },
});
