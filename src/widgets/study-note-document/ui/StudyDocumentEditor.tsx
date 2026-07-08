import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Alert,
  Animated,
  InputAccessoryView,
  Keyboard,
  Platform,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  WORK_STUDY_HEADING_ACCENTS,
  WORK_STUDY_TEXT_COLORS,
  WORK_STUDY_TABLE_MAX_COLS,
  WORK_STUDY_TABLE_MAX_ROWS,
  createWorkStudyDocBlock,
  createWorkStudyNotePage,
  getWorkStudyActivePage,
  persistWorkStudyNotePageTitle,
  resolveWorkStudyNotePageAutoTitle,
  resolveWorkStudyNotePageLabel,
  setWorkStudyActivePageBlocks,
  updateWorkStudyNotePageTitle,
  workStudyPageBlocksToPlainText,
  type WorkStudyDocBlock,
  type WorkStudyDocument,
  type WorkStudyBlockMarks,
  type WorkStudyHeadingLevel,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { cityPopFont, RetroFlatColors } from '@shared/config/retroFlat';
import { pickImageFromLibrary } from '@shared/lib/media/pickImageFromLibrary';
import { normalizeWebUrl, openWebLink } from '@shared/lib/url/openWebLink';
import { ThemedText } from '@shared/ui/themed-text';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

import { StudyDocumentToolbar, type StudyToolbarAction } from './StudyDocumentToolbar';
import { StudyNotePageList } from './StudyNotePageList';
import { StudyNotePageTitleField } from './StudyNotePageTitleField';

type Palette = StudyNoteDocumentPalette;

const NOTE_PAGE_BG = RetroFlatColors.light.bg;
const DRAWER_MAX_WIDTH = 320;
const DRAWER_WIDTH_RATIO = 0.82;
const KEYBOARD_ACCESSORY_ESTIMATED_HEIGHT = 132;
const STUDY_DOCUMENT_INPUT_ACCESSORY_ID = 'study-document-toolbar';
const EDITOR_HEADER_HEIGHT = 52;

const MAX_HISTORY = 40;

type ListBlockKind = 'checklist' | 'bullet' | 'numbered';

function normalizeBlockMarks(marks?: WorkStudyBlockMarks): WorkStudyBlockMarks | undefined {
  if (!marks) return undefined;
  const next = { ...marks };
  if (!next.bold) delete next.bold;
  if (!next.underline) delete next.underline;
  if (!next.link) delete next.link;
  if (!next.color) delete next.color;
  return Object.keys(next).length ? next : undefined;
}

function isListBlockKind(kind: WorkStudyDocBlock['kind']): kind is ListBlockKind {
  return kind === 'checklist' || kind === 'bullet' || kind === 'numbered';
}

function isEditableLinkBlock(kind: WorkStudyDocBlock['kind']): boolean {
  return kind !== 'table' && kind !== 'image' && kind !== 'heading';
}

function blockHasToolbarFormatting(
  block: WorkStudyDocBlock,
  pendingMarks?: WorkStudyBlockMarks,
): boolean {
  const marks = normalizeBlockMarks({ ...pendingMarks, ...block.marks });
  return Boolean(marks?.bold || marks?.underline || marks?.link || marks?.color);
}

function convertBlockToKind(
  block: WorkStudyDocBlock,
  kind: ListBlockKind | 'paragraph',
): WorkStudyDocBlock {
  if (block.kind === kind) return block;
  const next: WorkStudyDocBlock = { ...block, kind };
  if (kind === 'checklist') {
    next.checked = block.checked ?? false;
  } else {
    delete next.checked;
  }
  return next;
}

function resolveActiveMarkState(
  block: WorkStudyDocBlock | null | undefined,
  pendingMarks: WorkStudyBlockMarks,
  key: 'bold' | 'underline',
): boolean {
  return Boolean(pendingMarks[key] ?? block?.marks?.[key]);
}

