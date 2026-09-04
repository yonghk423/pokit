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
  WORK_STUDY_IMAGE_DISPLAY_HEIGHT_PRESETS,
  WORK_STUDY_IMAGE_MAX_DISPLAY_HEIGHT,
  WORK_STUDY_IMAGE_MIN_DISPLAY_HEIGHT,
  clampWorkStudyImageDisplayHeight,
  resolveWorkStudyImageDisplayHeight,
  stepWorkStudyImageDisplayHeight,
  type WorkStudyDocBlock,
  type WorkStudyDocument,
  type WorkStudyBlockMarks,
  type WorkStudyHeadingLevel,
} from '@entities/day-plan';
import { workStudyPageBlocksToPlainText } from '@entities/day-plan/lib/workStudyDocument';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { cityPopFont, RetroFlatColors } from '@shared/config/retroFlat';
import { pickImageFromLibrary } from '@shared/lib/media/pickImageFromLibrary';
import { normalizeWebUrl, openWebLink } from '@shared/lib/url/openWebLink';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

import { StudyDocumentToolbar, type StudyToolbarAction } from './StudyDocumentToolbar';
import { StudyNotePageList } from './StudyNotePageList';
import { ImeSafeTextInput } from './ImeSafeTextInput';
import { StudyNotePageTitleField } from './StudyNotePageTitleField';

type Palette = StudyNoteDocumentPalette;

const NOTE_PAGE_BG = RetroFlatColors.light.bg;
const DRAWER_MAX_WIDTH = 320;
const DRAWER_WIDTH_RATIO = 0.82;
const KEYBOARD_ACCESSORY_ESTIMATED_HEIGHT = 132;
const STUDY_DOCUMENT_INPUT_ACCESSORY_ID = 'study-document-toolbar';
const EDITOR_HEADER_HEIGHT = 52;
/** iOS 빈 TextInput에서 Backspace onKeyPress가 안 오는 문제 우회용 */
const EMPTY_BACKSPACE_SENTINEL = '\u200B';

const MAX_HISTORY = 40;

type ListBlockKind = 'checklist' | 'bullet' | 'numbered';

function isVisuallyEmptyText(value: string): boolean {
  // 한글 IME/붙여넣기 등에서 섞일 수 있는 zero-width 문자까지 제거해 빈 줄 판정
  return value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().length === 0;
}

/**
 * Enter 시 커서 위치. 한글 IME 조합 중에는 selection이 length-1로 남는 경우가 많아
 * 줄 끝(또는 마지막 글자 위)이면 분할하지 않고 다음 빈 블록으로 넘긴다.
 */
function resolveEnterSplitCursor(
  text: string,
  selection?: { start: number; end: number } | null,
): { cursor: number; splitMidLine: boolean } {
  const textLen = text.length;
  const start = selection?.start;
  const end = selection?.end;
  const cursor = Math.max(0, Math.min(start ?? textLen, textLen));
  const collapsed = start == null || end == null || start === end;
  // 줄 끝, 또는 IME로 마지막 글자 앞에 캐럿이 남은 경우 → 분할하지 않음
  if (
    cursor >= textLen ||
    (collapsed && cursor > 0 && cursor >= Math.max(0, textLen - 1))
  ) {
    return { cursor: textLen, splitMidLine: false };
  }
  return { cursor, splitMidLine: true };
}

function normalizeBlockMarks(marks?: WorkStudyBlockMarks): WorkStudyBlockMarks | undefined {
  if (!marks) return undefined;
  const next = { ...marks };
  if (!next.bold) delete next.bold;
  if (!next.underline) delete next.underline;
  if (!next.link) delete next.link;
  if (!next.color) delete next.color;
  return Object.keys(next).length ? next : undefined;
}

/** Enter로 다음 줄을 이어갈 때 링크는 상속하지 않는다 */
function marksForContinuedBlock(marks?: WorkStudyBlockMarks): WorkStudyBlockMarks | undefined {
  if (!marks) return undefined;
  const { link: _link, ...rest } = marks;
  return normalizeBlockMarks(rest);
}

function isListBlockKind(kind: WorkStudyDocBlock['kind']): kind is ListBlockKind {
  return kind === 'checklist' || kind === 'bullet' || kind === 'numbered';
}

