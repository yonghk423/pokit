import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Alert,
  Animated,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  WORK_STUDY_HEADING_ACCENTS,
  WORK_STUDY_TABLE_MAX_COLS,
  WORK_STUDY_TABLE_MAX_ROWS,
  createWorkStudyDocBlock,
  createWorkStudyNotePage,
  getWorkStudyActivePage,
  resolveWorkStudyNotePageLabel,
  setWorkStudyActivePageBlocks,
  type WorkStudyDocBlock,
  type WorkStudyDocument,
  type WorkStudyHeadingLevel,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { pickImageFromLibrary } from '@shared/lib/media/pickImageFromLibrary';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import { StudyDocumentToolbar, type StudyToolbarAction } from './StudyDocumentToolbar';
import { StudyNotePageList } from './StudyNotePageList';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const NOTE_PAGE_BG = RetroFlatColors.light.bg;
const DRAWER_MAX_WIDTH = 320;
const DRAWER_WIDTH_RATIO = 0.82;
const KEYBOARD_ACCESSORY_ESTIMATED_HEIGHT = 132;
const STUDY_DOCUMENT_INPUT_ACCESSORY_ID = 'study-document-toolbar';

const MAX_HISTORY = 40;

function cloneDocument(doc: WorkStudyDocument): WorkStudyDocument {
  return {
    activePageId: doc.activePageId,
    pages: doc.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => ({
        ...b,
        marks: b.marks ? { ...b.marks } : undefined,
        tableRows: b.tableRows?.map((row) => [...row]),
      })),
    })),
  };
}

function headingCount(blocks: WorkStudyDocBlock[]): number {
  return blocks.filter((b) => b.kind === 'heading').length;
}

function nextAccentIndex(blocks: WorkStudyDocBlock[]): number {
  return headingCount(blocks) % WORK_STUDY_HEADING_ACCENTS.length;
}

function numberedIndexForBlock(blocks: WorkStudyDocBlock[], blockId: string): number {
  let n = 0;
  for (const block of blocks) {
    if (block.kind === 'numbered') {
      n += 1;
      if (block.id === blockId) return n;
    } else if (block.kind === 'heading') {
      n = 0;
    }
  }
  return n;
}

function blockNeedsTailParagraph(block: WorkStudyDocBlock): boolean {
  return block.kind === 'image' || block.kind === 'table';
}

function normalizeWorkStudyImageUri(raw?: string): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  if (trimmed.startsWith('file://') || /^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `file://${trimmed}`;
  return trimmed;
}

function ensureTailParagraphs(blocks: WorkStudyDocBlock[]): WorkStudyDocBlock[] {
  const next: WorkStudyDocBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    next.push(block);
    if (!blockNeedsTailParagraph(block)) continue;
    const after = blocks[i + 1];
    if (!after || after.kind !== 'paragraph') {
      next.push(createWorkStudyDocBlock('paragraph'));
    }
  }
  return next;
}

function BlockText({
  block,
  palette,
  onChangeText,
  onFocus,
  onBackspaceAtStart,
  placeholder,
  multiline = false,
  style,
}: {
  block: WorkStudyDocBlock;
  palette: Palette;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBackspaceAtStart?: () => void;
  placeholder: string;
  multiline?: boolean;
  style?: object;
}) {
  const bold = block.marks?.bold;
  const underline = block.marks?.underline;
  return (
    <TextInput
      value={block.text}
      onChangeText={onChangeText}
      onFocus={onFocus}
      inputAccessoryViewID={Platform.OS === 'ios' ? STUDY_DOCUMENT_INPUT_ACCESSORY_ID : undefined}
      onKeyPress={(event) => {
        if (event.nativeEvent.key === 'Backspace' && block.text.length === 0) {
          onBackspaceAtStart?.();
        }
      }}
      placeholder={placeholder}
      placeholderTextColor={palette.outline}
      multiline={multiline}
      scrollEnabled={false}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        styles.blockInput,
        style,
        {
          color: palette.onSurface,
          fontWeight: bold ? '800' : '600',
          textDecorationLine: underline ? 'underline' : 'none',
        },
      ]}
    />
  );
}