function resolveActiveTextColor(
  block: WorkStudyDocBlock | null | undefined,
  pendingMarks: WorkStudyBlockMarks,
): string | undefined {
  return pendingMarks.color ?? block?.marks?.color;
}

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
  onBlur,
  onBackspaceAtStart,
  onEnterKey,
  onSelectionChange,
  placeholder,
  multiline = false,
  compact = false,
  pendingTextColor,
  style,
  inputAccessoryViewID,
  inputRef,
}: {
  block: WorkStudyDocBlock;
  palette: Palette;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onBackspaceAtStart?: () => void;
  onEnterKey?: () => void;
  onSelectionChange?: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  placeholder: string;
  multiline?: boolean;
  compact?: boolean;
  pendingTextColor?: string;
  style?: object;
  inputAccessoryViewID?: string;
  inputRef?: (ref: TextInput | null) => void;
}) {
  const bold = block.marks?.bold;
  const underline = block.marks?.underline;
  const textColor = block.marks?.color;
  const enterLockRef = useRef(0);
  const selectionRef = useRef({ start: 0, end: 0 });

  const handleEnterKey = useCallback(() => {
    if (!onEnterKey) return;
    const now = Date.now();
    if (now - enterLockRef.current < 80) return;
    enterLockRef.current = now;
    onEnterKey();
  }, [onEnterKey]);

  const handleChangeText = useCallback(
    (text: string) => {
      if (onEnterKey && /\r?\n/.test(text)) {
        onChangeText(text.replace(/\r?\n/g, ''));
        return;
      }
      onChangeText(text);
    },
    [onChangeText, onEnterKey],
  );

  const isEnterKey = useCallback((key: string) => {
    return key === 'Enter' || key === '\n' || key === 'Return';
  }, []);

  return (
    <TextInput
      ref={inputRef}
      value={block.text}
      onChangeText={handleChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      inputAccessoryViewID={inputAccessoryViewID}
      blurOnSubmit={false}
      returnKeyType={onEnterKey ? 'next' : multiline ? 'default' : 'done'}
      onSubmitEditing={() => {
        if (onEnterKey) {
          handleEnterKey();
        }
      }}
      onSelectionChange={(event) => {
        selectionRef.current = event.nativeEvent.selection;
        onSelectionChange?.(event);
      }}
      onKeyPress={(event) => {
        if (event.nativeEvent.key === 'Backspace' && onBackspaceAtStart) {
          const atStart =
            selectionRef.current.start === 0 && selectionRef.current.end === 0;
          if (atStart) {
            event.preventDefault();
            onBackspaceAtStart();
            return;
          }
        }
        if (onEnterKey && isEnterKey(event.nativeEvent.key)) {
          event.preventDefault();
          handleEnterKey();
        }
      }}
      placeholder={placeholder}
      placeholderTextColor={palette.outline}
      multiline={multiline && !onEnterKey}
      scrollEnabled={false}
      textAlignVertical={
        compact ? 'center' : onEnterKey ? 'top' : multiline ? 'top' : 'center'
      }
      style={[
        styles.blockInput,
        compact ? styles.listBlockInput : null,
        style,
        {
          color: textColor ?? pendingTextColor ?? palette.onSurface,
          ...(bold ? cityPopFont('800') : cityPopFont('400')),
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
  onBlurBlock,
  onChangeBlock,
  onPickImage,
  onBackspaceAtStart,
  paragraphMinHeight,
  inputAccessoryViewID,
  registerInputRef,
  onEnterKey,
  onSelectionChange,
  pendingTextColor,
  onOpenLink,
  onBlockLayout,
}: {
  block: WorkStudyDocBlock;
  blocks: WorkStudyDocBlock[];
  blockIndex: number;
  palette: Palette;
  onFocusBlock: (id: string) => void;
  onBlurBlock?: () => void;
  onChangeBlock: (id: string, patch: Partial<WorkStudyDocBlock>) => void;
  onPickImage: () => void;
  onBackspaceAtStart?: () => void;
  paragraphMinHeight?: number;
  inputAccessoryViewID?: string;
  registerInputRef: (blockId: string, ref: TextInput | null) => void;
  onEnterKey?: () => void;
  onSelectionChange?: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  pendingTextColor?: string;
  onOpenLink?: (url: string) => void;
  onBlockLayout?: (blockId: string, y: number) => void;
}) {
  const isFormattedParagraph = block.kind === 'paragraph' && Boolean(onEnterKey);
  const rowShellStyle = isListBlockKind(block.kind)
    ? styles.listBlockRow
    : isFormattedParagraph
      ? styles.formattedBlockRow
      : styles.blockRow;
  const isListBlock = isListBlockKind(block.kind);

  if (block.kind === 'heading') {
    const accent = WORK_STUDY_HEADING_ACCENTS[block.accentIndex ?? 0] ?? WORK_STUDY_HEADING_ACCENTS[0];
    const level = block.headingLevel ?? 1;
    const titleSize = level === 1 ? 14 : level === 2 ? 13 : 12;
    return (
      <View
        style={[rowShellStyle, styles.headingWrap]}
        onLayout={(e) => onBlockLayout?.(block.id, e.nativeEvent.layout.y)}>
        <View style={[styles.headingBand, { backgroundColor: accent }]}>
          <TextInput
            value={block.text}
            onChangeText={(text) => onChangeBlock(block.id, { text })}
            onFocus={() => onFocusBlock(block.id)}
            inputAccessoryViewID={inputAccessoryViewID}
            placeholder="구역 라벨"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={[styles.headingPrimary, { fontSize: titleSize, color: '#fff' }]}
          />
          <TextInput
            value={block.subtitle ?? ''}
            onChangeText={(subtitle) => onChangeBlock(block.id, { subtitle })}
            onFocus={() => onFocusBlock(block.id)}
            inputAccessoryViewID={inputAccessoryViewID}
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
      <View
        style={rowShellStyle}
        onLayout={(e) => onBlockLayout?.(block.id, e.nativeEvent.layout.y)}>
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
                  inputAccessoryViewID={inputAccessoryViewID}
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
      <View
        style={[rowShellStyle, styles.imageWrap, { borderColor: palette.outlineVariant }]}
        onLayout={(e) => onBlockLayout?.(block.id, e.nativeEvent.layout.y)}>
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
          onBlur={onBlurBlock}
          inputAccessoryViewID={inputAccessoryViewID}
          inputRef={(ref) => registerInputRef(block.id, ref)}
          onEnterKey={onEnterKey}
          onSelectionChange={onSelectionChange}
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
        {block.checked ? <IconSymbol name="checkmark" size={10} color="#fff" /> : null}
      </Pressable>
    ) : block.kind === 'bullet' ? (
      <ThemedText style={[styles.listMarker, { color: palette.onVariant }]}>•</ThemedText>
    ) : block.kind === 'numbered' ? (
      <ThemedText
        style={[styles.listMarker, styles.numberedMarker, { color: palette.onVariant }]}
        numberOfLines={1}>
        {numberedIndexForBlock(blocks, block.id)}.
      </ThemedText>
    ) : null;

  return (
    <View
      style={[rowShellStyle, styles.row, isListBlock ? styles.listRow : null]}
      onLayout={(e) => onBlockLayout?.(block.id, e.nativeEvent.layout.y)}>
      {rowPrefix}
      <View style={[styles.rowBody, isListBlock ? styles.listRowBody : null]}>
        <BlockText
          block={block}
          palette={palette}
          onChangeText={(text) => onChangeBlock(block.id, { text })}
          onFocus={() => onFocusBlock(block.id)}
          onBlur={onBlurBlock}
          onBackspaceAtStart={onBackspaceAtStart}
          inputAccessoryViewID={inputAccessoryViewID}
          inputRef={(ref) => registerInputRef(block.id, ref)}
          onEnterKey={onEnterKey}
          onSelectionChange={onSelectionChange}
          compact={isListBlock}
          pendingTextColor={pendingTextColor}
          placeholder={
            block.kind === 'checklist'
              ? '할 일'
              : block.kind === 'paragraph'
                ? '본문'
                : '글을 입력해주세요.'
          }
          multiline={block.kind === 'paragraph'}
          style={
            block.kind === 'paragraph'
              ? [
                  styles.paragraphInput,
                  onEnterKey ? styles.formattedParagraphInput : null,
                  blockIndex > 0 && blockNeedsTailParagraph(blocks[blockIndex - 1]!)
                    ? styles.structuralTailParagraph
                    : blocks[blockIndex + 1] && blockNeedsTailParagraph(blocks[blockIndex + 1]!)
                      ? styles.compactParagraph
                      : null,
                  paragraphMinHeight && !onEnterKey ? { minHeight: paragraphMinHeight } : null,
                ]
              : undefined
          }
        />
        {block.marks?.link ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`링크 열기: ${block.marks.link}`}
            onPress={() => onOpenLink?.(block.marks!.link!)}
            style={({ pressed }) => [styles.linkMetaHit, pressed && { opacity: 0.65 }]}>
            <ThemedText style={[styles.linkMeta, { color: palette.onSurface }]} numberOfLines={1}>
              🔗 {block.marks.link}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function StudyDocumentEditor({
  document,
  onChangeDocument,
  palette,
  viewportHeight,
  keyboardToolbarMode = 'accessory',
  keyboardBottomChromeInset = 0,
}: {
  document: WorkStudyDocument;
  onChangeDocument: Dispatch<SetStateAction<WorkStudyDocument>>;
  palette: Palette;
  /** 목표 상세 등 고정 레이아웃에서 에디터 스크롤 영역 높이 */
  viewportHeight?: number;
  /**
   * `accessory`: iOS 키보드 상단 InputAccessoryView (루틴 노트 설정 등)
   * `docked`: 키보드 높이만큼 올린 하단 도킹 툴바 (오늘 탭 상단 노트)
   */
  keyboardToolbarMode?: 'accessory' | 'docked';
  /** 도킹 툴바 모드에서 키보드 inset 보정(탭 바 등 화면 하단 chrome) */
  keyboardBottomChromeInset?: number;
}) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingMarks, setPendingMarksState] = useState<WorkStudyBlockMarks>({});
  const [activeListKind, setActiveListKind] = useState<ListBlockKind | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [scrollViewportHeight, setScrollViewportHeight] = useState<number | null>(null);
  const drawerOpenRef = useRef(false);
  const undoStack = useRef<WorkStudyDocument[]>([]);
  const redoStack = useRef<WorkStudyDocument[]>([]);
  const pendingMarksRef = useRef<WorkStudyBlockMarks>({});
  const blockInputRefs = useRef<Record<string, TextInput | null>>({});
  const selectionByBlockRef = useRef<Record<string, { start: number; end: number }>>({});
  const pendingFocusBlockIdRef = useRef<string | null>(null);
  const pendingFocusSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const linkTargetBlockIdRef = useRef<string | null>(null);
  const toolbarInteractionRef = useRef(false);
  const activeBlockIdRef = useRef<string | null>(null);
  const canvasScrollRef = useRef<ScrollView | null>(null);
  const blockLayoutYRef = useRef<Record<string, number>>({});
  const scrollOffsetYRef = useRef(0);
  const scrollViewportLayoutHeightRef = useRef(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const drawerWidth = Math.min(DRAWER_MAX_WIDTH, Math.round(windowWidth * DRAWER_WIDTH_RATIO));
  const drawerSlideX = useRef(new Animated.Value(-drawerWidth)).current;
  const drawerBackdropOpacity = useRef(new Animated.Value(0)).current;
  const documentRef = useRef(document);
  documentRef.current = document;
  activeBlockIdRef.current = activeBlockId;

  const canUndo = historyTick >= 0 && undoStack.current.length > 0;
  const canRedo = historyTick >= 0 && redoStack.current.length > 0;

  const resolvePendingMarks = useCallback((): WorkStudyBlockMarks | undefined => {
    return normalizeBlockMarks(pendingMarksRef.current);
  }, []);

  const applyInputSelection = useCallback((input: TextInput, cursor: number) => {
    try {
      input.setNativeProps({ selection: { start: cursor, end: cursor } });
    } catch {
      // noop — ref may not be ready on some platforms
    }
  }, []);

  const transferFocusToBlock = useCallback(
    (blockId: string, cursor: number) => {
      pendingFocusBlockIdRef.current = blockId;
      pendingFocusSelectionRef.current = { start: cursor, end: cursor };
      setActiveBlockId(blockId);
      const input = blockInputRefs.current[blockId];
      if (input) {
        input.focus();
        applyInputSelection(input, cursor);
        pendingFocusBlockIdRef.current = null;
        pendingFocusSelectionRef.current = null;
      }
    },
    [applyInputSelection],
  );

  const retainEditorKeyboardFocus = useCallback(() => {
    const blockId = activeBlockIdRef.current;
    if (!blockId) return;
    const input = blockInputRefs.current[blockId];
    if (!input) return;
    const sel = selectionByBlockRef.current[blockId];
    input.focus();
    if (sel) {
      applyInputSelection(input, sel.start);
    }
  }, [applyInputSelection]);

  const beginToolbarInteraction = useCallback(() => {
    toolbarInteractionRef.current = true;
  }, []);

  const endToolbarInteraction = useCallback(() => {
    setTimeout(() => {
      toolbarInteractionRef.current = false;
    }, 120);
  }, []);

  const handleBlockBlur = useCallback(() => {
    if (!toolbarInteractionRef.current) return;
    if (Platform.OS === 'ios' && keyboardToolbarMode !== 'docked') return;
    retainEditorKeyboardFocus();
  }, [keyboardToolbarMode, retainEditorKeyboardFocus]);

  const dismissEditorKeyboard = useCallback(() => {
    toolbarInteractionRef.current = false;
    const blockId = activeBlockIdRef.current;
    if (blockId) {
      blockInputRefs.current[blockId]?.blur();
    }
    setActiveBlockId(null);
    Keyboard.dismiss();
  }, []);

  const registerBlockLayout = useCallback((blockId: string, y: number) => {
    blockLayoutYRef.current[blockId] = y;
  }, []);

  const scrollActiveBlockIntoView = useCallback(
    (blockId?: string | null) => {
      const targetId = blockId ?? activeBlockIdRef.current;
      if (!targetId) return;
      const y = blockLayoutYRef.current[targetId];
      if (y == null) return;
      const viewportH = scrollViewportLayoutHeightRef.current;
      if (viewportH <= 0) return;

      const toolbarH =
        KEYBOARD_ACCESSORY_ESTIMATED_HEIGHT +
        (showLinkInput ? 56 : 0) +
        (showColorPicker ? 44 : 0);
      const bottomPad =
        keyboardToolbarMode === 'docked' && keyboardInset > 0 ? toolbarH + 24 : 48;
      const visibleBottom = scrollOffsetYRef.current + viewportH - bottomPad;
      const visibleTop = scrollOffsetYRef.current + 12;
      const targetBottom = y + 36;

      if (targetBottom > visibleBottom) {
        canvasScrollRef.current?.scrollTo({
          y: Math.max(0, targetBottom - viewportH + bottomPad),
          animated: true,
        });
      } else if (y < visibleTop) {
        canvasScrollRef.current?.scrollTo({
          y: Math.max(0, y - 12),
          animated: true,
        });
      }
    },
    [keyboardInset, keyboardToolbarMode, showColorPicker, showLinkInput],
  );

  const registerInputRef = useCallback(
    (blockId: string, ref: TextInput | null) => {
      if (ref) {
        blockInputRefs.current[blockId] = ref;
        if (pendingFocusBlockIdRef.current === blockId) {
          const cursor = pendingFocusSelectionRef.current?.start ?? 0;
          ref.focus();
          applyInputSelection(ref, cursor);
          pendingFocusBlockIdRef.current = null;
          pendingFocusSelectionRef.current = null;
        }
        return;
      }
      delete blockInputRefs.current[blockId];
    },
    [applyInputSelection],
  );

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

  useLayoutEffect(() => {
    const blockId = pendingFocusBlockIdRef.current;
    if (!blockId || activeBlockId !== blockId) return;
    const input = blockInputRefs.current[blockId];
    if (!input) return;
    const cursor = pendingFocusSelectionRef.current?.start ?? 0;
    input.focus();
    applyInputSelection(input, cursor);
    pendingFocusBlockIdRef.current = null;
    pendingFocusSelectionRef.current = null;
    requestAnimationFrame(() => {
      scrollActiveBlockIntoView(blockId);
    });
  }, [activeBlockId, activeBlocks, applyInputSelection, scrollActiveBlockIntoView]);

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

  const commitStructuralChange = useCallback(
    (blocks: WorkStudyDocBlock[]) => {
      pushHistory();
      replaceActiveBlocks(blocks);
    },
    [pushHistory, replaceActiveBlocks],
  );

  const handleFocusBlock = useCallback(
    (blockId: string) => {
      setActiveBlockId(blockId);
      const block = activeBlocks.find((b) => b.id === blockId);
      const synced = {
        ...(block?.marks?.bold ? { bold: true } : {}),
        ...(block?.marks?.underline ? { underline: true } : {}),
        ...(block?.marks?.color ? { color: block.marks.color } : {}),
      };
      pendingMarksRef.current = synced;
      setPendingMarksState(synced);
      if (block && isListBlockKind(block.kind)) {
        setActiveListKind(block.kind);
      } else {
        setActiveListKind(null);
      }
      requestAnimationFrame(() => {
        scrollActiveBlockIntoView(blockId);
      });
      const pending = resolvePendingMarks();
      if (!pending || !block || block.kind === 'table' || block.kind === 'image' || block.kind === 'heading') {
        return;
      }
      replaceActiveBlocks(
        activeBlocks.map((b) =>
          b.id === blockId
            ? { ...b, marks: normalizeBlockMarks({ ...b.marks, ...pending }) }
            : b,
        ),
      );
    },
    [activeBlocks, replaceActiveBlocks, resolvePendingMarks, scrollActiveBlockIntoView],
  );

  const handleChangeBlock = useCallback(
    (id: string, patch: Partial<WorkStudyDocBlock>) => {
      if (patch.text !== undefined) {
        const block = activeBlocks.find((b) => b.id === id);
        const pending = resolvePendingMarks();
        if (
          block &&
          pending &&
          !blockHasToolbarFormatting(block) &&
          block.kind !== 'table' &&
          block.kind !== 'image' &&
          block.kind !== 'heading'
        ) {
          updateBlock(id, {
            ...patch,
            marks: normalizeBlockMarks({ ...block.marks, ...pending }),
          });
          return;
        }
      }
      updateBlock(id, patch);
    },
    [activeBlocks, resolvePendingMarks, updateBlock],
  );

  const handleSelectionChange = useCallback(
    (blockId: string, event: { nativeEvent: { selection: { start: number; end: number } } }) => {
      selectionByBlockRef.current[blockId] = event.nativeEvent.selection;
    },
    [],
  );

  const insertBlockAfter = useCallback(
    (
      afterBlockId: string,
      kind: WorkStudyDocBlock['kind'],
      marks?: WorkStudyBlockMarks,
    ) => {
      const index = activeBlocks.findIndex((b) => b.id === afterBlockId);
      if (index < 0) return;
      const source = activeBlocks[index]!;
      const block = createWorkStudyDocBlock(kind);
      const resolvedMarks = normalizeBlockMarks(marks ?? source.marks ?? resolvePendingMarks());
      if (resolvedMarks) block.marks = resolvedMarks;
      const next = [...activeBlocks];
      next.splice(index + 1, 0, block);
      commitStructuralChange(next);
      if (isListBlockKind(kind)) setActiveListKind(kind);
      pendingFocusBlockIdRef.current = block.id;
      setActiveBlockId(block.id);
    },
    [activeBlocks, commitStructuralChange, resolvePendingMarks],
  );

  const continueParagraph = useCallback(
    (blockId: string) => {
      const block = activeBlocks.find((b) => b.id === blockId);
      if (!block || block.kind !== 'paragraph') return;
      const sel = selectionByBlockRef.current[blockId];
      const cursor = sel?.start ?? block.text.length;
      const marks = normalizeBlockMarks(block.marks ?? resolvePendingMarks());
      if (cursor < block.text.length) {
        const before = block.text.slice(0, cursor);
        const after = block.text.slice(cursor);
        const newBlock = createWorkStudyDocBlock('paragraph');
        newBlock.text = after;
        if (marks) newBlock.marks = marks;
        const index = activeBlocks.findIndex((b) => b.id === blockId);
        const next = activeBlocks.map((b) =>
          b.id === blockId ? { ...b, text: before, marks: marks ?? b.marks } : b,
        );
        next.splice(index + 1, 0, newBlock);
        commitStructuralChange(next);
        pendingFocusBlockIdRef.current = newBlock.id;
        setActiveBlockId(newBlock.id);
        return;
      }
      insertBlockAfter(blockId, 'paragraph', marks);
    },
    [activeBlocks, commitStructuralChange, insertBlockAfter, resolvePendingMarks],
  );

  const continueListBlock = useCallback(
    (blockId: string, kind: ListBlockKind) => {
      const block = activeBlocks.find((b) => b.id === blockId);
      if (!block || block.kind !== kind) return;
      const sel = selectionByBlockRef.current[blockId];
      const cursor = sel?.start ?? block.text.length;
      const marks = normalizeBlockMarks(block.marks ?? resolvePendingMarks());

      if (cursor < block.text.length) {
        const before = block.text.slice(0, cursor);
        const after = block.text.slice(cursor);
        const newBlock = createWorkStudyDocBlock(kind);
        newBlock.text = after;
        if (marks) newBlock.marks = marks;
        const index = activeBlocks.findIndex((b) => b.id === blockId);
        const next = activeBlocks.map((b) => (b.id === blockId ? { ...b, text: before, marks: marks ?? b.marks } : b));
        next.splice(index + 1, 0, newBlock);
        commitStructuralChange(next);
        pendingFocusBlockIdRef.current = newBlock.id;
        setActiveBlockId(newBlock.id);
        return;
      }

      insertBlockAfter(blockId, kind, marks);
    },
    [activeBlocks, commitStructuralChange, insertBlockAfter, resolvePendingMarks],
  );

  const handleBlockEnter = useCallback(
    (block: WorkStudyDocBlock) => {
      if (isListBlockKind(block.kind)) {
        continueListBlock(block.id, block.kind);
        return;
      }
      if (block.kind === 'paragraph' && blockHasToolbarFormatting(block, pendingMarksRef.current)) {
        continueParagraph(block.id);
      }
    },
    [continueListBlock, continueParagraph],
  );

  const handleBackspaceAtStart = useCallback(
    (blockId: string, blockIndex: number) => {
      const block = activeBlocks[blockIndex];
      if (!block || block.id !== blockId) return;

      const sel = selectionByBlockRef.current[blockId];
      const cursor = sel?.start ?? 0;
      if (cursor > 0) return;

      if (block.text.length > 0 && blockIndex > 0) {
        const prev = activeBlocks[blockIndex - 1]!;
        const canMergeParagraph = block.kind === 'paragraph' && prev.kind === 'paragraph';
        const canMergeList = isListBlockKind(block.kind) && prev.kind === block.kind;
        if (canMergeParagraph || canMergeList) {
          pushHistory();
          const mergedText = prev.text + block.text;
          const marks = normalizeBlockMarks({ ...prev.marks, ...block.marks });
          const cursorAt = prev.text.length;
          const next = activeBlocks
            .map((b, index) =>
              index === blockIndex - 1 ? { ...b, text: mergedText, marks: marks ?? b.marks } : b,
            )
            .filter((_, index) => index !== blockIndex);
          transferFocusToBlock(prev.id, cursorAt);
          replaceActiveBlocks(next);
          void Haptics.selectionAsync();
        }
        return;
      }

      if (block.text.length > 0) return;

      pushHistory();

      if (activeBlocks.length === 1) {
        const cleared: WorkStudyDocBlock = { ...block, text: '', marks: undefined };
        transferFocusToBlock(block.id, 0);
        replaceActiveBlocks([cleared]);
        if (isListBlockKind(block.kind)) setActiveListKind(null);
        void Haptics.selectionAsync();
        return;
      }

      const focusId =
        blockIndex > 0
          ? activeBlocks[blockIndex - 1]!.id
          : activeBlocks[blockIndex + 1]!.id;
      const focusCursor =
        blockIndex > 0 ? activeBlocks[blockIndex - 1]!.text.length : 0;
      const next = activeBlocks.filter((_, index) => index !== blockIndex);
      transferFocusToBlock(focusId, focusCursor);
      replaceActiveBlocks(next);
      void Haptics.selectionAsync();
    },
    [activeBlocks, pushHistory, replaceActiveBlocks, transferFocusToBlock],
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

  const insertBlock = useCallback(
    (kind: WorkStudyDocBlock['kind'], options?: { headingLevel?: WorkStudyHeadingLevel }) => {
      const withPage = ensurePageDocument();
      const page = getWorkStudyActivePage(withPage);
      const blocks = page?.blocks ?? [];
      const block = createWorkStudyDocBlock(kind, {
        headingLevel: options?.headingLevel,
        accentIndex: kind === 'heading' ? nextAccentIndex(blocks) : undefined,
      });
      const marks = resolvePendingMarks();
      if (marks && kind !== 'table' && kind !== 'image' && kind !== 'heading') {
        block.marks = marks;
      }
      commitStructuralChange([...blocks, block]);
      if (isListBlockKind(kind)) setActiveListKind(kind);
      pendingFocusBlockIdRef.current = block.id;
      setActiveBlockId(block.id);
      void Haptics.selectionAsync();
    },
    [commitStructuralChange, ensurePageDocument, resolvePendingMarks],
  );

  const handleEmptyCanvasPress = useCallback(() => {
    if (keyboardInset > 0 || activeBlockIdRef.current) {
      dismissEditorKeyboard();
      return;
    }
    insertBlock('paragraph');
  }, [dismissEditorKeyboard, insertBlock, keyboardInset]);

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
          setShowColorPicker(false);
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
        setShowColorPicker(false);
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
      setShowColorPicker(false);
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
      setShowColorPicker(false);
      setLinkDraft('');
    },
    [applyDocument, document.activePageId, document.pages, pushHistory],
  );

  const activePageLabel = activePage
    ? resolveWorkStudyNotePageLabel(activePage, document.pages)
    : '메모';
  const activePageAutoTitle = activePage
    ? resolveWorkStudyNotePageAutoTitle(activePage, document.pages)
    : '';

  const handlePageTitleChange = useCallback(
    (nextTitle: string) => {
      if (!activePage) return;
      const persisted = persistWorkStudyNotePageTitle(nextTitle, activePageAutoTitle);
      if (persisted === activePage.title) return;
      pushHistory();
      applyDocument(updateWorkStudyNotePageTitle(document, activePage.id, persisted));
    },
    [activePage, activePageAutoTitle, applyDocument, document, pushHistory],
  );

  const shareActivePage = useCallback(async () => {
    const page = getWorkStudyActivePage(document);
    if (!page) {
      Alert.alert('공유할 내용 없음', '공유할 메모를 먼저 작성해 주세요.');
      return;
    }
    const title = resolveWorkStudyNotePageLabel(page, document.pages);
    const body = workStudyPageBlocksToPlainText(page.blocks);
    if (!body.trim()) {
      Alert.alert('공유할 내용 없음', '메모 내용을 먼저 작성해 주세요.');
      return;
    }
    void Haptics.selectionAsync();
    try {
      await Share.share({
        message: `${title}\n\n${body}`,
        title,
      });
    } catch {
      Alert.alert('공유 실패', '잠시 후 다시 시도해 주세요.');
    }
  }, [document]);

  const focusedBlock = activeBlockId ? activeBlocks.find((b) => b.id === activeBlockId) : null;
  const toolbarActiveBold = resolveActiveMarkState(focusedBlock, pendingMarks, 'bold');
  const toolbarActiveUnderline = resolveActiveMarkState(focusedBlock, pendingMarks, 'underline');
  const toolbarActiveTextColor = resolveActiveTextColor(focusedBlock, pendingMarks);
  const toolbarActiveListKind =
    focusedBlock && isListBlockKind(focusedBlock.kind) ? focusedBlock.kind : activeListKind;

  const toggleListKind = useCallback(
    (kind: ListBlockKind) => {
      const focusedBlock = activeBlockId ? activeBlocks.find((b) => b.id === activeBlockId) : null;
      const block =
        focusedBlock ??
        (activeBlocks.length > 0 ? activeBlocks[activeBlocks.length - 1] : null);

      if (block?.kind === kind) {
        pushHistory();
        replaceActiveBlocks(
          activeBlocks.map((b) =>
            b.id === block.id ? convertBlockToKind(b, 'paragraph') : b,
          ),
        );
        setActiveListKind(null);
        pendingFocusBlockIdRef.current = block.id;
        setActiveBlockId(block.id);
        void Haptics.selectionAsync();
        return;
      }

      if (block && (block.kind === 'paragraph' || isListBlockKind(block.kind))) {
        pushHistory();
        replaceActiveBlocks(
          activeBlocks.map((b) => (b.id === block.id ? convertBlockToKind(b, kind) : b)),
        );
        setActiveListKind(kind);
        pendingFocusBlockIdRef.current = block.id;
        setActiveBlockId(block.id);
        void Haptics.selectionAsync();
        return;
      }

      insertBlock(kind);
    },
    [activeBlockId, activeBlocks, insertBlock, pushHistory, replaceActiveBlocks],
  );

  const toggleMark = useCallback(
    (key: 'bold' | 'underline') => {
      const block = activeBlockId ? activeBlocks.find((b) => b.id === activeBlockId) : null;
      const merged = {
        ...(block?.marks ?? {}),
        ...pendingMarksRef.current,
      };
      const nextValue = !resolveActiveMarkState(block, pendingMarksRef.current, key);
      if (nextValue) {
        merged[key] = true;
      } else {
        delete merged[key];
      }
      const normalized = normalizeBlockMarks(merged) ?? {};
      pendingMarksRef.current = normalized;
      setPendingMarksState({ ...normalized });

      if (activeBlockId) {
        if (!block || block.kind === 'table' || block.kind === 'image' || block.kind === 'heading') return;
        pushHistory();
        replaceActiveBlocks(
          activeBlocks.map((b) =>
            b.id === activeBlockId
              ? { ...b, marks: normalizeBlockMarks(merged) }
              : b,
          ),
        );
        return;
      }
      if (activeBlocks.length === 0) {
        insertBlock('paragraph');
      }
    },
    [activeBlockId, activeBlocks, insertBlock, pushHistory, replaceActiveBlocks],
  );

  const openLinkEditor = useCallback(() => {
    void Haptics.selectionAsync();
    const withPage = ensurePageDocument();
    const page = getWorkStudyActivePage(withPage);
    const blocks = page?.blocks ?? [];

    let targetBlock =
      (activeBlockId
        ? blocks.find((b) => b.id === activeBlockId && isEditableLinkBlock(b.kind))
        : null) ??
      [...blocks].reverse().find((b) => isEditableLinkBlock(b.kind)) ??
      null;

    if (!targetBlock) {
      const created = createWorkStudyDocBlock('paragraph');
      const marks = resolvePendingMarks();
      if (marks) created.marks = marks;
      commitStructuralChange([...blocks, created]);
      targetBlock = created;
      pendingFocusBlockIdRef.current = created.id;
      setActiveBlockId(created.id);
    }

    linkTargetBlockIdRef.current = targetBlock.id;
    setLinkDraft(targetBlock.marks?.link ?? '');
    setShowColorPicker(false);
    setShowLinkInput(true);
  }, [activeBlockId, commitStructuralChange, ensurePageDocument, resolvePendingMarks]);

  const ensureEditableTargetBlock = useCallback((): WorkStudyDocBlock | null => {
    const withPage = ensurePageDocument();
    const page = getWorkStudyActivePage(withPage);
    const blocks = page?.blocks ?? [];

    let targetBlock =
      (activeBlockId
        ? blocks.find((b) => b.id === activeBlockId && isEditableLinkBlock(b.kind))
        : null) ??
      [...blocks].reverse().find((b) => isEditableLinkBlock(b.kind)) ??
      null;

    if (!targetBlock) {
      const created = createWorkStudyDocBlock('paragraph');
      const marks = resolvePendingMarks();
      if (marks) created.marks = marks;
      commitStructuralChange([...blocks, created]);
      targetBlock = created;
      pendingFocusBlockIdRef.current = created.id;
      setActiveBlockId(created.id);
    }

    return targetBlock;
  }, [activeBlockId, commitStructuralChange, ensurePageDocument, resolvePendingMarks]);

  const applyTextColor = useCallback(
    (color: string | undefined) => {
      const targetBlock = ensureEditableTargetBlock();
      if (!targetBlock) return;

      const currentColor = resolveActiveTextColor(targetBlock, pendingMarksRef.current);
      const normalizedPick = color?.toUpperCase();
      const nextColor =
        normalizedPick && currentColor?.toUpperCase() === normalizedPick ? undefined : normalizedPick;

      const merged = {
        ...(targetBlock.marks ?? {}),
        ...pendingMarksRef.current,
      };
      if (nextColor) {
        merged.color = nextColor;
      } else {
        delete merged.color;
      }

      const normalized = normalizeBlockMarks(merged) ?? {};
      pendingMarksRef.current = normalized;
      setPendingMarksState({ ...normalized });

      pushHistory();
      replaceActiveBlocks(
        activeBlocks.map((b) =>
          b.id === targetBlock.id ? { ...b, marks: normalizeBlockMarks(merged) } : b,
        ),
      );
      pendingFocusBlockIdRef.current = targetBlock.id;
      setActiveBlockId(targetBlock.id);
      void Haptics.selectionAsync();
    },
    [activeBlocks, ensureEditableTargetBlock, pushHistory, replaceActiveBlocks],
  );

  const openColorPicker = useCallback(() => {
    void Haptics.selectionAsync();
    setShowLinkInput(false);
    setLinkDraft('');
    ensureEditableTargetBlock();
    setShowColorPicker((open) => !open);
  }, [ensureEditableTargetBlock]);

  const applyLink = useCallback(() => {
    const targetId =
      linkTargetBlockIdRef.current ??
      activeBlockId ??
      [...activeBlocks].reverse().find((b) => isEditableLinkBlock(b.kind))?.id;
    if (!targetId) return;

    const url = normalizeWebUrl(linkDraft) ?? linkDraft.trim();
    pushHistory();
    onChangeDocument((prev) => {
      const withPage = prev.pages.length > 0 ? prev : ensurePageDocument(prev);
      const page = getWorkStudyActivePage(withPage);
      const blocks = page?.blocks ?? [];
      const nextBlocks = blocks.map((block) => {
        if (block.id !== targetId || !isEditableLinkBlock(block.kind)) return block;
        if (!url) {
          return { ...block, marks: normalizeBlockMarks({ ...block.marks, link: undefined }) };
        }
        return { ...block, marks: normalizeBlockMarks({ ...block.marks, link: url }) };
      });
      return setWorkStudyActivePageBlocks(withPage, nextBlocks);
    });

    linkTargetBlockIdRef.current = targetId;
    setActiveBlockId(targetId);
    setShowLinkInput(false);
    setLinkDraft('');
    void Haptics.selectionAsync();
    requestAnimationFrame(() => {
      blockInputRefs.current[targetId]?.focus();
    });
  }, [activeBlockId, activeBlocks, ensurePageDocument, linkDraft, onChangeDocument, pushHistory]);

  const handleOpenBlockLink = useCallback(async (url: string) => {
    const opened = await openWebLink(url);
    if (!opened) {
      Alert.alert('링크를 열 수 없어요', '주소를 확인한 뒤 다시 시도해 주세요.');
    }
  }, []);

  const onToolbarAction = useCallback(
    (action: StudyToolbarAction) => {
      const guardDockedToolbar = keyboardToolbarMode === 'docked' && keyboardInset > 0;
      if (guardDockedToolbar) beginToolbarInteraction();

      switch (action) {
        case 'undo': {
          const prev = undoStack.current.pop();
          if (prev) {
            redoStack.current.push(cloneDocument(document));
            replaceDocument(prev);
            setHistoryTick((n) => n + 1);
          }
          break;
        }
        case 'redo': {
          const next = redoStack.current.pop();
          if (next) {
            undoStack.current.push(cloneDocument(document));
            replaceDocument(next);
            setHistoryTick((n) => n + 1);
          }
          break;
        }
        case 'checklist':
          toggleListKind('checklist');
          break;
        case 'bullet':
          toggleListKind('bullet');
          break;
        case 'numbered':
          toggleListKind('numbered');
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
        case 'text-color':
          openColorPicker();
          break;
        case 'link':
          openLinkEditor();
          break;
        case 'reset-document':
          resetDocument();
          break;
        default:
          break;
      }
      if (guardDockedToolbar) {
        retainEditorKeyboardFocus();
        endToolbarInteraction();
      }
    },
    [activeBlockId, activeBlocks, beginToolbarInteraction, endToolbarInteraction, ensurePageDocument, insertBlock, keyboardInset, keyboardToolbarMode, openColorPicker, openLinkEditor, pickImageForBlock, replaceDocument, resetDocument, retainEditorKeyboardFocus, toggleListKind, toggleMark],
  );

  const empty = activeBlocks.length === 0;
  const keyboardOpen = keyboardInset > 0;
  const useDockedKeyboardToolbar = keyboardToolbarMode === 'docked';
  const useInputAccessory = Platform.OS === 'ios' && !useDockedKeyboardToolbar;
  const textInputAccessoryViewID = useInputAccessory ? STUDY_DOCUMENT_INPUT_ACCESSORY_ID : undefined;
  const showDockedToolbar = useDockedKeyboardToolbar || Platform.OS !== 'ios' || !keyboardOpen;
  const toolbarPanelHeight = showLinkInput ? 56 : showColorPicker ? 44 : 0;
  const toolbarLayoutActive = useInputAccessory || showDockedToolbar;
  const accessoryReserve =
    toolbarLayoutActive ? toolbarPanelHeight + KEYBOARD_ACCESSORY_ESTIMATED_HEIGHT : 12;
  const dockedToolbarBottom = useDockedKeyboardToolbar
    ? keyboardOpen
      ? Math.max(0, keyboardInset - keyboardBottomChromeInset)
      : 0
    : Platform.OS === 'android'
      ? keyboardInset
      : 0;
  const toolbarRetainFocusHandler =
    showDockedToolbar && useDockedKeyboardToolbar ? beginToolbarInteraction : undefined;

  const resolvedScrollHeight =
    viewportHeight != null
      ? Math.max(160, viewportHeight - EDITOR_HEADER_HEIGHT - accessoryReserve)
      : scrollViewportHeight;
  const useFlexCanvas = viewportHeight == null;

  const canvasMinHeight =
    useFlexCanvas
      ? 120
      : resolvedScrollHeight != null
        ? Math.max(120, resolvedScrollHeight - 8)
        : Math.round(Math.max(380, windowHeight * 0.5));
  const singleParagraph = activeBlocks.length === 1 && activeBlocks[0]?.kind === 'paragraph';
  const paragraphMinHeight = singleParagraph ? canvasMinHeight - 24 : undefined;

  const onShellLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const shellHeight = event.nativeEvent.layout.height;
      if (shellHeight <= 0) return;
      const nextHeight = Math.max(160, shellHeight - EDITOR_HEADER_HEIGHT - accessoryReserve);
      setScrollViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    },
    [accessoryReserve],
  );

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
            inputAccessoryViewID={textInputAccessoryViewID}
            style={[styles.linkInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
          />
          <Pressable onPress={applyLink} onPressIn={toolbarRetainFocusHandler} style={[styles.linkApply, { borderColor: palette.onSurface }]}>
            <ThemedText style={{ color: palette.onSurface, fontWeight: '700', fontSize: 12 }}>적용하기</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {showColorPicker ? (
        <View style={[styles.colorRow, { borderColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="기본 색"
            onPressIn={toolbarRetainFocusHandler}
            onPress={() => applyTextColor(undefined)}
            style={[
              styles.colorSwatch,
              styles.colorSwatchDefault,
              !toolbarActiveTextColor
                ? [styles.colorSwatchSelected, { borderColor: NOTE_PAGE_BG }]
                : { borderColor: palette.outlineVariant },
            ]}
          />
          {WORK_STUDY_TEXT_COLORS.map((option) => {
            const selected = toolbarActiveTextColor?.toUpperCase() === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPressIn={toolbarRetainFocusHandler}
                onPress={() => applyTextColor(option.value)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: option.value },
                  selected ? styles.colorSwatchSelected : null,
                ]}
              />
            );
          })}
        </View>
      ) : null}

      <View style={[styles.bottomBar, { borderTopColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
        <StudyDocumentToolbar
          palette={palette}
          surfaceBg={NOTE_PAGE_BG}
          canUndo={canUndo}
          canRedo={canRedo}
          canResetDocument={activeBlocks.length > 0}
          activeBold={toolbarActiveBold}
          activeUnderline={toolbarActiveUnderline}
          activeTextColor={toolbarActiveTextColor}
          colorPickerOpen={showColorPicker}
          activeListKind={toolbarActiveListKind}
          onAction={onToolbarAction}
          onRetainKeyboardFocus={toolbarRetainFocusHandler}
        />
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor: NOTE_PAGE_BG },
        viewportHeight != null
          ? { height: viewportHeight, flexGrow: 0, flexShrink: 0 }
          : null,
      ]}
      onLayout={
        viewportHeight == null && keyboardToolbarMode !== 'docked' ? onShellLayout : undefined
      }>
      <View style={[styles.editorHeader, { borderBottomColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="메모 목록 열기"
          onPress={openDrawer}
          hitSlop={8}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.65 }]}>
          <IconSymbol name="line.3.horizontal" size={20} color={palette.onSurface} />
        </Pressable>
        {activePage ? (
          <StudyNotePageTitleField
            value={activePage.title}
            autoFallback={activePageAutoTitle}
            onChangeValue={handlePageTitleChange}
            palette={palette}
          />
        ) : (
          <ThemedText style={[styles.editorTitle, { color: palette.onSurface }]} numberOfLines={1}>
            {activePageLabel}
          </ThemedText>
        )}
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메모 공유"
            onPress={() => {
              void shareActivePage();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.65 }]}>
            <IconSymbol name="square.and.arrow.up" size={18} color={palette.onSurface} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="새 메모 작성"
            onPress={() => {
              void Haptics.selectionAsync();
              addPage();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.65 }]}>
            <IconSymbol name="square.and.pencil" size={18} color={palette.onSurface} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        ref={canvasScrollRef}
        style={[
          styles.canvasScroll,
          useFlexCanvas ? styles.canvasScrollFlex : null,
          !useFlexCanvas && resolvedScrollHeight != null ? { height: resolvedScrollHeight } : null,
        ]}
        contentContainerStyle={[
          useFlexCanvas ? styles.canvasScrollContentFlex : null,
          {
            paddingBottom:
              useDockedKeyboardToolbar
                ? accessoryReserve + (keyboardOpen ? dockedToolbarBottom : 0) + 24
                : useFlexCanvas
                  ? 16
                  : accessoryReserve + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onLayout={(e) => {
          scrollViewportLayoutHeightRef.current = e.nativeEvent.layout.height;
        }}>
        <View style={[styles.canvas, useFlexCanvas ? styles.canvasFlex : null, { minHeight: canvasMinHeight, backgroundColor: NOTE_PAGE_BG }]}>
        {!empty ? (
          <Pressable
            style={styles.canvasDismissBackdrop}
            onPress={dismissEditorKeyboard}
            accessibilityRole="button"
            accessibilityLabel="키보드 닫기"
          />
        ) : null}
        {empty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="노트 작성 시작"
            onPress={handleEmptyCanvasPress}
            style={[
              styles.emptyCanvas,
              useFlexCanvas ? styles.emptyCanvasFlex : null,
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
          <View style={styles.blocksInner} pointerEvents="box-none">
            {activeBlocks.map((block, blockIndex) => (
              <StudyDocumentBlockView
                key={block.id}
                block={block}
                blocks={activeBlocks}
                blockIndex={blockIndex}
                palette={palette}
                onFocusBlock={handleFocusBlock}
                onBlurBlock={handleBlockBlur}
                onChangeBlock={handleChangeBlock}
                inputAccessoryViewID={textInputAccessoryViewID}
                registerInputRef={registerInputRef}
                onBlockLayout={registerBlockLayout}
                onEnterKey={
                  isListBlockKind(block.kind) ||
                  (block.kind === 'paragraph' && blockHasToolbarFormatting(block, pendingMarks))
                    ? () => handleBlockEnter(block)
                    : undefined
                }
                onSelectionChange={(event) => handleSelectionChange(block.id, event)}
                onOpenLink={(url) => {
                  void handleOpenBlockLink(url);
                }}
                onPickImage={() => {
                  void pickImageForBlock(block.id);
                }}
                onBackspaceAtStart={() => handleBackspaceAtStart(block.id, blockIndex)}
                paragraphMinHeight={block.kind === 'paragraph' ? paragraphMinHeight : undefined}
                pendingTextColor={block.id === activeBlockId ? pendingMarks.color : undefined}
              />
            ))}
          </View>
        )}
        </View>
      </ScrollView>

      {useInputAccessory ? (
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
            useDockedKeyboardToolbar ? styles.keyboardAccessoryDocked : styles.keyboardAccessory,
            {
              borderTopColor: palette.outlineVariant,
              backgroundColor: NOTE_PAGE_BG,
              bottom: dockedToolbarBottom,
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
    minHeight: 0,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
  },
  canvasScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  canvasScrollFlex: {
    flex: 1,
    flexGrow: 1,
    minHeight: 0,
  },
  canvasScrollContentFlex: {
    flexGrow: 1,
  },
  canvasFlex: {
    flex: 1,
    minHeight: 0,
  },
  keyboardAccessory: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  keyboardAccessoryDocked: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerActionBtn: {
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
    position: 'relative',
  },
  canvasDismissBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blocksInner: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 0,
    zIndex: 1,
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
  emptyCanvasFlex: {
    flex: 1,
    minHeight: 0,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  blockRow: {
    width: '100%',
    paddingVertical: 0,
  },
  formattedBlockRow: {
    width: '100%',
    paddingTop: 0,
    paddingBottom: 1,
  },
  listBlockRow: {
    width: '100%',
    paddingVertical: 0,
    marginVertical: 0,
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
  listRow: { alignItems: 'center', gap: 8 },
  rowBody: { flex: 1, gap: 4 },
  listRowBody: { gap: 0 },
  blockInput: { fontSize: 15, lineHeight: 22, paddingVertical: 0, minHeight: 28, width: '100%' },
  listBlockInput: {
    minHeight: 20,
    height: 20,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    marginVertical: 0,
  },
  paragraphInput: { textAlignVertical: 'top', width: '100%' },
  formattedParagraphInput: {
    minHeight: 24,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 2,
  },
  compactParagraph: { minHeight: 28 },
  structuralTailParagraph: { minHeight: 32, textAlignVertical: 'top' },
  listMarker: {
    minWidth: 16,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 0,
  },
  numberedMarker: {
    minWidth: 28,
    paddingRight: 2,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  linkMeta: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
  linkMetaHit: { alignSelf: 'flex-start', maxWidth: '100%' },
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  colorSwatchDefault: {
    backgroundColor: '#000000',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#000000',
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