/** 캔버스 빈 영역 탭 시 포커스할 수 있는 본문 블록 */
function isCanvasFocusableBlock(block: WorkStudyDocBlock): boolean {
  return (
    block.kind === 'paragraph' ||
    isListBlockKind(block.kind) ||
    block.kind === 'heading'
  );
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
  placeholder = '',
  multiline = false,
  compact = false,
  pendingTextColor,
  contentRevision = 0,
  style,
  inputAccessoryViewID,
  inputRef,
}: {
  block: WorkStudyDocBlock;
  palette: Palette;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** 현재 draft 텍스트를 넘겨 부모 stale 블록과의 레이스를 피한다 */
  onBackspaceAtStart?: (currentText: string) => void;
  /** 현재 draft 텍스트를 넘겨 부모 stale 블록과의 레이스를 피한다 */
  onEnterKey?: (currentText: string) => void;
  onSelectionChange?: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  placeholder?: string;
  multiline?: boolean;
  compact?: boolean;
  pendingTextColor?: string;
  /** undo/redo 등 외부 문서 교체 시 draft 강제 동기화 */
  contentRevision?: number;
  style?: object;
  inputAccessoryViewID?: string;
  inputRef?: (ref: TextInput | null) => void;
}) {
  const bold = block.marks?.bold;
  const underline = block.marks?.underline;
  const checkedDone = block.kind === 'checklist' && block.checked === true;
  const textColor = block.marks?.color;
  const enterLockRef = useRef(0);
  const selectionRef = useRef({ start: 0, end: 0 });
  const backspaceLockRef = useRef(0);
  const localInputRef = useRef<TextInput | null>(null);
  const onEnterKeyRef = useRef(onEnterKey);
  onEnterKeyRef.current = onEnterKey;
  const onBackspaceAtStartRef = useRef(onBackspaceAtStart);
  onBackspaceAtStartRef.current = onBackspaceAtStart;
  const [isFocused, setIsFocused] = useState(false);
  const [draftText, setDraftText] = useState(block.text);
  const draftTextRef = useRef(block.text);
  const committedTextRef = useRef(block.text);

  const setInputRef = useCallback(
    (ref: TextInput | null) => {
      localInputRef.current = ref;
      inputRef?.(ref);
    },
    [inputRef],
  );

  useEffect(() => {
    draftTextRef.current = block.text;
    setDraftText(block.text);
    committedTextRef.current = block.text;
  }, [block.id, contentRevision]);

  useEffect(() => {
    committedTextRef.current = block.text;
    if (!isFocused) {
      draftTextRef.current = block.text;
      setDraftText(block.text);
    }
  }, [block.id, block.text, isFocused]);

  // 포커스 중에도 잠시 멈추면 부모에 커밋 — undo가 타이핑을 추적할 수 있게 한다.
  useEffect(() => {
    if (!isFocused) return;
    const timer = setTimeout(() => {
      const text = draftTextRef.current;
      if (text !== committedTextRef.current) {
        committedTextRef.current = text;
        onChangeText(text);
      }
    }, 420);
    return () => clearTimeout(timer);
  }, [draftText, isFocused, onChangeText]);

  const effectiveText = isFocused ? draftText : block.text;
  const isEmpty = effectiveText.length === 0;
  // 포커스 중 빈 줄에 센티널을 넣으면 한글 IME 첫 조합이 ㅇㅏㄴ 으로 분리된다.
  // 센티널은 비포커스 빈 줄의 Backspace 감지용으로만 쓴다.
  const useBackspaceSentinel = Boolean(onBackspaceAtStart) && isEmpty && !isFocused;
  const displayValue = useBackspaceSentinel ? EMPTY_BACKSPACE_SENTINEL : effectiveText;

  const commitDraft = useCallback(
    (text: string) => {
      draftTextRef.current = text;
      setDraftText(text);
      if (text !== committedTextRef.current) {
        committedTextRef.current = text;
        onChangeText(text);
      }
    },
    [onChangeText],
  );

  const triggerBackspaceAtStart = useCallback(() => {
    if (!onBackspaceAtStartRef.current) return;
    const now = Date.now();
    if (now - backspaceLockRef.current < 80) return;
    backspaceLockRef.current = now;
    // 문서 커밋은 debounce되므로 구조 변경에는 항상 최신 draft를 넘긴다.
    // (커밋 전 값으로 병합하면 지운 글자가 이전 줄에 되살아난다)
    const liveText = draftTextRef.current.split(EMPTY_BACKSPACE_SENTINEL).join('');
    // 뒤늦은 blur/debounce 커밋이 옛 텍스트를 되돌리지 않도록 동기화
    committedTextRef.current = liveText;
    onBackspaceAtStartRef.current(liveText);
  }, []);

  const handleEnterKey = useCallback(() => {
    if (!onEnterKeyRef.current) return;
    const now = Date.now();
    if (now - enterLockRef.current < 80) return;
    enterLockRef.current = now;
    // 부모 커밋 레이스 없이 draft를 직접 전달 (구조 변경이 최신 텍스트를 반영)
    const text = draftTextRef.current;
    committedTextRef.current = text;
    onEnterKeyRef.current(text);
  }, []);

  const syncNativeText = useCallback((text: string) => {
    try {
      localInputRef.current?.setNativeProps({ text });
    } catch {
      // noop
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      if (onEnterKeyRef.current && /\r?\n/.test(text)) {
        const cleaned = text.replace(/\r?\n/g, '').split(EMPTY_BACKSPACE_SENTINEL).join('');
        draftTextRef.current = cleaned;
        setDraftText(cleaned);
        // submitBehavior='submit'이 개행을 막지 못한 플랫폼용 폴백
        syncNativeText(cleaned);
        handleEnterKey();
        return;
      }
      const cleaned = text.split(EMPTY_BACKSPACE_SENTINEL).join('');
      // 센티널만 지워진 경우(비포커스→포커스 전) → 빈 줄 백스페이스로 구조 변경
      if (
        onBackspaceAtStartRef.current &&
        isVisuallyEmptyText(draftTextRef.current) &&
        isVisuallyEmptyText(cleaned)
      ) {
        triggerBackspaceAtStart();
        return;
      }
      draftTextRef.current = cleaned;
      setDraftText(cleaned);
      // 포커스 중에는 센티널을 다시 넣지 않는다 — 한글 조합을 깨뜨림
    },
    [handleEnterKey, syncNativeText, triggerBackspaceAtStart],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    draftTextRef.current = block.text;
    setDraftText(block.text);
    selectionRef.current = { start: 0, end: 0 };
    onFocus?.();
  }, [block.text, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (draftTextRef.current !== committedTextRef.current) {
      committedTextRef.current = draftTextRef.current;
      onChangeText(draftTextRef.current);
    }
    onBlur?.();
  }, [onBlur, onChangeText]);

  // 레이아웃용 style/compact는 래퍼에만 적용 — TextInput native props 변동 시 iOS 키보드 reload 방지
  return (
    <View
      style={[
        styles.blockTextWrap,
        compact ? styles.listBlockInputWrap : null,
        style,
      ]}>
      <TextInput
        ref={setInputRef}
        value={displayValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        inputAccessoryViewID={inputAccessoryViewID}
        // multiline 기본값('newline')은 Return 시 네이티브가 개행을 먼저 넣어
        // 줄이 늘었다가 새 블록으로 다시 내려가는 점프가 생긴다.
        // 'submit'은 개행 없이 onSubmitEditing만 보낸다.
        submitBehavior={onEnterKey ? 'submit' : 'newline'}
        returnKeyType="default"
        onSubmitEditing={() => {
          if (onEnterKeyRef.current) handleEnterKey();
        }}
        onSelectionChange={(event) => {
          selectionRef.current = event.nativeEvent.selection;
          onSelectionChange?.(event);
        }}
        onKeyPress={(event) => {
          const key = event.nativeEvent.key;
          const isBackspaceLike = key === 'Backspace' || key === 'Delete';
          if (isBackspaceLike && onBackspaceAtStartRef.current) {
            const { start, end } = selectionRef.current;
            const atStart = start === 0 && end === 0;
            const empty = isVisuallyEmptyText(effectiveText);
            const onlySentinel =
              useBackspaceSentinel && start <= 1 && end <= 1 && empty;
            // 빈 줄/캡션·줄 맨 앞에서는 부모에게 구조 변경(이미지 제거·문단 병합)을 맡긴다.
            if (onlySentinel || empty || atStart) {
              event.preventDefault();
              triggerBackspaceAtStart();
              return;
            }
          }
        }}
        // TextInput placeholder는 빈 값 한 프레임에 깜빡이므로 본문에서는 쓰지 않는다.
        placeholder={placeholder}
        placeholderTextColor={placeholder ? palette.outline : 'transparent'}
        multiline
        scrollEnabled={false}
        textAlignVertical="top"
        style={[
          styles.blockInput,
          compact ? styles.listBlockInput : null,
          {
            color: checkedDone
              ? palette.onVariant
              : textColor ?? pendingTextColor ?? palette.onSurface,
            ...(bold ? cityPopFont('800') : cityPopFont('400')),
            opacity: checkedDone ? 0.42 : 1,
            textDecorationLine:
              checkedDone && underline
                ? 'underline line-through'
                : checkedDone
                  ? 'line-through'
                  : underline
                    ? 'underline'
                    : 'none',
            textDecorationColor: checkedDone
              ? palette.outline
              : textColor ?? pendingTextColor ?? palette.onSurface,
            textDecorationStyle: checkedDone ? 'dashed' : 'solid',
          },
          // iOS: 커스텀 라틴 폰트 + 한글 폴백 시 첫 줄 글리프가 아래로 처짐 → 패딩 재고정
          compact && Platform.OS === 'ios' ? styles.listBlockInputIos : null,
        ]}
      />
    </View>
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
  inputAccessoryViewID,
  registerInputRef,
  onEnterKey,
  onSelectionChange,
  pendingTextColor,
  contentRevision,
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
  onBackspaceAtStart?: (currentText: string) => void;
  inputAccessoryViewID?: string;
  registerInputRef: (blockId: string, ref: TextInput | null) => void;
  onEnterKey?: (currentText: string) => void;
  onSelectionChange?: (event: { nativeEvent: { selection: { start: number; end: number } } }) => void;
  pendingTextColor?: string;
  contentRevision?: number;
  onOpenLink?: (url: string) => void;
  onBlockLayout?: (blockId: string, y: number) => void;
}) {
  const { t } = useTranslation();
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
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
          <ImeSafeTextInput
            value={block.text}
            onChangeText={(text) => onChangeBlock(block.id, { text })}
            onFocus={() => onFocusBlock(block.id)}
            inputAccessoryViewID={inputAccessoryViewID}
            placeholder={t('studyNote.titlePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={[styles.headingPrimary, { fontSize: titleSize, color: '#fff' }]}
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
                <ImeSafeTextInput
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
                accessibilityLabel={t('studyNote.addRow')}
              >
                <IconSymbol name="plus" size={12} color={palette.onVariant} />
                <ThemedText style={[styles.tableControlLabel, { color: palette.onVariant }]}>{t('studyNote.addRow')}</ThemedText>
              </Pressable>
            ) : null}
            {canAddCol ? (
              <Pressable
                onPress={addTableCol}
                style={[styles.tableControlBtn, { borderColor: palette.outlineVariant }]}
                accessibilityRole="button"
                accessibilityLabel={t('studyNote.addCol')}
              >
                <IconSymbol name="plus" size={12} color={palette.onVariant} />
                <ThemedText style={[styles.tableControlLabel, { color: palette.onVariant }]}>{t('studyNote.addCol')}</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (block.kind === 'image') {
    const uri = normalizeWorkStudyImageUri(block.imageUri);
    const imageLoadFailed = Boolean(uri) && failedImageUri === uri;
    const displayHeight = resolveWorkStudyImageDisplayHeight(block);
    const atMinHeight = displayHeight <= WORK_STUDY_IMAGE_MIN_DISPLAY_HEIGHT;
    const atMaxHeight = displayHeight >= WORK_STUDY_IMAGE_MAX_DISPLAY_HEIGHT;

    const setImageDisplayHeight = (nextHeight: number) => {
      onChangeBlock(block.id, {
        imageDisplayHeight: clampWorkStudyImageDisplayHeight(nextHeight),
      });
      void Haptics.selectionAsync();
    };

    return (
      <View
        style={[rowShellStyle, styles.imageWrap, { borderColor: palette.outlineVariant }]}
        onLayout={(e) => onBlockLayout?.(block.id, e.nativeEvent.layout.y)}>
        <Pressable
          onPress={onPickImage}
          accessibilityRole="button"
          accessibilityLabel={uri ? t('studyNote.pickPhotoChangeA11y') : t('studyNote.pickPhotoSelectA11y')}
          style={styles.imagePickArea}
        >
          {uri && !imageLoadFailed ? (
            <Image
              source={{ uri }}
              style={[styles.imagePreview, { height: displayHeight }]}
              contentFit="contain"
              recyclingKey={uri}
              onError={() => setFailedImageUri(uri)}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
              <IconSymbol name="photo.on.rectangle.angled" size={28} color={palette.onVariant} />
              <ThemedText style={[styles.imagePickLabel, { color: palette.onVariant }]}>
                {imageLoadFailed ? t('studyNote.imageLoadFailed') : t('studyNote.pickFromAlbum')}
              </ThemedText>
            </View>
          )}
        </Pressable>
        {uri && !imageLoadFailed ? (
          <View style={styles.imageSizeControls}>
            <View style={styles.imageSizeStepRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('studyNote.shrinkPhotoA11y')}
                disabled={atMinHeight}
                onPress={() => setImageDisplayHeight(stepWorkStudyImageDisplayHeight(displayHeight, -1))}
                style={({ pressed }) => [
                  styles.imageSizeStepBtn,
                  {
                    borderColor: palette.outlineVariant,
                    opacity: atMinHeight ? 0.35 : pressed ? 0.65 : 1,
                  },
                ]}>
                <IconSymbol name="minus" size={14} color={palette.onSurface} />
              </Pressable>
              <ThemedText style={[styles.imageSizeLabel, { color: palette.onVariant }]}>{t('studyNote.sizeLabel')}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('studyNote.enlargePhotoA11y')}
                disabled={atMaxHeight}
                onPress={() => setImageDisplayHeight(stepWorkStudyImageDisplayHeight(displayHeight, 1))}
                style={({ pressed }) => [
                  styles.imageSizeStepBtn,
                  {
                    borderColor: palette.outlineVariant,
                    opacity: atMaxHeight ? 0.35 : pressed ? 0.65 : 1,
                  },
                ]}>
                <IconSymbol name="plus" size={14} color={palette.onSurface} />
              </Pressable>
            </View>
            <View style={styles.imageSizePresetRow}>
              {WORK_STUDY_IMAGE_DISPLAY_HEIGHT_PRESETS.map((preset) => {
                const selected = displayHeight === preset.value;
                return (
                  <Pressable
                    key={preset.label}
                    accessibilityRole="button"
                    accessibilityLabel={t('studyNote.photoSizeA11y', { label: preset.label })}
                    accessibilityState={{ selected }}
                    onPress={() => setImageDisplayHeight(preset.value)}
                    style={({ pressed }) => [
                      styles.imageSizePresetBtn,
                      {
                        borderColor: selected ? palette.onSurface : palette.outlineVariant,
                        backgroundColor: selected ? 'rgba(0,0,0,0.06)' : 'transparent',
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.imageSizePresetLabel,
                        { color: selected ? palette.onSurface : palette.onVariant },
                      ]}>
                      {preset.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {uri ? (
          <Pressable
            onPress={onPickImage}
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.changePhotoA11y')}
            style={[styles.imageChangeBtn, { borderColor: palette.outlineVariant }]}
          >
            <IconSymbol name="photo.on.rectangle.angled" size={14} color={palette.onVariant} />
            <ThemedText style={[styles.imageChangeLabel, { color: palette.onVariant }]}>{t('studyNote.changePhoto')}</ThemedText>
          </Pressable>
        ) : null}
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
          contentRevision={contentRevision}
          placeholder={t('studyNote.captionPlaceholder')}
        />
      </View>
    );
  }

  const rowPrefix =
    block.kind === 'checklist' ? (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: block.checked === true }}
        accessibilityLabel={
          block.checked
            ? t('studyNote.checklistUncheckA11y', { label: block.text || t('studyNote.checklistFallback') })
            : t('studyNote.checklistCheckA11y', { label: block.text || t('studyNote.checklistFallback') })
        }
        onPress={() => onChangeBlock(block.id, { checked: !block.checked })}
        hitSlop={{ top: 8, right: 10, bottom: 8, left: 10 }}
        style={styles.checkBoxHitArea}>
        <View
          style={[
            styles.checkBox,
            {
              borderColor: block.checked ? palette.onSurface : palette.outline,
              backgroundColor: block.checked ? palette.onSurface : 'transparent',
            },
          ]}>
          {block.checked ? <IconSymbol name="checkmark" size={12} color="#fff" /> : null}
        </View>
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
      {/* prefix를 항상 두어 형제 인덱스 변동으로 TextInput이 리마운트되지 않게 한다 */}
      <View
        style={
          isListBlock
            ? block.kind === 'checklist'
              ? styles.checklistPrefixSlot
              : styles.listPrefixSlot
            : styles.paragraphPrefixSlot
        }
        pointerEvents={isListBlock ? 'box-none' : 'none'}>
        {rowPrefix}
      </View>
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
          contentRevision={contentRevision}
          compact={isListBlock}
          pendingTextColor={pendingTextColor}
          multiline
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
                ]
              : undefined
          }
        />
        {block.marks?.link ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('studyNote.openLinkA11y', { url: block.marks.link })}
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
  const { t } = useTranslation();
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingMarks, setPendingMarksState] = useState<WorkStudyBlockMarks>({});
  const [activeListKind, setActiveListKind] = useState<ListBlockKind | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [contentRevision, setContentRevision] = useState(0);
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
  /** Enter/구조 변경으로 옮긴 포커스 — handleFocusBlock 중복 스크롤 방지 */
  const programmaticFocusRef = useRef(false);
  /** 새 블록 onLayout 이후에만 스크롤 — 레이아웃 접힘 중 스크롤 점프 방지 */
  const pendingEnterScrollBlockIdRef = useRef<string | null>(null);
  const linkTargetBlockIdRef = useRef<string | null>(null);
  const toolbarInteractionRef = useRef(false);
  const textEditSessionRef = useRef(false);
  const textEditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        programmaticFocusRef.current = true;
        input.focus();
        applyInputSelection(input, cursor);
        pendingFocusBlockIdRef.current = null;
        pendingFocusSelectionRef.current = null;
      }
    },
    [applyInputSelection],
  );

  const retainEditorKeyboardFocus = useCallback(
    (options?: { retries?: number }) => {
      const retries = options?.retries ?? 0;
      const blockId = activeBlockIdRef.current ?? pendingFocusBlockIdRef.current;
      if (!blockId) return;
      const input = blockInputRefs.current[blockId];
      if (!input) {
        if (retries > 0) {
          requestAnimationFrame(() => retainEditorKeyboardFocus({ retries: retries - 1 }));
        }
        return;
      }
      const sel = selectionByBlockRef.current[blockId];
      input.focus();
      if (sel) {
        applyInputSelection(input, sel.start);
      }
      if (retries > 0) {
        requestAnimationFrame(() => retainEditorKeyboardFocus({ retries: retries - 1 }));
      }
    },
    [applyInputSelection],
  );
  const retainEditorKeyboardFocusRef = useRef(retainEditorKeyboardFocus);
  retainEditorKeyboardFocusRef.current = retainEditorKeyboardFocus;

  const beginToolbarInteraction = useCallback(() => {
    toolbarInteractionRef.current = true;
    // pressIn 시점에 바로 포커스 유지 — blur/리마운트 전에 키보드가 내려가지 않게 한다.
    retainEditorKeyboardFocus({ retries: 2 });
  }, [retainEditorKeyboardFocus]);

  const endToolbarInteraction = useCallback(() => {
    // 리스트 토글 직후 native blur/hide 이벤트가 늦게 오므로 조금 더 길게 보호
    setTimeout(() => {
      toolbarInteractionRef.current = false;
    }, 320);
  }, []);

  const handleBlockBlur = useCallback(() => {
    if (!toolbarInteractionRef.current) return;
    retainEditorKeyboardFocus({ retries: 3 });
  }, [retainEditorKeyboardFocus]);

  const scrollActiveBlockIntoView = useCallback(
    (blockId?: string | null, options?: { animated?: boolean }) => {
      const targetId = blockId ?? activeBlockIdRef.current;
      if (!targetId) return;
      const y = blockLayoutYRef.current[targetId];
      if (y == null) return;
      const viewportH = scrollViewportLayoutHeightRef.current;
      if (viewportH <= 0) return;
      const animated = options?.animated ?? true;

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
          animated,
        });
      } else if (y < visibleTop) {
        canvasScrollRef.current?.scrollTo({
          y: Math.max(0, y - 12),
          animated,
        });
      }
    },
    [keyboardInset, keyboardToolbarMode, showColorPicker, showLinkInput],
  );

  const registerBlockLayout = useCallback(
    (blockId: string, y: number) => {
      blockLayoutYRef.current[blockId] = y;
      if (pendingEnterScrollBlockIdRef.current === blockId) {
        pendingEnterScrollBlockIdRef.current = null;
        scrollActiveBlockIntoView(blockId, { animated: false });
      }
    },
    [scrollActiveBlockIntoView],
  );

  const registerInputRef = useCallback(
    (blockId: string, ref: TextInput | null) => {
      if (ref) {
        blockInputRefs.current[blockId] = ref;
        if (pendingFocusBlockIdRef.current === blockId) {
          const cursor = pendingFocusSelectionRef.current?.start ?? 0;
          programmaticFocusRef.current = true;
          ref.focus();
          applyInputSelection(ref, cursor);
          pendingFocusBlockIdRef.current = null;
          pendingFocusSelectionRef.current = null;
          // 레이아웃 확정 후 스크롤 (중간 좌표로 점프하지 않게)
          pendingEnterScrollBlockIdRef.current = blockId;
          if (blockLayoutYRef.current[blockId] != null) {
            const target = blockId;
            pendingEnterScrollBlockIdRef.current = null;
            requestAnimationFrame(() => {
              scrollActiveBlockIntoView(target, { animated: false });
            });
          }
        }
        return;
      }
      delete blockInputRefs.current[blockId];
    },
    [applyInputSelection, scrollActiveBlockIntoView],
  );

  const pushHistory = useCallback(() => {
    undoStack.current = [
      ...undoStack.current.slice(-(MAX_HISTORY - 1)),
      cloneDocument(documentRef.current),
    ];
    redoStack.current = [];
    setHistoryTick((n) => n + 1);
  }, []);

  const armTextEditHistory = useCallback(() => {
    if (textEditSessionRef.current) return;
    textEditSessionRef.current = true;
    pushHistory();
    if (textEditTimerRef.current) clearTimeout(textEditTimerRef.current);
    textEditTimerRef.current = setTimeout(() => {
      textEditSessionRef.current = false;
    }, 650);
  }, [pushHistory]);

  const clearTextEditSession = useCallback(() => {
    textEditSessionRef.current = false;
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }
  }, []);

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
    programmaticFocusRef.current = true;
    input.focus();
    applyInputSelection(input, cursor);
    pendingFocusBlockIdRef.current = null;
    pendingFocusSelectionRef.current = null;
    pendingEnterScrollBlockIdRef.current = blockId;
    if (blockLayoutYRef.current[blockId] != null) {
      pendingEnterScrollBlockIdRef.current = null;
      requestAnimationFrame(() => {
        scrollActiveBlockIntoView(blockId, { animated: false });
      });
    }
  }, [activeBlockId, activeBlocks, applyInputSelection, scrollActiveBlockIntoView]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      // 툴바(체크/리스트) 탭 중 순간 hide는 무시 — inset이 0이 되면 스크롤이 위로 튀고 키보드가 깜빡임
      if (toolbarInteractionRef.current) {
        retainEditorKeyboardFocusRef.current({ retries: 3 });
        return;
      }
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
      const page = getWorkStudyActivePage(documentRef.current);
      const blocks = page?.blocks ?? [];
      if (blocks.length === 0) return;
      const next = blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
      replaceActiveBlocks(next);
    },
    [replaceActiveBlocks],
  );

  const commitStructuralChange = useCallback(
    (blocks: WorkStudyDocBlock[]) => {
      clearTextEditSession();
      pushHistory();
      replaceActiveBlocks(blocks);
    },
    [clearTextEditSession, pushHistory, replaceActiveBlocks],
  );

  /** Enter 직전 draft 텍스트를 반영한 스냅샷을 history에 남긴 뒤 구조 변경을 적용 */
  const commitEnterStructuralChange = useCallback(
    (blockId: string, flushedText: string, nextBlocks: WorkStudyDocBlock[]) => {
      clearTextEditSession();
      const withPage = ensurePageDocument();
      const page = getWorkStudyActivePage(withPage);
      const currentBlocks = page?.blocks ?? [];
      const flushedBlocks = currentBlocks.map((b) =>
        b.id === blockId ? { ...b, text: flushedText } : b,
      );
      undoStack.current = [
        ...undoStack.current.slice(-(MAX_HISTORY - 1)),
        cloneDocument(setWorkStudyActivePageBlocks(withPage, flushedBlocks)),
      ];
      redoStack.current = [];
      setHistoryTick((n) => n + 1);
      replaceActiveBlocks(nextBlocks);
    },
    [clearTextEditSession, ensurePageDocument, replaceActiveBlocks],
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
        // Enter로 새 줄을 만든 직후엔 register/layout에서 이미 스크롤함 — 중복 점프 방지
        if (programmaticFocusRef.current) {
          programmaticFocusRef.current = false;
          return;
        }
        scrollActiveBlockIntoView(blockId);
      });
      const pending = resolvePendingMarks();
      if (!pending || !block || block.kind === 'table' || block.kind === 'image' || block.kind === 'heading') {
        return;
      }
      const nextMarks = normalizeBlockMarks({ ...block.marks, ...pending });
      const prevMarks = normalizeBlockMarks(block.marks);
      if (JSON.stringify(prevMarks) === JSON.stringify(nextMarks)) {
        return;
      }
      replaceActiveBlocks(
        activeBlocks.map((b) =>
          b.id === blockId
            ? { ...b, marks: nextMarks }
            : b,
        ),
      );
    },
    [activeBlocks, replaceActiveBlocks, resolvePendingMarks, scrollActiveBlockIntoView],
  );

  const handleChangeBlock = useCallback(
    (id: string, patch: Partial<WorkStudyDocBlock>) => {
      if (patch.text !== undefined) {
        armTextEditHistory();
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
      } else if (patch.checked !== undefined || patch.imageDisplayHeight !== undefined) {
        pushHistory();
      }
      updateBlock(id, patch);
    },
    [activeBlocks, armTextEditHistory, pushHistory, resolvePendingMarks, updateBlock],
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
      // 다음 줄로 이어갈 때 링크는 복제하지 않는다
      const resolvedMarks = marksForContinuedBlock(
        normalizeBlockMarks(marks ?? source.marks ?? resolvePendingMarks()),
      );
      if (resolvedMarks) block.marks = resolvedMarks;
      if (kind === 'checklist') block.checked = false;
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
    (blockId: string, textOverride?: string) => {
      const page = getWorkStudyActivePage(documentRef.current);
      const blocks = page?.blocks ?? activeBlocks;
      const block = blocks.find((b) => b.id === blockId);
      if (!block || block.kind !== 'paragraph') return;
      const text = textOverride ?? block.text;
      const { cursor, splitMidLine } = resolveEnterSplitCursor(
        text,
        selectionByBlockRef.current[blockId],
      );
      const keepMarks = normalizeBlockMarks(block.marks ?? resolvePendingMarks());
      const nextMarks = marksForContinuedBlock(keepMarks);
      // 빈 줄 Enter는 cursor===0이지만 "줄 앞"이 아니라 "줄 끝"과 같다 → 아래로 새 칸
      if (cursor === 0 && !isVisuallyEmptyText(text)) {
        const newBlock = createWorkStudyDocBlock('paragraph');
        if (nextMarks) newBlock.marks = nextMarks;
        const index = blocks.findIndex((b) => b.id === blockId);
        const flushed = blocks.map((b) => (b.id === blockId ? { ...b, text } : b));
        const next = [...flushed];
        next.splice(index, 0, newBlock);
        commitEnterStructuralChange(blockId, text, next);
        pendingFocusBlockIdRef.current = newBlock.id;
        pendingFocusSelectionRef.current = { start: 0, end: 0 };
        setActiveBlockId(newBlock.id);
        return;
      }
      if (splitMidLine) {
        const before = text.slice(0, cursor);
        const after = text.slice(cursor);
        const newBlock = createWorkStudyDocBlock('paragraph');
        newBlock.text = after;
        if (nextMarks) newBlock.marks = nextMarks;
        const index = blocks.findIndex((b) => b.id === blockId);
        const next = blocks.map((b) =>
          b.id === blockId ? { ...b, text: before, marks: keepMarks ?? b.marks } : b,
        );
        next.splice(index + 1, 0, newBlock);
        commitEnterStructuralChange(blockId, text, next);
        pendingFocusBlockIdRef.current = newBlock.id;
        // 중간 분할: 새 블록 텍스트 시작점에 캐럿
        pendingFocusSelectionRef.current = { start: 0, end: 0 };
        setActiveBlockId(newBlock.id);
        return;
      }
      // 줄 끝 Enter: 현재 텍스트를 반영한 뒤 빈 다음 줄 추가
      const flushed = blocks.map((b) => (b.id === blockId ? { ...b, text } : b));
      const newBlock = createWorkStudyDocBlock('paragraph');
      if (nextMarks) newBlock.marks = nextMarks;
      const index = flushed.findIndex((b) => b.id === blockId);
      const next = [...flushed];
      next.splice(index + 1, 0, newBlock);
      commitEnterStructuralChange(blockId, text, next);
      pendingFocusBlockIdRef.current = newBlock.id;
      pendingFocusSelectionRef.current = { start: 0, end: 0 };
      setActiveBlockId(newBlock.id);
    },
    [activeBlocks, commitEnterStructuralChange, resolvePendingMarks],
  );

  const continueListBlock = useCallback(
    (blockId: string, kind: ListBlockKind, textOverride?: string) => {
      const page = getWorkStudyActivePage(documentRef.current);
      const blocks = page?.blocks ?? activeBlocks;
      const block = blocks.find((b) => b.id === blockId);
      if (!block || block.kind !== kind) return;
      const text = textOverride ?? block.text;
      const { cursor, splitMidLine } = resolveEnterSplitCursor(
        text,
        selectionByBlockRef.current[blockId],
      );
      const keepMarks = normalizeBlockMarks(block.marks ?? resolvePendingMarks());
      const nextMarks = marksForContinuedBlock(keepMarks);

      // 빈 리스트 줄 Enter도 아래로 새 칸 (cursor===0만으로 위로 끼우지 않음)
      if (cursor === 0 && !isVisuallyEmptyText(text)) {
        const newBlock = createWorkStudyDocBlock(kind);
        if (kind === 'checklist') newBlock.checked = false;
        if (nextMarks) newBlock.marks = nextMarks;
        const index = blocks.findIndex((b) => b.id === blockId);
        const flushed = blocks.map((b) => (b.id === blockId ? { ...b, text } : b));
        const next = [...flushed];
        next.splice(index, 0, newBlock);
        commitEnterStructuralChange(blockId, text, next);
        if (isListBlockKind(kind)) setActiveListKind(kind);
        pendingFocusBlockIdRef.current = newBlock.id;
        pendingFocusSelectionRef.current = { start: 0, end: 0 };
        setActiveBlockId(newBlock.id);
        return;
      }

      if (splitMidLine) {
        const before = text.slice(0, cursor);
        const after = text.slice(cursor);
        const newBlock = createWorkStudyDocBlock(kind);
        newBlock.text = after;
        if (kind === 'checklist') newBlock.checked = false;
        if (nextMarks) newBlock.marks = nextMarks;
        const index = blocks.findIndex((b) => b.id === blockId);
        const next = blocks.map((b) =>
          b.id === blockId ? { ...b, text: before, marks: keepMarks ?? b.marks } : b,
        );
        next.splice(index + 1, 0, newBlock);
        commitEnterStructuralChange(blockId, text, next);
        pendingFocusBlockIdRef.current = newBlock.id;
        pendingFocusSelectionRef.current = { start: 0, end: 0 };
        setActiveBlockId(newBlock.id);
        return;
      }

      const flushed = blocks.map((b) => (b.id === blockId ? { ...b, text } : b));
      const newBlock = createWorkStudyDocBlock(kind);
      if (kind === 'checklist') newBlock.checked = false;
      if (nextMarks) newBlock.marks = nextMarks;
      const index = flushed.findIndex((b) => b.id === blockId);
      const next = [...flushed];
      next.splice(index + 1, 0, newBlock);
      commitEnterStructuralChange(blockId, text, next);
      if (isListBlockKind(kind)) setActiveListKind(kind);
      pendingFocusBlockIdRef.current = newBlock.id;
      pendingFocusSelectionRef.current = { start: 0, end: 0 };
      setActiveBlockId(newBlock.id);
    },
    [activeBlocks, commitEnterStructuralChange, resolvePendingMarks],
  );

  const handleBlockEnter = useCallback(
    (blockId: string, currentText: string) => {
      const page = getWorkStudyActivePage(documentRef.current);
      const block =
        (page?.blocks ?? activeBlocks).find((b) => b.id === blockId) ??
        activeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      if (isListBlockKind(block.kind)) {
        continueListBlock(block.id, block.kind, currentText);
        return;
      }
      // 일반/빈 문단도 Enter로 다음 블록을 만든다.
      // (서식 있는 문단만 처리하면 빈 화면에서 커서가 내려갔다가 다시 올라간다)
      if (block.kind === 'paragraph') {
        continueParagraph(block.id, currentText);
      }
    },
    [activeBlocks, continueListBlock, continueParagraph],
  );

  const handleBackspaceAtStart = useCallback(
    (blockId: string, blockIndex: number, currentText?: string) => {
      const page = getWorkStudyActivePage(documentRef.current);
      const blocks = page?.blocks ?? activeBlocks;
      const liveIndex = blocks.findIndex((b) => b.id === blockId);
      const block = liveIndex >= 0 ? blocks[liveIndex]! : activeBlocks[blockIndex];
      const resolvedIndex = liveIndex >= 0 ? liveIndex : blockIndex;
      if (!block || block.id !== blockId) return;

      // 문서 커밋은 debounce되므로 입력 중인 draft를 우선한다.
      // (문서의 옛 텍스트로 병합하면 지운 글자가 되살아난다)
      const liveText = currentText ?? block.text;
      const blockIsVisuallyEmpty = isVisuallyEmptyText(liveText);

      const removeImageBlockAt = (imageIndex: number, focusAfter: { id: string; cursor: number }) => {
        Alert.alert(t('studyNote.deletePhotoTitle'), t('studyNote.deletePhotoMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              const latestPage = getWorkStudyActivePage(documentRef.current);
              const latestBlocks = latestPage?.blocks ?? activeBlocks;
              if (imageIndex < 0 || imageIndex >= latestBlocks.length) return;
              if (latestBlocks[imageIndex]?.kind !== 'image') return;
              pushHistory();
              if (latestBlocks.length === 1) {
                transferFocusToBlock(focusAfter.id, 0);
                replaceActiveBlocks([{ id: latestBlocks[imageIndex]!.id, kind: 'paragraph', text: '' }]);
                setActiveListKind(null);
              } else {
                const next = latestBlocks.filter((_, index) => index !== imageIndex);
                transferFocusToBlock(focusAfter.id, focusAfter.cursor);
                replaceActiveBlocks(next);
              }
              void Haptics.selectionAsync();
            },
          },
        ]);
      };

      // 빈 줄은 커서 위치와 무관하게 제거한다.
      // (센티널·선택영역 stale로 cursor>0 이어도 빈 텍스트 줄이 안 지워지던 원인)
      if (blockIsVisuallyEmpty) {
        if (block.kind === 'image') {
          const focusId =
            blocks.length === 1
              ? block.id
              : resolvedIndex > 0
                ? blocks[resolvedIndex - 1]!.id
                : blocks[resolvedIndex + 1]!.id;
          const focusCursor =
            blocks.length === 1
              ? 0
              : resolvedIndex > 0
                ? blocks[resolvedIndex - 1]!.text.length
                : 0;
          removeImageBlockAt(resolvedIndex, { id: focusId, cursor: focusCursor });
          return;
        }

        pushHistory();

        if (blocks.length === 1) {
          const cleared: WorkStudyDocBlock = {
            id: block.id,
            kind: 'paragraph',
            text: '',
          };
          transferFocusToBlock(block.id, 0);
          replaceActiveBlocks([cleared]);
          setActiveListKind(null);
          void Haptics.selectionAsync();
          return;
        }

        const focusId =
          resolvedIndex > 0 ? blocks[resolvedIndex - 1]!.id : blocks[resolvedIndex + 1]!.id;
        const focusCursor =
          resolvedIndex > 0 ? blocks[resolvedIndex - 1]!.text.length : 0;
        const next = blocks.filter((_, index) => index !== resolvedIndex);
        transferFocusToBlock(focusId, focusCursor);
        replaceActiveBlocks(next);
        void Haptics.selectionAsync();
        return;
      }

      const sel = selectionByBlockRef.current[blockId];
      const cursor = sel?.start ?? 0;
      if (cursor > 0) return;

      if (resolvedIndex > 0) {
        const prev = blocks[resolvedIndex - 1]!;
        // 바로 위가 이미지면 확인 후 제거한다.
        if (prev.kind === 'image') {
          removeImageBlockAt(resolvedIndex - 1, { id: blockId, cursor: 0 });
          return;
        }
        if (prev.kind === 'table') {
          pushHistory();
          const next = blocks.filter((_, index) => index !== resolvedIndex - 1);
          transferFocusToBlock(blockId, 0);
          replaceActiveBlocks(next);
          void Haptics.selectionAsync();
          return;
        }
        const canMergeParagraph = block.kind === 'paragraph' && prev.kind === 'paragraph';
        if (canMergeParagraph) {
          pushHistory();
          const mergedText = prev.text + liveText;
          const marks = normalizeBlockMarks({ ...prev.marks, ...block.marks });
          const cursorAt = prev.text.length;
          const next = blocks
            .map((b, index) =>
              index === resolvedIndex - 1 ? { ...b, text: mergedText, marks: marks ?? b.marks } : b,
            )
            .filter((_, index) => index !== resolvedIndex);
          transferFocusToBlock(prev.id, cursorAt);
          replaceActiveBlocks(next);
          void Haptics.selectionAsync();
        }
      }
    },
    [activeBlocks, pushHistory, replaceActiveBlocks, transferFocusToBlock],
  );

  const pickImageUri = useCallback(async (): Promise<string | null> => {
    const result = await pickImageFromLibrary();
    if (result.ok) {
      return normalizeWorkStudyImageUri(result.uri);
    }

    if (result.reason === 'cancelled') {
      return null;
    }

    if (result.reason === 'permission_denied') {
      Alert.alert(
        t('studyNote.photoPermissionTitle'),
        t('studyNote.photoPermissionMessage'),
      );
      return null;
    }

    if (result.reason === 'module_unavailable') {
      Alert.alert(
        t('studyNote.rebuildTitle'),
        t('studyNote.rebuildMessage'),
      );
      return null;
    }

    Alert.alert(t('studyNote.photoLoadFailedTitle'), t('studyNote.photoLoadFailedMessage'));
    return null;
  }, []);

  const pickImageForBlock = useCallback(
    async (blockId: string) => {
      const imageUri = await pickImageUri();
      if (!imageUri) return;

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
    },
    [ensurePageDocument, onChangeDocument, pickImageUri],
  );

  const pickAndInsertImageBlock = useCallback(async () => {
    const imageUri = await pickImageUri();
    if (!imageUri) return;

    const withPage = ensurePageDocument();
    const page = getWorkStudyActivePage(withPage);
    const blocks = page?.blocks ?? [];
    const block = createWorkStudyDocBlock('image');
    block.imageUri = imageUri;
    const tail = createWorkStudyDocBlock('paragraph');

    pendingEnterScrollBlockIdRef.current = block.id;
    commitStructuralChange([...blocks, block, tail]);
    setActiveBlockId(tail.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [commitStructuralChange, ensurePageDocument, pickImageUri]);

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

  const insertEdgeParagraph = useCallback(
    (edge: 'top' | 'bottom') => {
      const withPage = ensurePageDocument();
      const page = getWorkStudyActivePage(withPage);
      const blocks = page?.blocks ?? [];
      const block = createWorkStudyDocBlock('paragraph');
      const next = edge === 'top' ? [block, ...blocks] : [...blocks, block];

      pendingFocusBlockIdRef.current = block.id;
      pendingFocusSelectionRef.current = { start: 0, end: 0 };
      pendingEnterScrollBlockIdRef.current = block.id;
      activeBlockIdRef.current = block.id;
      commitStructuralChange(next);
      setActiveBlockId(block.id);
      setActiveListKind(null);
      void Haptics.selectionAsync();
    },
    [commitStructuralChange, ensurePageDocument],
  );

  /** 메모 빈 영역 탭 → 키보드 활성화(마지막 본문 포커스, 없으면 문단 추가) */
  const focusCanvasEditor = useCallback(() => {
    const page = getWorkStudyActivePage(documentRef.current);
    const blocks = page?.blocks ?? [];
    const activeId = activeBlockIdRef.current;
    const active = activeId ? blocks.find((b) => b.id === activeId) : null;
    const target =
      (active && isCanvasFocusableBlock(active) ? active : null) ??
      [...blocks].reverse().find(isCanvasFocusableBlock);
    if (target) {
      transferFocusToBlock(target.id, target.text.length);
      return;
    }
    insertBlock('paragraph');
  }, [insertBlock, transferFocusToBlock]);

  const handleEmptyCanvasPress = useCallback(() => {
    focusCanvasEditor();
  }, [focusCanvasEditor]);

  const resetDocument = useCallback(() => {
    if (activeBlocks.length === 0) return;
    Alert.alert(t('studyNote.clearAllTitle'), t('studyNote.clearAllMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('studyNote.clearAllConfirm'),
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
    : t('studyNote.memoFallback');
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
      Alert.alert(t('studyNote.shareNoContentTitle'), t('studyNote.shareNoContentMessage'));
      return;
    }
    const title = resolveWorkStudyNotePageLabel(page, document.pages);
    const body = workStudyPageBlocksToPlainText(page.blocks);
    if (!body.trim()) {
      Alert.alert(t('studyNote.shareNoContentTitle'), t('studyNote.shareEmptyBody'));
      return;
    }
    void Haptics.selectionAsync();
    try {
      await Share.share({
        message: `${title}\n\n${body}`,
        title,
      });
    } catch {
      Alert.alert(t('studyNote.shareFailedTitle'), t('studyNote.photoLoadFailedMessage'));
    }
  }, [document, t]);

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

      const keepFocusOn = (blockId: string) => {
        pendingFocusBlockIdRef.current = blockId;
        setActiveBlockId(blockId);
        // 블록 kind 전환 직후 TextInput이 잠깐 풀려도 바로 되돌림
        requestAnimationFrame(() => {
          retainEditorKeyboardFocus({ retries: 3 });
        });
        setTimeout(() => retainEditorKeyboardFocus({ retries: 2 }), 16);
        setTimeout(() => retainEditorKeyboardFocus({ retries: 1 }), 64);
      };

      if (block?.kind === kind) {
        pushHistory();
        replaceActiveBlocks(
          activeBlocks.map((b) =>
            b.id === block.id ? convertBlockToKind(b, 'paragraph') : b,
          ),
        );
        setActiveListKind(null);
        keepFocusOn(block.id);
        void Haptics.selectionAsync();
        return;
      }

      if (block && (block.kind === 'paragraph' || isListBlockKind(block.kind))) {
        pushHistory();
        replaceActiveBlocks(
          activeBlocks.map((b) => (b.id === block.id ? convertBlockToKind(b, kind) : b)),
        );
        setActiveListKind(kind);
        keepFocusOn(block.id);
        void Haptics.selectionAsync();
        return;
      }

      insertBlock(kind);
    },
    [
      activeBlockId,
      activeBlocks,
      insertBlock,
      pushHistory,
      replaceActiveBlocks,
      retainEditorKeyboardFocus,
    ],
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
            b.id === activeBlockId ? { ...b, marks: normalizeBlockMarks(merged) } : b,
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
    // 색 피커와 같이 다시 누르면 닫기
    if (showLinkInput) {
      setShowLinkInput(false);
      setLinkDraft('');
      linkTargetBlockIdRef.current = null;
      return;
    }

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
      const marks = marksForContinuedBlock(resolvePendingMarks());
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
  }, [
    activeBlockId,
    commitStructuralChange,
    ensurePageDocument,
    resolvePendingMarks,
    showLinkInput,
  ]);

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
      Alert.alert(t('studyNote.openLinkFailedTitle'), t('studyNote.openLinkFailedMessage'));
    }
  }, []);

  const dismissEditorKeyboard = useCallback(() => {
    const cleanupEmptyFocusedListBlock = () => {
      const blockId = activeBlockIdRef.current;
      if (!blockId) return;
      const page = getWorkStudyActivePage(documentRef.current);
      const blocks = page?.blocks ?? [];
      const blockIndex = blocks.findIndex((b) => b.id === blockId);
      if (blockIndex < 0) return;
      const block = blocks[blockIndex];
      if (!block || !isListBlockKind(block.kind)) return;
      if (block.text.trim().length > 0) return;

      pushHistory();
      if (blocks.length === 1) {
        // 마지막 빈 리스트 줄은 문단으로 되돌려 다음 진입 시 리스트 마커가 남지 않게 한다.
        replaceActiveBlocks([{ ...block, kind: 'paragraph', text: '', checked: undefined }]);
        setActiveListKind(null);
        return;
      }

      const focusTarget =
        blockIndex > 0
          ? blocks[blockIndex - 1]
          : blocks[blockIndex + 1];
      const next = blocks.filter((_, index) => index !== blockIndex);
      if (focusTarget) {
        const cursor = blockIndex > 0 ? focusTarget.text.length : 0;
        selectionByBlockRef.current[focusTarget.id] = { start: cursor, end: cursor };
        setActiveBlockId(focusTarget.id);
      }
      replaceActiveBlocks(next);
      setActiveListKind(null);
    };

    cleanupEmptyFocusedListBlock();
    toolbarInteractionRef.current = false;
    setShowColorPicker(false);
    setShowLinkInput(false);
    const blockId = activeBlockIdRef.current;
    if (blockId) {
      blockInputRefs.current[blockId]?.blur();
    }
    Keyboard.dismiss();
    setKeyboardInset(0);
    void Haptics.selectionAsync();
  }, [pushHistory, replaceActiveBlocks]);

  const onToolbarAction = useCallback(
    (action: StudyToolbarAction) => {
      if (action === 'dismiss-keyboard') {
        dismissEditorKeyboard();
        return;
      }

      const shouldRetainFocus = keyboardInset > 0 || Boolean(activeBlockIdRef.current);
      if (shouldRetainFocus) beginToolbarInteraction();

      switch (action) {
        case 'undo': {
          const prev = undoStack.current.pop();
          if (prev) {
            clearTextEditSession();
            redoStack.current.push(cloneDocument(documentRef.current));
            replaceDocument(prev);
            setHistoryTick((n) => n + 1);
            setContentRevision((n) => n + 1);
          }
          break;
        }
        case 'redo': {
          const next = redoStack.current.pop();
          if (next) {
            clearTextEditSession();
            undoStack.current.push(cloneDocument(documentRef.current));
            replaceDocument(next);
            setHistoryTick((n) => n + 1);
            setContentRevision((n) => n + 1);
          }
          break;
        }
        case 'insert-line-top':
          insertEdgeParagraph('top');
          break;
        case 'insert-line-bottom':
          insertEdgeParagraph('bottom');
          break;
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
          void pickAndInsertImageBlock();
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
      if (shouldRetainFocus) {
        retainEditorKeyboardFocus();
        endToolbarInteraction();
      }
    },
    [
      activeBlockId,
      activeBlocks,
      beginToolbarInteraction,
      clearTextEditSession,
      commitStructuralChange,
      dismissEditorKeyboard,
      endToolbarInteraction,
      ensurePageDocument,
      insertBlock,
      insertEdgeParagraph,
      keyboardInset,
      keyboardToolbarMode,
      openColorPicker,
      openLinkEditor,
      pickAndInsertImageBlock,
      replaceDocument,
      resetDocument,
      retainEditorKeyboardFocus,
      toggleListKind,
      toggleMark,
    ],
  );

  const empty = activeBlocks.length === 0;
  const keyboardOpen = keyboardInset > 0;
  const useDockedKeyboardToolbar = keyboardToolbarMode === 'docked';
  /**
   * accessory 모드에서 TextInput props가 자주 바뀌면 iOS가 reloadInputViews로 키보드를 깜빡인다.
   * 리스트 토글 시 props는 안정화하고, 도킹 모드에서는 터치 시 포커스를 붙잡는다.
   */
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
  const toolbarRetainFocusHandler = beginToolbarInteraction;

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
            <ThemedText style={{ color: palette.onSurface, fontWeight: '700', fontSize: 12 }}>{t('common.apply')}</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {showColorPicker ? (
        <View style={[styles.colorRow, { borderColor: palette.outlineVariant, backgroundColor: NOTE_PAGE_BG }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.defaultColorA11y')}
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
          linkPickerOpen={showLinkInput}
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
        <View style={styles.headerSide}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.openListA11y')}
            onPress={openDrawer}
            hitSlop={8}
            style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.65 }]}>
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
          <ThemedText style={[styles.editorTitle, { color: palette.onSurface }]} numberOfLines={1}>
            {activePageLabel}
          </ThemedText>
        )}
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.shareA11y')}
            onPress={() => {
              void shareActivePage();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.65 }]}>
            <IconSymbol name="square.and.arrow.up" size={18} color={palette.onSurface} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.newMemoA11y')}
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
        keyboardShouldPersistTaps="always"
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
            onPress={focusCanvasEditor}
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.editBodyA11y')}
          />
        ) : null}
        {empty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('studyNote.startWritingA11y')}
            onPress={handleEmptyCanvasPress}
            style={[
              styles.emptyCanvas,
              useFlexCanvas ? styles.emptyCanvasFlex : null,
              { minHeight: canvasMinHeight, borderColor: palette.outlineVariant },
            ]}>
            <IconSymbol name="square.and.pencil" size={24} color={palette.onVariant} />
            <ThemedText style={[styles.emptyTitle, { color: palette.onSurface }]}>
              {t('studyNote.emptyTitle')}
            </ThemedText>
            <ThemedText style={[styles.emptyBody, { color: palette.onVariant }]}>
              {t('studyNote.emptyBody')}
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
                  isListBlockKind(block.kind) || block.kind === 'paragraph'
                    ? (currentText) => handleBlockEnter(block.id, currentText)
                    : undefined
                }
                onSelectionChange={(event) => handleSelectionChange(block.id, event)}
                onOpenLink={(url) => {
                  void handleOpenBlockLink(url);
                }}
                onPickImage={() => {
                  void pickImageForBlock(block.id);
                }}
                onBackspaceAtStart={(currentText) =>
                  handleBackspaceAtStart(block.id, blockIndex, currentText)
                }
                pendingTextColor={block.id === activeBlockId ? pendingMarks.color : undefined}
                contentRevision={contentRevision}
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
              accessibilityLabel={t('studyNote.closeListA11y')}
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

