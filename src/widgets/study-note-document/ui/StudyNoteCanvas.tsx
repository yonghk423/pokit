import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import {
  createWorkStudyNotePage,
  getWorkStudyActivePage,
  persistWorkStudyNotePageTitle,
  resolveWorkStudyNotePageAutoTitle,
  setWorkStudyActivePageBlocks,
  updateWorkStudyNotePageTitle,
  type WorkStudyDocument,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { pickImageFromLibrary } from '@shared/lib/media/pickImageFromLibrary';
import { normalizeWebUrl, openWebLink } from '@shared/lib/url/openWebLink';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import {
  applyCanvasListToDraft,
  applyCanvasToolbarToDraft,
  canvasBlocksToDraft,
  canvasDraftToBlocks,
  canvasLineHeadingLevel,
  canvasLineIndex,
  canvasLineLinkLead,
  canvasLineListKind,
  canvasLineRange,
  continueCanvasListAfterChange,
  detectCanvasLinkBackspace,
  ensureCanvasLinkGaps,
  exitCanvasListAfterBackspace,
  extractCanvasLineLink,
  insertCanvasLinkText,
  isCanvasProgrammaticTextEcho,
  mergeCanvasImageUris,
  removeCanvasLinkSpan,
  shiftCursorAfterLinePrefixChange,
  type CanvasLinkSpan,
} from '../lib/studyNoteCanvasToolbar';
import { studyNoteKeyboardBottomPad } from '../lib/studyNoteKeyboardPad';
import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';
import { StudyDocumentToolbar, type StudyToolbarAction } from './StudyDocumentToolbar';
import { StudyNotePageList } from './StudyNotePageList';
import { StudyNotePageTitleField } from './StudyNotePageTitleField';

const NOTE_PAGE_BG = RetroFlatColors.light.bg;
const NOTE_LINK_COLOR = '#1565C0';
const LINK_ICON_SIZE = 16;
const LINK_HIT_SIZE = 28;
const LINK_ICON_Y_ALIGN = 7;
const MAX_NOTE_PAGES = 30;

function ensurePageDocument(doc: WorkStudyDocument): WorkStudyDocument {
  if (doc.pages.length > 0) return doc;
  const page = createWorkStudyNotePage();
  return { pages: [page], activePageId: page.id };
}

function documentToDraft(doc: WorkStudyDocument): string {
  const page = getWorkStudyActivePage(doc);
  return ensureCanvasLinkGaps(canvasBlocksToDraft(page?.blocks ?? []));
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
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkAnchor, setLinkAnchor] = useState<{ start: number; end: number; line: number } | null>(null);
  const [linkIconPos, setLinkIconPos] = useState<Record<string, { x: number; y: number }>>({});
  const [noteColumnWidth, setNoteColumnWidth] = useState(0);
  const [historyTick, setHistoryTick] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const keyboardInsetRef = useRef(0);
  const draftRef = useRef(draft);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const programmaticEchoRef = useRef<{ expected: string; stale: string; until: number } | null>(null);
  const linkDeleteGuardRef = useRef(false);
  const fabProgress = useRef(new Animated.Value(0)).current;
  draftRef.current = draft;

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
    setLinkEditorOpen(false);
    setLinkDraft('');
    setLinkAnchor(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryTick((n) => n + 1);
  }, [document.activePageId, document.pages.length]);

  const persistDraft = useCallback(
    (text: string, options?: { programmatic?: boolean; cursor?: number }) => {
      if (options?.programmatic) {
        programmaticEchoRef.current = {
          expected: text,
          stale: draftRef.current,
          until: Date.now() + 800,
        };
      } else {
        programmaticEchoRef.current = null;
      }
      draftRef.current = text;
      setDraft(text);
      if (options?.cursor != null) {
        setSelection({ start: options.cursor, end: options.cursor });
        requestAnimationFrame(() => {
          inputRef.current?.setNativeProps({
            selection: { start: options.cursor, end: options.cursor },
          });
        });
      }
      onChangeDocument((prev) => {
        const withPage = ensurePageDocument(prev);
        const page = getWorkStudyActivePage(withPage);
        const next = mergeCanvasImageUris(canvasDraftToBlocks(text), page?.blocks ?? []);
        return setWorkStudyActivePageBlocks(withPage, next);
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

  const pickAndInsertImage = useCallback(async () => {
    const result = await pickImageFromLibrary();
    if (result.ok) {
      const current = draftRef.current;
      pushUndo(current);
      const next = applyCanvasToolbarToDraft(current, selection.start, 'image', selection.end) ?? `${current}\n[이미지]`;
      const pageBlocks = getWorkStudyActivePage(document)?.blocks ?? [];
      const blocks = mergeCanvasImageUris(canvasDraftToBlocks(next), pageBlocks);
      const emptyImage = [...blocks].reverse().find((block) => block.kind === 'image' && !block.imageUri?.trim());
      if (emptyImage) emptyImage.imageUri = result.uri;
      persistDraft(canvasBlocksToDraft(blocks), { programmatic: true });
      onChangeDocument((prev) => setWorkStudyActivePageBlocks(ensurePageDocument(prev), blocks));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (result.reason === 'cancelled') return;
    if (result.reason === 'permission_denied') {
      Alert.alert(t('studyNote.photoPermissionTitle'), t('studyNote.photoPermissionMessage'));
      return;
    }
    if (result.reason === 'module_unavailable') {
      Alert.alert(t('studyNote.rebuildTitle'), t('studyNote.rebuildMessage'));
      return;
    }
    Alert.alert(t('studyNote.photoLoadFailedTitle'), t('studyNote.photoLoadFailedMessage'));
  }, [document, onChangeDocument, persistDraft, pushUndo, selection.end, selection.start, t]);

  const handleOpenLink = useCallback(
    async (url: string) => {
      const opened = await openWebLink(url);
      if (!opened) {
        Alert.alert(t('studyNote.openLinkFailedTitle'), t('studyNote.openLinkFailedMessage'));
      }
    },
    [t],
  );

  const applyLink = useCallback(() => {
    const url = normalizeWebUrl(linkDraft) ?? linkDraft.trim();
    if (!url) return;
    const current = draftRef.current;
    const cursor = linkAnchor ?? { start: selection.start, end: selection.end, line: 0 };
    const inserted = insertCanvasLinkText(current, cursor.start, cursor.end, url);
    pushUndo(current);
    persistDraft(inserted.text, { programmatic: true, cursor: inserted.cursor });
    setLinkEditorOpen(false);
    setLinkDraft('');
    setLinkAnchor(null);
    void Haptics.selectionAsync();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [linkAnchor, linkDraft, persistDraft, pushUndo, selection.end, selection.start]);

  const confirmRemoveLink = useCallback(
    (span: CanvasLinkSpan) => {
      if (linkDeleteGuardRef.current) return;
      linkDeleteGuardRef.current = true;
      const current = draftRef.current;
      Alert.alert(t('studyNote.deleteLinkTitle'), t('studyNote.deleteLinkMessage'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => {
            linkDeleteGuardRef.current = false;
            persistDraft(current, { programmatic: true, cursor: span.end });
            requestAnimationFrame(() => inputRef.current?.focus());
          },
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            linkDeleteGuardRef.current = false;
            const removed = removeCanvasLinkSpan(current, span);
            pushUndo(current);
            persistDraft(removed.text, { programmatic: true, cursor: removed.cursor });
            void Haptics.selectionAsync();
            requestAnimationFrame(() => inputRef.current?.focus());
          },
        },
      ]);
    },
    [persistDraft, pushUndo, t],
  );

  const onToolbarAction = useCallback(
    (action: StudyToolbarAction) => {
      if (action === 'dismiss-keyboard') {
        void Haptics.selectionAsync();
        Keyboard.dismiss();
        return;
      }
      if (action === 'undo') {
        const prev = undoStackRef.current.pop();
        if (prev == null) return;
        redoStackRef.current.push(draftRef.current);
        persistDraft(prev, { programmatic: true });
        setHistoryTick((n) => n + 1);
        void Haptics.selectionAsync();
        return;
      }
      if (action === 'redo') {
        const next = redoStackRef.current.pop();
        if (next == null) return;
        undoStackRef.current.push(draftRef.current);
        persistDraft(next, { programmatic: true });
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
              pushUndo(draftRef.current);
              persistDraft('', { programmatic: true });
              setLinkEditorOpen(false);
              setLinkDraft('');
              setLinkAnchor(null);
              void Haptics.selectionAsync();
            },
          },
        ]);
        return;
      }
      if (action === 'image') {
        void pickAndInsertImage();
        return;
      }
      if (action === 'link') {
        if (linkEditorOpen) {
          setLinkEditorOpen(false);
          setLinkDraft('');
          setLinkAnchor(null);
          void Haptics.selectionAsync();
          return;
        }
        const current = draftRef.current;
        setLinkAnchor({
          start: selection.start,
          end: selection.end,
          line: canvasLineIndex(current, selection.start),
        });
        setLinkDraft(
          extractCanvasLineLink(
            current.slice(Math.min(selection.start, selection.end), Math.max(selection.start, selection.end)),
          )
            ?? extractCanvasLineLink(canvasLineRange(current, selection.start).line)
            ?? '',
        );
        setLinkEditorOpen(true);
        void Haptics.selectionAsync();
        return;
      }
      const current = draftRef.current;
      if (action === 'bullet' || action === 'numbered') {
        const next = applyCanvasListToDraft(current, selection.start, selection.end, action);
        if (next.text === current) {
          void Haptics.selectionAsync();
          return;
        }
        pushUndo(current);
        persistDraft(next.text, { programmatic: true, cursor: next.cursor });
        void Haptics.selectionAsync();
        return;
      }
      const next = applyCanvasToolbarToDraft(current, selection.start, action, selection.end);
      if (next == null || next === current) {
        void Haptics.selectionAsync();
        return;
      }
      pushUndo(current);
      persistDraft(next, {
        programmatic: true,
        cursor:
          action === 'heading-1' || action === 'heading-2' || action === 'heading-3'
            ? shiftCursorAfterLinePrefixChange(current, next, selection.start)
            : undefined,
      });
      void Haptics.selectionAsync();
    },
    [linkEditorOpen, persistDraft, pickAndInsertImage, pushUndo, selection.end, selection.start, t],
  );

  const fontSize = width >= 768 ? 26 : width >= 390 ? 22 : 20;
  const lineHeight = Math.round(fontSize * 1.45);
  const keyboardPad = studyNoteKeyboardBottomPad(keyboardInset, bottomTabBarHeight);
  const currentLine = canvasLineRange(draft, selection.start).line;
  const lineLinkHits = useMemo(
    () =>
      draft.split('\n').flatMap((line, index) => {
        const url = extractCanvasLineLink(line);
        if (!url || url === 'https://') return [];
        return [{ index, url, lead: canvasLineLinkLead(line, url) }];
      }),
    [draft],
  );
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  void historyTick;

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
        <View
          style={styles.noteBody}
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.width);
            if (next > 0 && next !== noteColumnWidth) setNoteColumnWidth(next);
          }}>
        <ThemedTextInput
          ref={inputRef}
          value={draft}
          onChangeText={(text) => {
            const echo = programmaticEchoRef.current;
            if (isCanvasProgrammaticTextEcho(echo, text, Date.now())) {
              if (echo && text === echo.expected) {
                programmaticEchoRef.current = null;
              }
              return;
            }
            programmaticEchoRef.current = null;
            const prev = draftRef.current;
            if (linkDeleteGuardRef.current) {
              persistDraft(prev, { programmatic: true });
              return;
            }
            const linkSpan = detectCanvasLinkBackspace(prev, text);
            if (linkSpan) {
              persistDraft(prev, { programmatic: true, cursor: linkSpan.end });
              confirmRemoveLink(linkSpan);
              return;
            }
            const prefixed = continueCanvasListAfterChange(draftRef.current, text);
            if (prefixed) {
              persistDraft(prefixed.text, { programmatic: true, cursor: prefixed.cursor });
              return;
            }
            const exited = exitCanvasListAfterBackspace(draftRef.current, text);
            if (exited) {
              persistDraft(exited.text, { programmatic: true, cursor: exited.cursor });
              return;
            }
            persistDraft(text);
          }}
          placeholder={t('studyNote.emptyTitle')}
          placeholderTextColor={palette.outline}
          multiline
          scrollEnabled
          textAlignVertical="top"
          onSelectionChange={(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
            setSelection(event.nativeEvent.selection);
          }}
          style={inputStyle}
        />
            {linkEditorOpen && linkAnchor ? (
              <View
                style={[
                  styles.cursorLinkEditor,
                  {
                    top: linkAnchor.line * lineHeight,
                    backgroundColor: NOTE_PAGE_BG,
                    borderColor: palette.outlineVariant,
                  },
                ]}>
                <TextInput
                  value={linkDraft}
                  onChangeText={setLinkDraft}
                  placeholder="https://"
                  placeholderTextColor={palette.outline}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  autoFocus
                  style={[styles.cursorLinkInput, { color: palette.onSurface }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.apply')}
                  onPress={applyLink}
                  style={[styles.cursorLinkApply, { borderColor: palette.onSurface }]}>
                  <ThemedText style={[styles.cursorLinkApplyLabel, { color: palette.onSurface }]}>
                    {t('common.apply')}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
            {!linkEditorOpen
              ? lineLinkHits.map((item) => {
                  const key = `${item.index}-${item.url}`;
                  const pos = linkIconPos[key];
                  return (
                    <View key={key} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                      <ThemedText
                        pointerEvents="none"
                        onTextLayout={(event) => {
                          const last = event.nativeEvent.lines.at(-1);
                          const textLineH = last?.height ?? lineHeight;
                          const next = {
                            x: (last?.width ?? 0) + 2,
                            y:
                              item.index * lineHeight +
                              (last?.y ?? 0) +
                              (textLineH - LINK_HIT_SIZE) / 2 +
                              LINK_ICON_Y_ALIGN,
                          };
                          setLinkIconPos((prevPos) => {
                            const cur = prevPos[key];
                            if (cur && Math.abs(cur.x - next.x) < 0.5 && Math.abs(cur.y - next.y) < 0.5) {
                              return prevPos;
                            }
                            return { ...prevPos, [key]: next };
                          });
                        }}
                        style={[
                          styles.cursorLinkMeasure,
                          {
                            fontSize,
                            lineHeight,
                            width: noteColumnWidth > 0 ? noteColumnWidth : '100%',
                          },
                        ]}>
                        {item.lead}
                      </ThemedText>
                      {pos ? (
                        <Pressable
                          accessibilityRole="link"
                          accessibilityLabel={t('studyNote.openLinkA11y', { url: item.url })}
                          onPress={() => void handleOpenLink(item.url)}
                          style={[styles.cursorLinkHit, { top: pos.y, left: pos.x }]}>
                          <IconSymbol name="link" size={LINK_ICON_SIZE} color={NOTE_LINK_COLOR} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              : null}
        </View>
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
        <Animated.View
          pointerEvents={fabOpen ? 'auto' : 'none'}
          style={[
            styles.toolbarFloat,
            {
              bottom: keyboardPad + 64,
              backgroundColor: NOTE_PAGE_BG,
              borderTopColor: palette.outlineVariant,
              opacity: fabProgress,
              transform: [
                {
                  translateY: fabProgress.interpolate({
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
            linkPickerOpen={linkEditorOpen}
            canUndo={canUndo}
            canRedo={canRedo}
            canResetDocument={draft.trim().length > 0}
            activeBold={currentLine.includes('**')}
            activeUnderline={currentLine.includes('__')}
            activeListKind={canvasLineListKind(currentLine)}
            activeHeadingLevel={canvasLineHeadingLevel(currentLine)}
            onAction={onToolbarAction}
            onRetainKeyboardFocus={retainEditorKeyboard}
          />
        </Animated.View>
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
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  noteBody: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  cursorLinkEditor: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cursorLinkInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  cursorLinkApply: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cursorLinkApplyLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  cursorLinkMeasure: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    includeFontPadding: false,
    fontWeight: '500',
  },
  cursorLinkHit: {
    position: 'absolute',
    zIndex: 2,
    width: LINK_HIT_SIZE,
    height: LINK_HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 120,
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'stretch',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    fontWeight: '500',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  listLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  toolbarFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 11,
    elevation: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
