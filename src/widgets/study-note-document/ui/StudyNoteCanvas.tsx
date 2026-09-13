import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import {
  createWorkStudyDocBlock,
  createWorkStudyNotePage,
  getWorkStudyActivePage,
  persistWorkStudyNotePageTitle,
  resolveWorkStudyNotePageAutoTitle,
  resolveWorkStudyTextRoleMetrics,
  setWorkStudyActivePageBlocks,
  updateWorkStudyNotePageTitle,
  type WorkStudyDocBlock,
  type WorkStudyDocument,
  type WorkStudyHeadingLevel,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import {
  applyCanvasToolbarToDraft,
  applyHeadingToBlock,
  canvasLineListKind,
  stripHeadingMarks,
} from '../lib/studyNoteCanvasToolbar';
import { studyNoteKeyboardBottomPad } from '../lib/studyNoteKeyboardPad';
import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';
import { StudyDocumentToolbar, type StudyToolbarAction } from './StudyDocumentToolbar';
import { StudyNotePageList } from './StudyNotePageList';
import { StudyNotePageTitleField } from './StudyNotePageTitleField';

const NOTE_PAGE_BG = RetroFlatColors.light.bg;
const MAX_NOTE_PAGES = 30;

function ensurePageDocument(doc: WorkStudyDocument): WorkStudyDocument {
  if (doc.pages.length > 0) return doc;
  const page = createWorkStudyNotePage();
  return { pages: [page], activePageId: page.id };
}

function snapshotBlocks(blocks: WorkStudyDocBlock[]): string {
  return JSON.stringify(blocks);
}

function parseBlocksSnapshot(raw: string): WorkStudyDocBlock[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WorkStudyDocBlock[]) : null;
  } catch {
    return null;
  }
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
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const inputRefs = useRef(new Map<string, TextInput | null>());
  const focusedBlockIdRef = useRef<string | null>(null);
  const editorScrollRef = useRef<ScrollView>(null);
  const pendingFocusBlockIdRef = useRef<string | null>(null);
  const retainKeyboardRef = useRef(false);
  const keyboardInsetRef = useRef(0);
  const toolbarProgress = useRef(new Animated.Value(0)).current;

  const retainEditorKeyboard = useCallback(() => {
    if (keyboardInsetRef.current <= 0) return;
    retainKeyboardRef.current = true;
    const id = focusedBlockIdRef.current;
    if (id) inputRefs.current.get(id)?.focus();
  }, []);

  const animateToolbar = useCallback(
    (open: boolean) => {
      setToolbarOpen(open);
      Animated.timing(toolbarProgress, {
        toValue: open ? 1 : 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [toolbarProgress],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      retainKeyboardRef.current = false;
      keyboardInsetRef.current = event.endCoordinates.height;
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (retainKeyboardRef.current) return;
      keyboardInsetRef.current = 0;
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const activePage = getWorkStudyActivePage(document);
  const pageBlocks = activePage?.blocks ?? [];
  const blocks = pageBlocks.length > 0 ? pageBlocks : [];
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  focusedBlockIdRef.current = focusedBlockId;

  useLayoutEffect(() => {
    const pendingId = pendingFocusBlockIdRef.current;
    if (!pendingId) return;
    const node = inputRefs.current.get(pendingId);
    if (!node) return;
    pendingFocusBlockIdRef.current = null;
    node.focus();
    if (blocks[0]?.id === pendingId) {
      editorScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [blocks]);

  useEffect(() => {
    if (document.pages.length > 0) return;
    onChangeDocument((prev) => ensurePageDocument(prev));
  }, [document.pages.length, onChangeDocument]);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setFocusedBlockId(null);
    setHistoryTick((n) => n + 1);
  }, [document.activePageId, document.pages.length]);

  useEffect(() => {
    if (blocks.length > 0) return;
    onChangeDocument((prev) => {
      const withPage = ensurePageDocument(prev);
      const page = getWorkStudyActivePage(withPage);
      if (page && page.blocks.length > 0) return withPage;
      return setWorkStudyActivePageBlocks(withPage, [createWorkStudyDocBlock('paragraph')]);
    });
  }, [blocks.length, onChangeDocument]);

  const persistBlocks = useCallback(
    (next: WorkStudyDocBlock[]) => {
      onChangeDocument((prev) => {
        const withPage = ensurePageDocument(prev);
        return setWorkStudyActivePageBlocks(withPage, next.length > 0 ? next : [createWorkStudyDocBlock('paragraph')]);
      });
    },
    [onChangeDocument],
  );

  const pushUndo = useCallback((snapshot: string) => {
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] === snapshot) return;
    stack.push(snapshot);
    if (stack.length > 40) stack.shift();
    redoStackRef.current = [];
    setHistoryTick((n) => n + 1);
  }, []);

  const applyHeading = useCallback(
    (level: WorkStudyHeadingLevel | null) => {
      const current = blocksRef.current;
      const target =
        current.find((block) => block.id === focusedBlockIdRef.current) ?? current[current.length - 1];
      if (!target) return;
      const nextBlock = applyHeadingToBlock(target, level);
      if (nextBlock === target && nextBlock.headingLevel === target.headingLevel) return;
      pushUndo(snapshotBlocks(current));
      persistBlocks(current.map((block) => (block.id === target.id ? nextBlock : block)));
      setFocusedBlockId(target.id);
      void Haptics.selectionAsync();
    },
    [persistBlocks, pushUndo],
  );

  const updateFocusedBlockText = useCallback(
    (blockId: string, text: string) => {
      const current = blocksRef.current;
      if (text.includes('\n')) {
        const parts = text.split('\n');
        const index = current.findIndex((block) => block.id === blockId);
        if (index < 0) return;
        pushUndo(snapshotBlocks(current));
        const head = { ...current[index]!, text: stripHeadingMarks(parts[0] ?? '') };
        const created = parts.slice(1).map((line) => {
          const block = createWorkStudyDocBlock('paragraph');
          block.text = line;
          return block;
        });
        persistBlocks([...current.slice(0, index), head, ...created, ...current.slice(index + 1)]);
        const last = created[created.length - 1];
        if (last) {
          setFocusedBlockId(last.id);
          requestAnimationFrame(() => inputRefs.current.get(last.id)?.focus());
        }
        return;
      }
      persistBlocks(
        current.map((block) => (block.id === blockId ? { ...block, text: stripHeadingMarks(text) } : block)),
      );
    },
    [persistBlocks, pushUndo],
  );

  const onToolbarAction = useCallback(
    (action: StudyToolbarAction) => {
      if (action === 'dismiss-keyboard') {
        retainKeyboardRef.current = false;
        void Haptics.selectionAsync();
        Keyboard.dismiss();
        return;
      }
      if (action === 'text-color') {
        void Haptics.selectionAsync();
        return;
      }
      if (action === 'heading-1') {
        applyHeading(1);
        return;
      }
      if (action === 'heading-2') {
        applyHeading(2);
        return;
      }
      if (action === 'heading-3') {
        applyHeading(3);
        return;
      }
      if (action === 'body-text') {
        applyHeading(null);
        return;
      }
      const current = blocksRef.current;
      if (action === 'undo') {
        const prev = undoStackRef.current.pop();
        if (!prev) return;
        const parsed = parseBlocksSnapshot(prev);
        if (!parsed) return;
        redoStackRef.current.push(snapshotBlocks(current));
        persistBlocks(parsed);
        setHistoryTick((n) => n + 1);
        void Haptics.selectionAsync();
        return;
      }
      if (action === 'redo') {
        const next = redoStackRef.current.pop();
        if (!next) return;
        const parsed = parseBlocksSnapshot(next);
        if (!parsed) return;
        undoStackRef.current.push(snapshotBlocks(current));
        persistBlocks(parsed);
        setHistoryTick((n) => n + 1);
        void Haptics.selectionAsync();
        return;
      }
      if (action === 'reset-document') {
        Alert.alert(t('studyNote.clearAllTitle'), t('studyNote.clearAllMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('studyNote.clearAllConfirm'),
            style: 'destructive',
            onPress: () => {
              pushUndo(snapshotBlocks(current));
              persistBlocks([createWorkStudyDocBlock('paragraph')]);
              void Haptics.selectionAsync();
            },
          },
        ]);
        return;
      }
      if (action === 'insert-line-top' || action === 'insert-line-bottom') {
        pushUndo(snapshotBlocks(current));
        const created = createWorkStudyDocBlock('paragraph');
        const next = action === 'insert-line-top' ? [created, ...current] : [...current, created];
        pendingFocusBlockIdRef.current = created.id;
        persistBlocks(next);
        setFocusedBlockId(created.id);
        if (action === 'insert-line-top') {
          editorScrollRef.current?.scrollTo({ y: 0, animated: true });
        } else {
          requestAnimationFrame(() => {
            editorScrollRef.current?.scrollToEnd({ animated: true });
          });
        }
        void Haptics.selectionAsync();
        return;
      }
      const target =
        current.find((block) => block.id === focusedBlockIdRef.current) ?? current[current.length - 1];
      if (!target) return;
      const nextText = applyCanvasToolbarToDraft(target.text, selection.start, action, selection.end);
      if (nextText == null || nextText === target.text) return;
      pushUndo(snapshotBlocks(current));
      persistBlocks(current.map((block) => (block.id === target.id ? { ...block, text: nextText } : block)));
      void Haptics.selectionAsync();
    },
    [applyHeading, persistBlocks, pushUndo, selection.end, selection.start, t],
  );

  const openList = useCallback(() => {
    void Haptics.selectionAsync();
    Keyboard.dismiss();
    animateToolbar(false);
    setListOpen(true);
  }, [animateToolbar]);

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

  const focusedBlock =
    blocks.find((block) => block.id === focusedBlockId) ?? blocks[blocks.length - 1] ?? null;
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  void historyTick;

  const bodyFontSize = width >= 768 ? 26 : width >= 390 ? 22 : 20;
  const keyboardPad = studyNoteKeyboardBottomPad(keyboardInset, bottomTabBarHeight);

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
        <ScrollView
          ref={editorScrollRef}
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {blocks.map((block, index) => {
            const role = resolveWorkStudyTextRoleMetrics(block.headingLevel);
            const fontSize = block.headingLevel ? role.fontSize : bodyFontSize;
            const lineHeight = block.headingLevel ? role.lineHeight : Math.round(bodyFontSize * 1.45);
            return (
              <ThemedTextInput
                key={block.id}
                ref={(node) => {
                  inputRefs.current.set(block.id, node);
                }}
                value={stripHeadingMarks(block.text)}
                onChangeText={(text) => updateFocusedBlockText(block.id, text)}
                onFocus={() => setFocusedBlockId(block.id)}
                placeholder={index === 0 ? t('studyNote.emptyTitle') : undefined}
                placeholderTextColor={palette.outline}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                onSelectionChange={(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
                  setSelection(event.nativeEvent.selection);
                }}
                style={[
                  styles.blockInput,
                  {
                    color: palette.onSurface,
                    fontSize,
                    lineHeight,
                    fontWeight: block.headingLevel ? role.fontWeight : '500',
                    minHeight: index === blocks.length - 1 ? Math.max(120, lineHeight * 3) : lineHeight,
                  },
                ]}
              />
            );
          })}
        </ScrollView>
      </View>

      {!listOpen ? (
        <Animated.View
          pointerEvents={toolbarOpen ? 'auto' : 'none'}
          style={[
            styles.toolbarFloat,
            {
              bottom: keyboardPad + 64,
              backgroundColor: NOTE_PAGE_BG,
              borderTopColor: palette.outlineVariant,
              opacity: toolbarProgress,
              transform: [
                {
                  translateY: toolbarProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}>
          <StudyDocumentToolbar
            palette={palette}
            surfaceBg={NOTE_PAGE_BG}
            canUndo={canUndo}
            canRedo={canRedo}
            canResetDocument={blocks.some((block) => block.text.trim().length > 0)}
            activeBold={Boolean(focusedBlock?.text.includes('**'))}
            activeUnderline={Boolean(focusedBlock?.text.includes('__'))}
            activeListKind={focusedBlock ? canvasLineListKind(focusedBlock.text) : null}
            activeHeadingLevel={focusedBlock?.headingLevel ?? null}
            onAction={onToolbarAction}
            onRetainKeyboardFocus={retainEditorKeyboard}
          />
        </Animated.View>
      ) : null}

      {!listOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toolbarOpen ? t('studyNote.toolbarFabCloseA11y') : t('studyNote.toolbarFabMockA11y')}
          onPressIn={retainEditorKeyboard}
          onPress={() => {
            void Haptics.selectionAsync();
            animateToolbar(!toolbarOpen);
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
                  opacity: toolbarProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                  transform: [
                    {
                      rotate: toolbarProgress.interpolate({
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
                  opacity: toolbarProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      rotate: toolbarProgress.interpolate({
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

      {!listOpen && keyboardInset > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('studyNote.toolbarDismissKeyboard')}
          onPress={() => {
            retainKeyboardRef.current = false;
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
    overflow: 'visible',
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
  editorScroll: {
    flex: 1,
    minHeight: 0,
  },
  editorScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  blockInput: {
    alignSelf: 'stretch',
    padding: 0,
    margin: 0,
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
  toolbarFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
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
