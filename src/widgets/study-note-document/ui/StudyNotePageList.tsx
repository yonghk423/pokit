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
import { useTranslation } from '@shared/lib/i18n';
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
  const { t } = useTranslation();
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
            accessibilityLabel={t('studyNote.closeListA11y')}
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
        <ThemedText style={[styles.headerTitle, { color: palette.onSurface }]}>{t('studyNote.listTitle')}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('studyNote.newMemoA11y')}
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
            <ThemedText style={[styles.emptyTitle, { color: palette.onSurface }]}>{t('studyNote.emptyListTitle')}</ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.onVariant }]}>
              {t('studyNote.emptyListBody')}
            </ThemedText>
          </View>
        ) : (
          sortedPages.map((page, index) => {
            const selected = page.id === activePageId;
            const title = resolveWorkStudyNotePageLabel(page, pages);
            const preview = resolveWorkStudyNotePagePreview(page);
            const dateLabel = formatWorkStudyNoteDateLabel(page.createdDateKey ?? '');
            const isLast = index === sortedPages.length - 1;
            const canDelete = sortedPages.length > 1;

            const confirmDelete = () => {
              if (!canDelete) {
                Alert.alert(t('studyNote.cannotDeleteTitle'), t('studyNote.cannotDeleteMessage'));
                return;
              }
              Alert.alert(t('studyNote.deleteMemoTitle'), t('studyNote.deleteMemoMessage', { title }), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: () => {
                    void Haptics.selectionAsync();
                    onDeletePage(page.id);
                  },
                },
              ]);
            };

            return (
              <View
                key={page.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? 'rgba(0,0,0,0.03)' : surfaceBg,
                    borderBottomColor: palette.outlineVariant,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onSelectPage(page.id);
                  }}
                  onLongPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.rowMain,
                    pressed && { opacity: 0.72 },
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
                      {t('studyNote.noContent')}
                    </ThemedText>
                  )}
                  <ThemedText style={[styles.rowDate, { color: palette.onVariant }]}>{dateLabel}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('studyNote.deleteMemoA11y', { title })}
                  onPress={confirmDelete}
                  hitSlop={8}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.55 }]}>
                  <IconSymbol name="trash" size={16} color={palette.onVariant} />
                </Pressable>
              </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 11,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