/** 리스트 본문 첫 줄 메트릭 — 체크/마커와 TextInput 1행 정렬 기준 */
const LIST_LINE_HEIGHT = 22;
const LIST_CHECK_SIZE = 18;
/**
 * 체크 상단 inset.
 * 줄 박스 중앙((22−18)/2=2) + iOS 한글 폴백·TextInput 글리프 처짐.
 */
const LIST_CHECK_OPTICAL_TOP = Platform.select({ ios: 5, android: 2, default: 2 })!;

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
  /** 좌·우 액션 폭을 맞춰 제목이 화면 정중앙에 오도록 함 (우측 버튼 2개 = 36+2+36) */
  headerSide: {
    width: 74,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSideEnd: {
    justifyContent: 'flex-end',
    gap: 2,
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
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
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
    paddingTop: 10,
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
  row: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  listRow: { alignItems: 'flex-start', gap: 10 },
  paragraphPrefixSlot: {
    width: 0,
    marginRight: 0,
    overflow: 'hidden',
  },
  listPrefixSlot: {
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    // 본문 첫 줄 글리프와 마커(• / 1.) 광학 정렬
    paddingTop: Platform.OS === 'ios' ? 2 : 1,
    flexShrink: 0,
  },
  /**
   * 체크박스는 멀티라인 전체 높이가 아니라 본문 첫 줄에만 맞춤.
   * iOS TextInput(커스텀 폰트+한글 폴백)은 글리프가 줄 박스 아래로 처지므로
   * paddingTop으로 체크 중심 ≈ 첫 줄 글리프 중심이 되게 한다.
   */
  checklistPrefixSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    paddingTop: LIST_CHECK_OPTICAL_TOP,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'visible',
  },
  rowBody: { flex: 1, gap: 4 },
  listRowBody: { gap: 0 },
  blockInput: { fontSize: 15, lineHeight: LIST_LINE_HEIGHT, paddingVertical: 0, minHeight: 28, width: '100%' },
  blockTextWrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-start',
  },
  listBlockInputWrap: {
    minHeight: LIST_LINE_HEIGHT,
    justifyContent: 'flex-start',
  },
  listBlockInput: {
    minHeight: LIST_LINE_HEIGHT,
    fontSize: 15,
    lineHeight: LIST_LINE_HEIGHT,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  listBlockInputIos: {
    // 네이티브 기본 inset을 눌러 첫 줄 y를 체크 슬롯과 맞춤
    paddingTop: 0,
    lineHeight: LIST_LINE_HEIGHT,
  },
  paragraphInput: { textAlignVertical: 'top', width: '100%' },
  formattedParagraphInput: {
    minHeight: 24,
    lineHeight: LIST_LINE_HEIGHT,
    paddingTop: 0,
    paddingBottom: 2,
  },
  compactParagraph: { minHeight: 28 },
  structuralTailParagraph: { minHeight: 32, textAlignVertical: 'top' },
  listMarker: {
    minWidth: 16,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: LIST_LINE_HEIGHT,
    textAlign: 'right',
    flexShrink: 0,
  },
  numberedMarker: {
    minWidth: 28,
    paddingRight: 2,
  },
  checkBox: {
    width: LIST_CHECK_SIZE,
    height: LIST_CHECK_SIZE,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxHitArea: {
    width: 28,
    height: LIST_CHECK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
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
  imagePreview: { width: '100%' },
  imageSizeControls: { gap: 8 },
  imageSizeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  imageSizeStepBtn: {
    width: 34,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSizeLabel: { fontSize: 12, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  imageSizePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  imageSizePresetBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageSizePresetLabel: { fontSize: 12, fontWeight: '600' },
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
