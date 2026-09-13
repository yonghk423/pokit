import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import {
  createWorkStudyDocBlock,
  createWorkStudyNotePage,
  getWorkStudyActivePage,
  persistWorkStudyNotePageTitle,
  resolveWorkStudyNotePageAutoTitle,
  setWorkStudyActivePageBlocks,
  updateWorkStudyNotePageTitle,
  workStudyPageBlocksToPlainText,
  type WorkStudyDocument,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import { studyNoteKeyboardBottomPad } from '../lib/studyNoteKeyboardPad';
import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';
import { StudyNotePageList } from './StudyNotePageList';
import { StudyNotePageTitleField } from './StudyNotePageTitleField';

const NOTE_PAGE_BG = RetroFlatColors.light.bg;
const MAX_NOTE_PAGES = 30;

function ensurePageDocument(doc: WorkStudyDocument): WorkStudyDocument {
  if (doc.pages.length > 0) return doc;
  const page = createWorkStudyNotePage();
  return { pages: [page], activePageId: page.id };
}

function documentToDraft(doc: WorkStudyDocument): string {
  const page = getWorkStudyActivePage(doc);
  return workStudyPageBlocksToPlainText(page?.blocks ?? []);
}

function draftToBlocks(text: string) {
  const lines = text.split('\n');
  return lines.map((line) => {
    const block = createWorkStudyDocBlock('paragraph');
    block.text = line;
    return block;
  });
}

type Props = {
  document: WorkStudyDocument;
  onChangeDocument: (next: WorkStudyDocument | ((prev: WorkStudyDocument) => WorkStudyDocument)) => void;
  palette: StudyNoteDocumentPalette;
};

/**
 * 오늘 탭 노트 — 빠른메모와 같은 flex:1 입력 베이스.
 * 키패드: 페이지 KeyboardAvoidingView를 쓰지 않고 editor paddingBottom으로 입력칸만 줄인다.
 * 이 경로를 바꾸지 말 것. `.cursor/rules/study-note-keyboard.mdc`
 */
export function StudyNoteCanvas({ document, onChangeDocument, palette }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [draft, setDraft] = useState(() => documentToDraft(document));
  const inputRef = useRef<TextInput>(null);
  const keyboardInsetRef = useRef(0);
  const fabProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardInsetRef.current = event.endCoordinates.height;
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardInsetRef.current = 0;
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (document.pages.length > 0) return;
    onChangeDocument((prev) => ensurePageDocument(prev));
  }, [document.pages.length, onChangeDocument]);

  useEffect(() => {
    setDraft(documentToDraft(document));
  }, [document.activePageId, document.pages.length]);

  const persistDraft = useCallback(
    (text: string) => {
      setDraft(text);
      onChangeDocument((prev) => {
        const withPage = ensurePageDocument(prev);
        return setWorkStudyActivePageBlocks(withPage, draftToBlocks(text));
      });
    },
    [onChangeDocument],
  );

  const animateFab = useCallback(
    (open: boolean) => {
      setFabOpen(open);
      Animated.timing(fabProgress, {
        toValue: open ? 1 : 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [fabProgress],
  );

  const retainEditorKeyboard = useCallback(() => {
    if (keyboardInsetRef.current <= 0) return;
    inputRef.current?.focus();
  }, []);

  const openList = useCallback(() => {
    void Haptics.selectionAsync();
    Keyboard.dismiss();
    animateFab(false);
    setListOpen(true);
  }, [animateFab]);

  const closeList = useCallback(() => {
    void Haptics.selectionAsync();
    setListOpen(false);
  }, []);

  const selectPage = useCallback(
    (pageId: string) => {
      onChangeDocument((prev) => (prev.activePageId === pageId ? prev : { ...prev, activePageId: pageId }));
      setListOpen(false);
    },
    [onChangeDocument],
  );

  const addPage = useCallback(
    (closeAfter: boolean) => {
      void Haptics.selectionAsync();
      Keyboard.dismiss();
      onChangeDocument((prev) => {
        const withPage = ensurePageDocument(prev);
        if (withPage.pages.length >= MAX_NOTE_PAGES) return withPage;
        const page = createWorkStudyNotePage();
        return { pages: [...withPage.pages, page], activePageId: page.id };
      });
      if (closeAfter) setListOpen(false);
    },
    [onChangeDocument],
  );

  const activePage = getWorkStudyActivePage(document);
  const activePageAutoTitle = activePage
    ? resolveWorkStudyNotePageAutoTitle(activePage, document.pages)
    : '';

  const handlePageTitleChange = useCallback(
    (nextTitle: string) => {
      if (!activePage) return;
      const persisted = persistWorkStudyNotePageTitle(nextTitle, activePageAutoTitle);
      if (persisted === activePage.title) return;
      onChangeDocument((prev) => updateWorkStudyNotePageTitle(prev, activePage.id, persisted));
    },
    [activePage, activePageAutoTitle, onChangeDocument],
  );

  const deletePage = useCallback(
    (pageId: string) => {
      onChangeDocument((prev) => {
        if (prev.pages.length <= 1) return prev;
        const index = prev.pages.findIndex((page) => page.id === pageId);
        const nextPages = prev.pages.filter((page) => page.id !== pageId);
        const nextActive =
          prev.activePageId === pageId
            ? nextPages[Math.max(0, index - 1)]?.id ?? nextPages[0]?.id ?? ''
            : prev.activePageId;
        return { pages: nextPages, activePageId: nextActive };
      });
    },
    [onChangeDocument],
  );

  const fontSize = width >= 768 ? 26 : width >= 390 ? 22 : 20;
  const lineHeight = Math.round(fontSize * 1.45);
  const keyboardPad = studyNoteKeyboardBottomPad(keyboardInset, bottomTabBarHeight);

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        color: palette.onSurface,
        fontSize,
        lineHeight,
      },
    ],
    [fontSize, lineHeight, palette.onSurface],
  );

  return (
    <View style={[styles.shell, { backgroundColor: NOTE_PAGE_BG }]}>
      <View style={[styles.header, { borderBottomColor: palette.outlineVariant }]}>
        <View style={styles.headerSide}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.openListA11y')}
            onPress={openList}
            hitSlop={8}
            style={styles.headerBtn}>
            <IconSymbol name="line.3.horizontal" size={20} color={palette.onSurface} />
          </Pressable>
        </View>
        {activePage ? (
          <StudyNotePageTitleField
            value={activePage.title}
            autoFallback={activePageAutoTitle}
            onChangeValue={handlePageTitleChange}
            palette={palette}
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.newMemoA11y')}
            onPress={() => addPage(false)}
            hitSlop={8}
            style={styles.headerBtn}>
            <IconSymbol name="square.and.pencil" size={18} color={palette.onSurface} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.editor, { paddingBottom: keyboardPad }]}>
        <ThemedTextInput
          ref={inputRef}
          value={draft}
          onChangeText={persistDraft}
          placeholder={t('studyNote.emptyTitle')}
          placeholderTextColor={palette.outline}
          multiline
          scrollEnabled
          textAlignVertical="top"
          style={inputStyle}
        />
      </View>

      {!listOpen && keyboardInset > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('studyNote.toolbarDismissKeyboard')}
          onPress={() => {
            void Haptics.selectionAsync();
            Keyboard.dismiss();
          }}
          style={({ pressed }) => [
            styles.keyboardDismissBtn,
            {
              bottom: keyboardPad + 20,
              transform: [{ translateY: pressed ? 2 : 0 }],
            },
          ]}>
          <IconSymbol name="keyboard.chevron.compact.down" size={16} color="rgba(24, 24, 27, 0.28)" />
        </Pressable>
      ) : null}

      {!listOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fabOpen ? t('studyNote.toolbarFabCloseA11y') : t('studyNote.toolbarFabMockA11y')}
          onPressIn={retainEditorKeyboard}
          onPress={() => {
            void Haptics.selectionAsync();
            animateFab(!fabOpen);
          }}
          style={[
            styles.fabMock,
            {
              bottom: keyboardPad + 16,
              backgroundColor: RetroFlatColors.light.bgMint,
            },
          ]}>
          <View style={styles.fabIconSlot}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.fabIconLayer,
                {
                  opacity: fabProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      rotate: fabProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '90deg'],
                      }),
                    },
                  ],
                },
              ]}>
              <IconSymbol name="plus" size={16} color="#000000" />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.fabIconLayer,
                {
                  opacity: fabProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      rotate: fabProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-90deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}>
              <IconSymbol name="xmark" size={16} color="#000000" />
            </Animated.View>
          </View>
        </Pressable>
      ) : null}

      {listOpen ? (
        <View style={[styles.listLayer, { backgroundColor: NOTE_PAGE_BG }]}>
          <StudyNotePageList
            layout="drawer"
            pages={document.pages}
            activePageId={document.activePageId}
            palette={palette}
            surfaceBg={NOTE_PAGE_BG}
            onSelectPage={selectPage}
            onAddPage={() => addPage(true)}
            onDeletePage={deletePage}
            onClose={closeList}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    width: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSideEnd: {
    justifyContent: 'flex-end',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  editor: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  input: {
    flex: 1,
    minHeight: 120,
    alignSelf: 'stretch',
    padding: 0,
    margin: 0,
    fontWeight: '500',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  listLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  keyboardDismissBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  /** 목업. 본문 padding에 더하지 말 것 — 키패드 위에만 겹친다. */
  fabMock: {
    position: 'absolute',
    right: 16,
    zIndex: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabIconSlot: {
    width: 16,
    height: 16,
  },
  fabIconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
