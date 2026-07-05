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

import { isAladinApiConfigured } from '@shared/config/aladin';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { AladinAttributionLine } from './AladinAttributionLine';
import { AladinApiError, type AladinBookDetail, type AladinSearchBookItem } from '../lib/aladinApiTypes';
import { openAladinProductPage } from '../lib/openAladinProductPage';
import { resolveAladinBookDetail, searchAladinBooks } from '../lib/searchAladinBooks';

type SheetMode = 'search' | 'detail';

type Props = {
  visible: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onSelect: (book: AladinBookDetail) => void;
};

export function AladinBookSearchSheet({
  visible,
  ink,
  muted,
  surface,
  line,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<SheetMode>('search');
  const [query, setQuery] = useState('');
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<AladinSearchBookItem[]>([]);
  const [previewDetail, setPreviewDetail] = useState<AladinBookDetail | null>(null);

  const apiConfigured = useMemo(() => isAladinApiConfigured(), []);

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

  useEffect(() => {
    if (!visible) resetSheet();
  }, [resetSheet, visible]);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!apiConfigured || trimmed.length === 0) {
      if (trimmed.length === 0) {
        setErrorMessage('검색어를 입력해 주세요.');
      }
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResults([]);
    setLastSubmittedQuery(trimmed);

    try {
      const result = await searchAladinBooks(trimmed, { maxResults: 12 });
      setResults(result.items);
      if (result.items.length === 0) {
        setErrorMessage('검색 결과가 없어요.');
      }
    } catch (error: unknown) {
      setResults([]);
      if (error instanceof AladinApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage('도서 검색 중 문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  }, [apiConfigured, query]);

  const openDetail = useCallback(async (item: AladinSearchBookItem) => {
    setMode('detail');
    setPreviewDetail(null);
    setDetailErrorMessage(null);
    setDetailLoading(true);

    try {
      const detail = await resolveAladinBookDetail(item);
      setPreviewDetail(detail);
    } catch (error: unknown) {
      if (error instanceof AladinApiError) {
        setDetailErrorMessage(error.message);
        return;
      }
      setDetailErrorMessage('도서 상세 정보를 불러오지 못했어요.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleConfirmSelect = useCallback(async () => {
    if (!previewDetail) return;

    setConfirming(true);
    setDetailErrorMessage(null);
    try {
      onSelect(previewDetail);
      onClose();
    } finally {
      setConfirming(false);
    }
  }, [onClose, onSelect, previewDetail]);

  const handleBackToSearch = useCallback(() => {
    setMode('search');
    setPreviewDetail(null);
    setDetailErrorMessage(null);
    setDetailLoading(false);
    setConfirming(false);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          {mode === 'detail' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색 결과로 돌아가기"
              onPress={handleBackToSearch}
              hitSlop={10}
              style={styles.headerBackBtn}>
              <IconSymbol name="chevron.left" size={18} color={ink} />
            </Pressable>
          ) : null}
          <ThemedText style={[styles.title, { color: ink }]}>
            {mode === 'detail' ? '도서 상세' : '알라딘 도서 검색'}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {!apiConfigured ? (
            <View style={styles.centerBox}>
              <ThemedText style={[styles.helper, { color: muted }]}>
                알라딘 API 키가 설정되지 않았어요.{'\n'}
                `.env.local`에 EXPO_PUBLIC_ALADIN_TTB_KEY를 추가한 뒤 앱을 다시 실행해 주세요.
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
                    placeholder="책 제목, 저자, 출판사"
                    placeholderTextColor={muted}
                    autoFocus
                    returnKeyType="search"
                    onSubmitEditing={() => void runSearch()}
                    style={[styles.searchInput, { color: ink }]}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="도서 검색"
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
                    <ThemedText style={[styles.searchSubmitText, { color: surface }]}>검색</ThemedText>
                  )}
                </Pressable>
              </View>

              {errorMessage ? (
                <ThemedText style={[styles.helper, { color: muted }]}>{errorMessage}</ThemedText>
              ) : lastSubmittedQuery.length === 0 ? (
                <ThemedText style={[styles.helper, { color: muted }]}>
                  검색어를 입력한 뒤 검색 버튼을 눌러 주세요.
                </ThemedText>
              ) : null}

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                {results.map((item) => (
                  <Pressable
                    key={item.itemId}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title} 상세 보기`}
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
                        {[item.author, item.publisher].filter(Boolean).join(' · ') || '정보 없음'}
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
                  <ThemedText style={[styles.helper, { color: muted }]}>상세 정보를 불러오는 중...</ThemedText>
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
                          출간 {previewDetail.pubDate}
                        </ThemedText>
                      ) : null}
                      {previewDetail.totalPages ? (
                        <ThemedText style={[styles.detailMeta, { color: muted }]}>
                          전체 {previewDetail.totalPages}쪽
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
                    accessibilityLabel="알라딘에서 도서 보기"
                    onPress={() => void openAladinProductPage(previewDetail.link)}
                    style={({ pressed }) => [styles.secondaryBtn, { borderColor: line }, pressed && { opacity: 0.72 }]}>
                    <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>알라딘에서 보기</ThemedText>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="이 도서 선택"
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
                      <ThemedText style={[styles.primaryBtnText, { color: surface }]}>이 도서 선택</ThemedText>
                    )}
                  </Pressable>
                </>
              ) : (
                <View style={styles.centerBox}>
                  <ThemedText style={[styles.helper, { color: muted }]}>
                    {detailErrorMessage ?? '도서 상세 정보를 불러오지 못했어요.'}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="검색 결과로 돌아가기"
                    onPress={handleBackToSearch}
                    style={({ pressed }) => [styles.secondaryBtn, { borderColor: line }, pressed && { opacity: 0.72 }]}>
                    <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>검색 결과로 돌아가기</ThemedText>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}

          <View style={[styles.footer, { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <AladinAttributionLine color={muted} compact />
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
  },
});