function StudyDocumentBlockView({
  block,
  blocks,
  blockIndex,
  palette,
  onFocusBlock,
  onChangeBlock,
  onPickImage,
  onBackspaceAtStart,
  paragraphMinHeight,
}: {
  block: WorkStudyDocBlock;
  blocks: WorkStudyDocBlock[];
  blockIndex: number;
  palette: Palette;
  onFocusBlock: (id: string) => void;
  onChangeBlock: (id: string, patch: Partial<WorkStudyDocBlock>) => void;
  onPickImage: () => void;
  onBackspaceAtStart?: () => void;
  paragraphMinHeight?: number;
}) {
  const rowShellStyle = styles.blockRow;

  if (block.kind === 'heading') {
    const accent = WORK_STUDY_HEADING_ACCENTS[block.accentIndex ?? 0] ?? WORK_STUDY_HEADING_ACCENTS[0];
    const level = block.headingLevel ?? 1;
    const titleSize = level === 1 ? 14 : level === 2 ? 13 : 12;
    return (
      <View style={[rowShellStyle, styles.headingWrap]}>
        <View style={[styles.headingBand, { backgroundColor: accent }]}>
          <TextInput
            value={block.text}
            onChangeText={(text) => onChangeBlock(block.id, { text })}
            onFocus={() => onFocusBlock(block.id)}
            inputAccessoryViewID={Platform.OS === 'ios' ? STUDY_DOCUMENT_INPUT_ACCESSORY_ID : undefined}
            placeholder="구역 라벨"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={[styles.headingPrimary, { fontSize: titleSize, color: '#fff' }]}
          />
          <TextInput
            value={block.subtitle ?? ''}
            onChangeText={(subtitle) => onChangeBlock(block.id, { subtitle })}
            onFocus={() => onFocusBlock(block.id)}
            inputAccessoryViewID={Platform.OS === 'ios' ? STUDY_DOCUMENT_INPUT_ACCESSORY_ID : undefined}
            placeholder="보조 라벨"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={[styles.headingSecondary, { fontSize: titleSize - 1, color: 'rgba(255,255,255,0.92)' }]}
          />
        </View>
      </View>
    );
  }

  if (block.kind === 'table') {
    const rows = block.tableRows ?? [['', ''], ['', '']];
    const colCount = rows[0]?.length ?? 2;
    const canAddRow = rows.length < WORK_STUDY_TABLE_MAX_ROWS;
    const canAddCol = colCount < WORK_STUDY_TABLE_MAX_COLS;

    const addTableRow = () => {
      if (!canAddRow) return;
      onChangeBlock(block.id, { tableRows: [...rows.map((r) => [...r]), Array.from({ length: colCount }, () => '')] });
    };

    const addTableCol = () => {
      if (!canAddCol) return;
      onChangeBlock(block.id, { tableRows: rows.map((r) => [...r, '']) });
    };

    return (
      <View style={rowShellStyle}>
        <View style={[styles.tableWrap, { borderColor: palette.outlineVariant }]}>
          {rows.map((row, rowIdx) => (
            <View key={`${block.id}-r-${rowIdx}`} style={[styles.tableRow, { borderColor: palette.outlineVariant }]}>
              {row.map((cell, colIdx) => (
                <TextInput
                  key={`${block.id}-c-${rowIdx}-${colIdx}`}
                  value={cell}
                  onChangeText={(text) => {
                    const nextRows = rows.map((r) => [...r]);
                    nextRows[rowIdx]![colIdx] = text;
                    onChangeBlock(block.id, { tableRows: nextRows });
                  }}
                  onFocus={() => onFocusBlock(block.id)}
                  inputAccessoryViewID={Platform.OS === 'ios' ? STUDY_DOCUMENT_INPUT_ACCESSORY_ID : undefined}
                  placeholder={`${rowIdx + 1}-${colIdx + 1}`}
                  placeholderTextColor={palette.outline}
                  style={[styles.tableCell, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
                />
              ))}
            </View>
          ))}
        </View>
        {(canAddRow || canAddCol) ? (
          <View style={styles.tableControls}>
            {canAddRow ? (
              <Pressable
                onPress={addTableRow}
                style={[styles.tableControlBtn, { borderColor: palette.outlineVariant }]}
                accessibilityRole="button"
                accessibilityLabel="행 추가"
              >
                <IconSymbol name="plus" size={12} color={palette.onVariant} />
                <ThemedText style={[styles.tableControlLabel, { color: palette.onVariant }]}>행 추가</ThemedText>
              </Pressable>
            ) : null}
            {canAddCol ? (
              <Pressable
                onPress={addTableCol}
                style={[styles.tableControlBtn, { borderColor: palette.outlineVariant }]}
                accessibilityRole="button"
                accessibilityLabel="열 추가"
              >
                <IconSymbol name="plus" size={12} color={palette.onVariant} />
                <ThemedText style={[styles.tableControlLabel, { color: palette.onVariant }]}>열 추가</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (block.kind === 'image') {
    const uri = normalizeWorkStudyImageUri(block.imageUri);
    return (
      <View style={[rowShellStyle, styles.imageWrap, { borderColor: palette.outlineVariant }]}>
        <Pressable
          onPress={onPickImage}
          accessibilityRole="button"
          accessibilityLabel={uri ? '앨범에서 사진 변경' : '앨범에서 사진 선택'}
          style={styles.imagePickArea}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" recyclingKey={uri} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
              <IconSymbol name="photo.on.rectangle.angled" size={28} color={palette.onVariant} />
              <ThemedText style={[styles.imagePickLabel, { color: palette.onVariant }]}>앨범에서 선택</ThemedText>
            </View>
          )}
        </Pressable>
        {uri ? (
          <Pressable
            onPress={onPickImage}
            accessibilityRole="button"
            accessibilityLabel="사진 변경"
            style={[styles.imageChangeBtn, { borderColor: palette.outlineVariant }]}
          >
            <IconSymbol name="photo.on.rectangle.angled" size={14} color={palette.onVariant} />
            <ThemedText style={[styles.imageChangeLabel, { color: palette.onVariant }]}>사진 변경</ThemedText>
          </Pressable>
        ) : null}
        <BlockText
          block={block}
          palette={palette}
          onChangeText={(text) => onChangeBlock(block.id, { text })}
          onFocus={() => onFocusBlock(block.id)}
          placeholder="캡션 (선택)"
        />
      </View>
    );
  }

  const rowPrefix =
    block.kind === 'checklist' ? (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: block.checked === true }}
        onPress={() => onChangeBlock(block.id, { checked: !block.checked })}
        style={[
          styles.checkBox,
          {
            borderColor: block.checked ? palette.onSurface : palette.outline,
            backgroundColor: block.checked ? palette.onSurface : 'transparent',
          },
        ]}>
        {block.checked ? <IconSymbol name="checkmark" size={12} color="#fff" /> : null}
      </Pressable>
    ) : block.kind === 'bullet' ? (
      <ThemedText style={[styles.listMarker, { color: palette.onVariant }]}>•</ThemedText>
    ) : block.kind === 'numbered' ? (
      <ThemedText style={[styles.listMarker, { color: palette.onVariant }]}>
        {numberedIndexForBlock(blocks, block.id)}.
      </ThemedText>
    ) : null;

  return (
    <View style={[rowShellStyle, styles.row]}>
      {rowPrefix}
      <View style={styles.rowBody}>
        <BlockText
          block={block}
          palette={palette}
          onChangeText={(text) => onChangeBlock(block.id, { text })}
          onFocus={() => onFocusBlock(block.id)}
          onBackspaceAtStart={onBackspaceAtStart}
          placeholder={
            block.kind === 'checklist'
              ? '할 일'
              : block.kind === 'paragraph'
                ? '본문'
                : '항목'
          }
          multiline={block.kind === 'paragraph'}
          style={
            block.kind === 'paragraph'
              ? [
                  styles.paragraphInput,
                  blockIndex > 0 && blockNeedsTailParagraph(blocks[blockIndex - 1]!)
                    ? styles.structuralTailParagraph
                    : blocks[blockIndex + 1] && blockNeedsTailParagraph(blocks[blockIndex + 1]!)
                      ? styles.compactParagraph
                      : null,
                  paragraphMinHeight ? { minHeight: paragraphMinHeight } : null,
                ]
              : undefined
          }
        />
        {block.marks?.link ? (
          <ThemedText style={[styles.linkMeta, { color: palette.onVariant }]} numberOfLines={1}>
            🔗 {block.marks.link}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export function StudyDocumentEditor({
  document,
  onChangeDocument,
  palette,
}: {
  document: WorkStudyDocument;
  onChangeDocument: Dispatch<SetStateAction<WorkStudyDocument>>;
  palette: Palette;
}) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const drawerOpenRef = useRef(false);
  const undoStack = useRef<WorkStudyDocument[]>([]);
  const redoStack = useRef<WorkStudyDocument[]>([]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const drawerWidth = Math.min(DRAWER_MAX_WIDTH, Math.round(windowWidth * DRAWER_WIDTH_RATIO));
  const drawerSlideX = useRef(new Animated.Value(-drawerWidth)).current;
  const drawerBackdropOpacity = useRef(new Animated.Value(0)).current;
  const documentRef = useRef(document);
  documentRef.current = document;

  const canUndo = historyTick >= 0 && undoStack.current.length > 0;
  const canRedo = historyTick >= 0 && redoStack.current.length > 0;

  const pushHistory = useCallback(() => {
    undoStack.current = [...undoStack.current.slice(-(MAX_HISTORY - 1)), cloneDocument(document)];
    redoStack.current = [];
    setHistoryTick((n) => n + 1);
  }, [document]);

  const applyDocument = useCallback(
    (next: WorkStudyDocument) => {
      onChangeDocument(next);
    },
    [onChangeDocument],
  );

  const activePage = getWorkStudyActivePage(document);
  const activeBlocks = activePage?.blocks ?? [];
  const tailFixKeyRef = useRef('');

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (document.pages.length > 0) return;
    const page = createWorkStudyNotePage();
    applyDocument({ pages: [page], activePageId: page.id });
  }, [applyDocument, document.pages.length]);

  const openDrawer = useCallback(() => {
    void Haptics.selectionAsync();
    drawerSlideX.setValue(-drawerWidth);
    drawerBackdropOpacity.setValue(0);
    setDrawerOpen(true);
  }, [drawerBackdropOpacity, drawerSlideX, drawerWidth]);

  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    if (!drawerOpenRef.current) return;
    Animated.parallel([
      Animated.timing(drawerSlideX, {
        toValue: -drawerWidth,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(drawerBackdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setDrawerOpen(false);
    });
  }, [drawerBackdropOpacity, drawerSlideX, drawerWidth]);

  useEffect(() => {
    if (!drawerOpen) return;
    Animated.parallel([
      Animated.spring(drawerSlideX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 260,
        mass: 0.85,
      }),
      Animated.timing(drawerBackdropOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerBackdropOpacity, drawerOpen, drawerSlideX]);

  useEffect(() => {
    drawerSlideX.setValue(-drawerWidth);
  }, [drawerSlideX, drawerWidth]);

  const ensurePageDocument = useCallback((base?: WorkStudyDocument): WorkStudyDocument => {
    const doc = base ?? documentRef.current;
    if (doc.pages.length > 0) return doc;
    const page = createWorkStudyNotePage();
    return { pages: [page], activePageId: page.id };
  }, []);

  const replaceActiveBlocks = useCallback(
    (blocks: WorkStudyDocBlock[]) => {
      const withPage = ensurePageDocument();
      applyDocument(setWorkStudyActivePageBlocks(withPage, blocks));
    },
    [applyDocument, ensurePageDocument],
  );

  useEffect(() => {
    const fixed = ensureTailParagraphs(activeBlocks);
    const nextKey = fixed.map((block) => block.id).join('|');
    if (nextKey === tailFixKeyRef.current) return;
    const unchanged =
      fixed.length === activeBlocks.length && fixed.every((block, index) => block.id === activeBlocks[index]?.id);
    tailFixKeyRef.current = nextKey;
    if (unchanged) return;
    replaceActiveBlocks(fixed);
  }, [activeBlocks, replaceActiveBlocks]);

  const replaceDocument = useCallback(
    (next: WorkStudyDocument) => {
      applyDocument(next);
    },
    [applyDocument],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<WorkStudyDocBlock>) => {
      replaceActiveBlocks(activeBlocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [activeBlocks, replaceActiveBlocks],
  );

  const deletePreviousBlock = useCallback(
    (blockId: string) => {
      const withPage = ensurePageDocument();
      const page = getWorkStudyActivePage(withPage);
      const blocks = page?.blocks ?? [];
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index <= 0) return;
      pushHistory();
      replaceActiveBlocks(blocks.filter((_, blockIndex) => blockIndex !== index - 1));
      setActiveBlockId(blockId);
      void Haptics.selectionAsync();
    },
    [ensurePageDocument, pushHistory, replaceActiveBlocks],
  );

  const pickImageForBlock = useCallback(
    async (blockId: string) => {
      const result = await pickImageFromLibrary();
      if (result.ok) {
        const imageUri = normalizeWorkStudyImageUri(result.uri);
        undoStack.current = [
          ...undoStack.current.slice(-(MAX_HISTORY - 1)),
          cloneDocument(documentRef.current),
        ];
        redoStack.current = [];
        setHistoryTick((n) => n + 1);
        onChangeDocument((prev) => {
          const withPage = prev.pages.length > 0 ? prev : ensurePageDocument(prev);
          const page = getWorkStudyActivePage(withPage);
          const blocks = page?.blocks ?? [];
          return setWorkStudyActivePageBlocks(
            withPage,
            blocks.map((b) => (b.id === blockId ? { ...b, imageUri } : b)),
          );
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      if (result.reason === 'permission_denied') {
        Alert.alert(
          '사진 접근 권한',
          '앨범에서 사진을 선택하려면 설정에서 사진 접근을 허용해 주세요.',
        );
        return;
      }
      if (result.reason === 'module_unavailable') {
        Alert.alert(
          '앱을 다시 빌드해 주세요',
          '앨범에서 사진을 선택하려면 새 네이티브 모듈이 필요해요. 실행 중인 앱을 종료한 뒤 터미널에서 npx expo run:ios --device 를 다시 실행해 주세요.',
        );
        return;
      }
      if (result.reason === 'error') {
        Alert.alert('사진을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
      }
    },
    [ensurePageDocument, onChangeDocument],
  );

  const commitStructuralChange = useCallback(
    (blocks: WorkStudyDocBlock[]) => {
      pushHistory();
      replaceActiveBlocks(blocks);
    },
    [pushHistory, replaceActiveBlocks],
  );

  const insertBlock = useCallback(
    (kind: WorkStudyDocBlock['kind'], options?: { headingLevel?: WorkStudyHeadingLevel }) => {
      const withPage = ensurePageDocument();
      const page = getWorkStudyActivePage(withPage);
      const blocks = page?.blocks ?? [];
      const block = createWorkStudyDocBlock(kind, {
        headingLevel: options?.headingLevel,
        accentIndex: kind === 'heading' ? nextAccentIndex(blocks) : undefined,
      });
      commitStructuralChange([...blocks, block]);
      setActiveBlockId(block.id);
      void Haptics.selectionAsync();
    },
    [commitStructuralChange, ensurePageDocument],
  );

  const resetDocument = useCallback(() => {
    if (activeBlocks.length === 0) return;
    Alert.alert('메모 전체 지우기', '이 메모 내용을 모두 지울까요? 실행 취소로 되돌릴 수 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '전체 지우기',
        style: 'destructive',
        onPress: () => {
          pushHistory();
          replaceActiveBlocks([]);
          setActiveBlockId(null);
          setShowLinkInput(false);
          setLinkDraft('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [activeBlocks.length, pushHistory, replaceActiveBlocks]);

  const selectPage = useCallback(
    (pageId: string) => {
      if (pageId !== document.activePageId) {
        applyDocument({ ...document, activePageId: pageId });
        setActiveBlockId(null);
        setShowLinkInput(false);
        setLinkDraft('');
      }
      closeDrawer();
    },
    [applyDocument, closeDrawer, document],
  );

  const addPage = useCallback(
    (options?: { closeDrawer?: boolean }) => {
      if (document.pages.length >= 30) return;
      pushHistory();
      const page = createWorkStudyNotePage();
      applyDocument({
        pages: [...document.pages, page],
        activePageId: page.id,
      });
      setActiveBlockId(null);
      setShowLinkInput(false);
      setLinkDraft('');
      if (options?.closeDrawer) closeDrawer();
    },
    [applyDocument, closeDrawer, document.pages, pushHistory],
  );

  const deletePage = useCallback(
    (pageId: string) => {
      if (document.pages.length <= 1) return;
      pushHistory();
      const nextPages = document.pages.filter((page) => page.id !== pageId);
      const nextActive =
        document.activePageId === pageId
          ? nextPages[Math.max(0, document.pages.findIndex((page) => page.id === pageId) - 1)]?.id ??
            nextPages[0]?.id ??
            ''
          : document.activePageId;
      applyDocument({ pages: nextPages, activePageId: nextActive });
      setActiveBlockId(null);
      setShowLinkInput(false);
      setLinkDraft('');
    },
    [applyDocument, document.activePageId, document.pages, pushHistory],
  );

  const activePageLabel = activePage
    ? resolveWorkStudyNotePageLabel(activePage, document.pages)
    : '메모';

  const toggleMark = useCallback(
    (key: 'bold' | 'underline') => {
      if (!activeBlockId) return;
      const block = activeBlocks.find((b) => b.id === activeBlockId);
      if (!block || block.kind === 'table' || block.kind === 'image') return;
      pushHistory();
      const marks = { ...block.marks, [key]: !block.marks?.[key] };
      if (!marks.bold) delete marks.bold;
      if (!marks.underline) delete marks.underline;
      replaceActiveBlocks(
        activeBlocks.map((b) =>
          b.id === activeBlockId ? { ...b, marks: Object.keys(marks).length ? marks : undefined } : b,
        ),
      );
    },
    [activeBlockId, activeBlocks, pushHistory, replaceActiveBlocks],
  );

  const applyLink = useCallback(() => {
    if (!activeBlockId) return;
    pushHistory();
    const url = linkDraft.trim();
    if (!url) {
      replaceActiveBlocks(
        activeBlocks.map((b) => (b.id === activeBlockId ? { ...b, marks: undefined } : b)),
      );
    } else {
      const block = activeBlocks.find((b) => b.id === activeBlockId);
      replaceActiveBlocks(
        activeBlocks.map((b) =>
          b.id === activeBlockId ? { ...b, marks: { ...block?.marks, link: url } } : b,
        ),
      );
    }
    setShowLinkInput(false);
    setLinkDraft('');
  }, [activeBlockId, activeBlocks, linkDraft, pushHistory, replaceActiveBlocks]);

  const onToolbarAction = useCallback(
    (action: StudyToolbarAction) => {
      switch (action) {
        case 'undo': {
          const prev = undoStack.current.pop();
          if (!prev) return;
          redoStack.current.push(cloneDocument(document));
          replaceDocument(prev);
          setHistoryTick((n) => n + 1);
          break;
        }
        case 'redo': {
          const next = redoStack.current.pop();
          if (!next) return;
          undoStack.current.push(cloneDocument(document));
          replaceDocument(next);
          setHistoryTick((n) => n + 1);
          break;
        }
        case 'checklist':
          insertBlock('checklist');
          break;
        case 'bullet':
          insertBlock('bullet');
          break;
        case 'numbered':
          insertBlock('numbered');
          break;
        case 'table': {
          const withPage = ensurePageDocument();
          const page = getWorkStudyActivePage(withPage);
          const blocks = page?.blocks ?? [];
          const block = createWorkStudyDocBlock('table');
          const tail = createWorkStudyDocBlock('paragraph');
          commitStructuralChange([...blocks, block, tail]);
          setActiveBlockId(tail.id);
          void Haptics.selectionAsync();
          break;
        }
        case 'image': {
          const withPage = ensurePageDocument();
          const page = getWorkStudyActivePage(withPage);
          const blocks = page?.blocks ?? [];
          const block = createWorkStudyDocBlock('image');
          const tail = createWorkStudyDocBlock('paragraph');
          commitStructuralChange([...blocks, block, tail]);
          setActiveBlockId(tail.id);
          void Haptics.selectionAsync();
          void pickImageForBlock(block.id);
          break;
        }
        case 'bold':
          toggleMark('bold');
          break;
        case 'underline':
          toggleMark('underline');
          break;
        case 'link': {
          const block = activeBlockId ? activeBlocks.find((b) => b.id === activeBlockId) : null;
          setLinkDraft(block?.marks?.link ?? '');
          setShowLinkInput(true);
          break;
        }
        case 'reset-document':
          resetDocument();
          break;
        default:
          break;
      }
    },
    [activeBlockId, activeBlocks, ensurePageDocument, insertBlock, pickImageForBlock, replaceDocument, resetDocument, toggleMark],
  );

  const empty = activeBlocks.length === 0;
  const canvasMinHeight = Math.round(Math.max(380, windowHeight * 0.5));
  const singleParagraph = activeBlocks.length === 1 && activeBlocks[0]?.kind === 'paragraph';
  const paragraphMinHeight = singleParagraph ? canvasMinHeight - 24 : undefined;
  const keyboardOpen = keyboardInset > 0;
  const showDockedToolbar = Platform.OS !== 'ios' || !keyboardOpen;
  const accessoryReserve =
    (showDockedToolbar ? (showLinkInput ? 56 : 0) + KEYBOARD_ACCESSORY_ESTIMATED_HEIGHT : 12);

  const toolbarAccessory = (
    <>
      {showLinkInput ? (
        <View style={[styles.linkRow, { borderColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
          <TextInput
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder="https://..."
            placeholderTextColor={palette.outline}
            autoCapitalize="none"
            inputAccessoryViewID={Platform.OS === 'ios' ? STUDY_DOCUMENT_INPUT_ACCESSORY_ID : undefined}
            style={[styles.linkInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
          />
          <Pressable onPress={applyLink} style={[styles.linkApply, { borderColor: palette.onSurface }]}>
            <ThemedText style={{ color: palette.onSurface, fontWeight: '700', fontSize: 12 }}>적용</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { borderTopColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
        <StudyDocumentToolbar
          palette={palette}
          surfaceBg={NOTE_PAGE_BG}
          canUndo={canUndo}
          canRedo={canRedo}
          canResetDocument={activeBlocks.length > 0}
          onAction={onToolbarAction}
        />
      </View>
    </>
  );

  return (
    <View style={[styles.shell, { backgroundColor: NOTE_PAGE_BG }]}>
      <View style={[styles.editorHeader, { borderBottomColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="메모 목록 열기"
          onPress={openDrawer}
          hitSlop={8}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.65 }]}>
          <IconSymbol name="line.3.horizontal" size={20} color={palette.onSurface} />
        </Pressable>
        <ThemedText style={[styles.editorTitle, { color: palette.onSurface }]} numberOfLines={1}>
          {activePageLabel}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 메모 작성"
          onPress={() => {
            void Haptics.selectionAsync();
            addPage();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.headerComposeBtn, pressed && { opacity: 0.65 }]}>
          <IconSymbol name="square.and.pencil" size={18} color={palette.onSurface} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.canvasScroll}
        contentContainerStyle={{ paddingBottom: accessoryReserve + 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.canvas, { minHeight: canvasMinHeight, backgroundColor: NOTE_PAGE_BG }]}>
        {empty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="노트 작성 시작"
            onPress={() => insertBlock('paragraph')}
            style={[
              styles.emptyCanvas,
              { minHeight: canvasMinHeight, borderColor: palette.outlineVariant },
            ]}>
            <IconSymbol name="square.and.pencil" size={24} color={palette.onVariant} />
            <ThemedText style={[styles.emptyTitle, { color: palette.onSurface }]}>
              여기에 노트를 작성하세요
            </ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.onVariant }]}>
              탭하면 본문이 추가돼요 · 아래 툴바로 서식을 넣을 수 있어요
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.blocksInner}>
            {activeBlocks.map((block, blockIndex) => (
              <StudyDocumentBlockView
                key={block.id}
                block={block}
                blocks={activeBlocks}
                blockIndex={blockIndex}
                palette={palette}
                onFocusBlock={setActiveBlockId}
                onChangeBlock={updateBlock}
                onPickImage={() => {
                  void pickImageForBlock(block.id);
                }}
                onBackspaceAtStart={
                  block.kind === 'paragraph' && blockIndex > 0
                    ? () => deletePreviousBlock(block.id)
                    : undefined
                }
                paragraphMinHeight={block.kind === 'paragraph' ? paragraphMinHeight : undefined}
              />
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={STUDY_DOCUMENT_INPUT_ACCESSORY_ID} backgroundColor={NOTE_PAGE_BG}>
          <View
            style={[
              styles.inputAccessoryShell,
              {
                borderTopColor: palette.outlineVariant,
                backgroundColor: NOTE_PAGE_BG,
              },
            ]}>
            {toolbarAccessory}
          </View>
        </InputAccessoryView>
      ) : null}

      {showDockedToolbar ? (
        <View
          style={[
            styles.keyboardAccessory,
            {
              borderTopColor: palette.outlineVariant,
              backgroundColor: NOTE_PAGE_BG,
              bottom: Platform.OS === 'android' ? keyboardInset : 0,
            },
          ]}>
          {toolbarAccessory}
        </View>
      ) : null}

      {drawerOpen ? (
        <View style={styles.drawerLayer} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.drawerBackdrop,
              {
                opacity: drawerBackdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.28],
                }),
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="메모 목록 닫기"
              onPress={closeDrawer}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                width: drawerWidth,
                backgroundColor: NOTE_PAGE_BG,
                borderRightColor: palette.outlineVariant,
                transform: [{ translateX: drawerSlideX }],
              },
            ]}>
            <StudyNotePageList
              layout="drawer"
              pages={document.pages}
              activePageId={document.activePageId}
              palette={palette}
              surfaceBg={NOTE_PAGE_BG}
              onSelectPage={selectPage}
              onAddPage={() => addPage({ closeDrawer: true })}
              onDeletePage={deletePage}
              onClose={closeDrawer}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
  },
  canvasScroll: {
    flex: 1,
  },
  keyboardAccessory: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputAccessoryShell: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  headerComposeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  canvas: {
    width: '100%',
  },
  blocksInner: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 0,
  },
  emptyCanvas: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  blockRow: {
    width: '100%',
    paddingVertical: 0,
  },
  headingWrap: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  headingBand: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  headingPrimary: { flex: 1, fontWeight: '800', letterSpacing: 0.6 },
  headingSecondary: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '100%' },
  rowBody: { flex: 1, gap: 4 },
  blockInput: { fontSize: 15, lineHeight: 22, paddingVertical: 0, minHeight: 28, width: '100%' },
  paragraphInput: { textAlignVertical: 'top', width: '100%' },
  compactParagraph: { minHeight: 28 },
  structuralTailParagraph: { minHeight: 32, textAlignVertical: 'top' },
  listMarker: { width: 18, fontSize: 15, fontWeight: '700', lineHeight: 28, textAlign: 'center' },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  linkMeta: { fontSize: 11, fontWeight: '600' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  linkInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  linkApply: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tableWrap: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tableControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tableControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableControlLabel: { fontSize: 12, fontWeight: '600' },
  tableCell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    minHeight: 40,
  },
  imageWrap: { gap: 6, borderWidth: StyleSheet.hairlineWidth, padding: 8, marginTop: 4 },
  imagePickArea: { width: '100%' },
  imagePreview: { width: '100%', height: 160 },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickLabel: { fontSize: 13, fontWeight: '600' },
  imageChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageChangeLabel: { fontSize: 12, fontWeight: '600' },
});
