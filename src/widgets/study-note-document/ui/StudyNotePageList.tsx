import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  formatWorkStudyNoteDateLabel,
  resolveWorkStudyNotePageLabel,
  resolveWorkStudyNotePagePreview,
  type WorkStudyNotePage,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

type Palette = StudyNoteDocumentPalette;

type Props = {
  pages: WorkStudyNotePage[];
  activePageId: string;
  palette: Palette;
  surfaceBg: string;
  layout?: 'fullscreen' | 'drawer';
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onClose?: () => void;
};

export function StudyNotePageList({
  pages,
  activePageId,
  palette,
  surfaceBg,
  layout = 'fullscreen',
  onSelectPage,
  onAddPage,
  onDeletePage,
  onClose,
}: Props) {
  const sortedPages = useMemo(
    () =>
      [...pages].sort((a, b) => {
        const aKey = a.createdDateKey ?? '';
        const bKey = b.createdDateKey ?? '';
        if (aKey !== bKey) return bKey.localeCompare(aKey);
        return pages.indexOf(a) - pages.indexOf(b);
      }),
    [pages],
  );

  return (
    <View style={[styles.root, layout === 'drawer' ? styles.rootDrawer : styles.rootFullscreen, { backgroundColor: surfaceBg }]}>
      <View style={[styles.header, { borderBottomColor: palette.outlineVariant }]}>
        {layout === 'drawer' && onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메모 목록 닫기"
            onPress={() => {
              void Haptics.selectionAsync();
              onClose();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.65 }]}>
            <IconSymbol name="xmark" size={16} color={palette.onSurface} />
          </Pressable>
        ) : (
          <View style={styles.closeBtn} />
        )}
        <ThemedText style={[styles.headerTitle, { color: palette.onSurface }]}>메모</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 메모 작성"
          onPress={() => {
            void Haptics.selectionAsync();
            onAddPage();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.composeBtn, pressed && { opacity: 0.65 }]}>
          <IconSymbol name="square.and.pencil" size={20} color={palette.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={sortedPages.length === 0 ? styles.emptyList : undefined}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}>
        {sortedPages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <IconSymbol name="note.text" size={28} color={palette.onVariant} />
            <ThemedText style={[styles.emptyTitle, { color: palette.onSurface }]}>메모가 없어요</ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.onVariant }]}>
              오른쪽 위 버튼으로 첫 메모를 작성해 보세요
            </ThemedText>
          </View>
        ) : (
          sortedPages.map((page, index) => {
            const selected = page.id === activePageId;
            const title = resolveWorkStudyNotePageLabel(page, pages);
            const preview = resolveWorkStudyNotePagePreview(page);
            const dateLabel = formatWorkStudyNoteDateLabel(page.createdDateKey ?? '');
            const isLast = index === sortedPages.length - 1;

            return (
              <Pressable
                key={page.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onSelectPage(page.id);
                }}
                onLongPress={() => {
                  Alert.alert('메모 삭제', `「${title}」 메모를 삭제할까요?`, [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: () => onDeletePage(page.id) },
                  ]);
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? 'rgba(0,0,0,0.04)'
                      : selected
                        ? 'rgba(0,0,0,0.03)'
                        : surfaceBg,
                    borderBottomColor: palette.outlineVariant,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}>
                <ThemedText
                  style={[styles.rowTitle, { color: palette.onSurface }]}
                  numberOfLines={1}>
                  {title}
                </ThemedText>
                {preview ? (
                  <ThemedText style={[styles.rowPreview, { color: palette.onVariant }]} numberOfLines={2}>
                    {preview}
                  </ThemedText>
                ) : (
                  <ThemedText style={[styles.rowPreview, { color: palette.outline }]} numberOfLines={1}>
                    내용 없음
                  </ThemedText>
                )}
                <ThemedText style={[styles.rowDate, { color: palette.onVariant }]}>{dateLabel}</ThemedText>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  rootFullscreen: {
    minHeight: 420,
  },
  rootDrawer: {
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  composeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  row: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 11,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  rowPreview: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  rowDate: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
});
