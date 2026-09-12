import { getLocalDateKey } from './localDateKey';

/** 스터디 루틴 — 블록 기반 문서 (헤딩·체크리스트·목록·표·이미지) */

export type WorkStudyBlockKind =
  | 'heading'
  | 'checklist'
  | 'bullet'
  | 'numbered'
  | 'paragraph'
  | 'table'
  | 'image';

export type WorkStudyHeadingLevel = 1 | 2 | 3;

export const WORK_STUDY_TYPE_SIZE_IDS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type WorkStudyTypeSizeId = (typeof WORK_STUDY_TYPE_SIZE_IDS)[number];

export type WorkStudyBlockMarks = {
  bold?: boolean;
  underline?: boolean;
  link?: string;
  color?: string;
  /** 레거시 노트 전용 글씨 크기. 표시는 앱 설정 글씨 크기를 따른다 */
  typeSize?: WorkStudyTypeSizeId;
};

/** 스터디 노트 본문 글자색 프리셋 */
export const WORK_STUDY_TEXT_COLORS = [
  { label: '빨강', value: '#C62828' },
  { label: '주황', value: '#E65100' },
  { label: '갈색', value: '#8B5A2B' },
  { label: '초록', value: '#2E7D32' },
  { label: '파랑', value: '#1565C0' },
  { label: '보라', value: '#6A1B9A' },
  { label: '회색', value: '#616161' },
] as const;

export type WorkStudyDocBlock = {
  id: string;
  kind: WorkStudyBlockKind;
  text: string;
  /** 헤딩 보조 라벨 (예: 한글) */
  subtitle?: string;
  checked?: boolean;
  headingLevel?: WorkStudyHeadingLevel;
  /** 헤딩 밴드 색 순환 (0–4) */
  accentIndex?: number;
  marks?: WorkStudyBlockMarks;
  tableRows?: string[][];
  imageUri?: string;
  /** 이미지 블록 표시 높이(px) — 미설정 시 기본값 */
  imageDisplayHeight?: number;
};

export type WorkStudyNotePage = {
  id: string;
  /** 사용자 지정 제목 — 비어 있으면 `createdDateKey` 기준 날짜 제목 */
  title: string;
  /** 메모 생성일 (YYYY-MM-DD) */
  createdDateKey?: string;
  blocks: WorkStudyDocBlock[];
};

export type WorkStudyDocument = {
  pages: WorkStudyNotePage[];
  activePageId: string;
};

export const WORK_STUDY_HEADING_ACCENTS = [
  '#436086',
  '#356668',
  '#8b5a2b',
  '#52525b',
  '#2B3A67',
] as const;

const MAX_BLOCKS = 200;
const MAX_PAGES = 30;
const MAX_PAGE_TITLE = 40;
const MAX_TEXT = 500;
const MAX_SUBTITLE = 80;
export const WORK_STUDY_TABLE_MAX_ROWS = 100;
export const WORK_STUDY_TABLE_MAX_COLS = 5;
export const WORK_STUDY_TABLE_DEFAULT_ROWS = 2;
export const WORK_STUDY_TABLE_DEFAULT_COLS = 2;
const MAX_IMAGE_URI = 500;

export const WORK_STUDY_IMAGE_MIN_DISPLAY_HEIGHT = 120;
export const WORK_STUDY_IMAGE_MAX_DISPLAY_HEIGHT = 560;
export const WORK_STUDY_IMAGE_DEFAULT_DISPLAY_HEIGHT = 280;
export const WORK_STUDY_IMAGE_DISPLAY_HEIGHT_STEP = 48;

export const WORK_STUDY_IMAGE_DISPLAY_HEIGHT_PRESETS = [
  { label: '작게', value: 160 },
  { label: '보통', value: 280 },
  { label: '크게', value: 400 },
  { label: '최대', value: 520 },
] as const;

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

function newBlockId(): string {
  return `wsb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeHeadingLevel(raw: unknown): WorkStudyHeadingLevel {
  const n = Number(raw);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

function normalizeTextColor(raw: unknown): string | undefined {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return undefined;
  return value.toUpperCase();
}

function normalizeTypeSize(raw: unknown): WorkStudyTypeSizeId | undefined {
  return WORK_STUDY_TYPE_SIZE_IDS.includes(raw as WorkStudyTypeSizeId)
    ? (raw as WorkStudyTypeSizeId)
    : undefined;
}

function normalizeMarks(raw: unknown): WorkStudyBlockMarks | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const bold = o.bold === true;
  const underline = o.underline === true || o.highlight === true;
  const link = clampStr(o.link, 500);
  const color = normalizeTextColor(o.color);
  const typeSize = normalizeTypeSize(o.typeSize);
  if (!bold && !underline && !link && !color && !typeSize) return undefined;
  return {
    bold: bold || undefined,
    underline: underline || undefined,
    link: link || undefined,
    color: color || undefined,
    typeSize: typeSize || undefined,
  };
}

export function createEmptyTableRows(
  rowCount = WORK_STUDY_TABLE_DEFAULT_ROWS,
  colCount = WORK_STUDY_TABLE_DEFAULT_COLS,
): string[][] {
  const rows = Math.min(WORK_STUDY_TABLE_MAX_ROWS, Math.max(1, rowCount));
  const cols = Math.min(WORK_STUDY_TABLE_MAX_COLS, Math.max(1, colCount));
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

function normalizeTableRows(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createEmptyTableRows();
  }
  const parsed = raw.slice(0, WORK_STUDY_TABLE_MAX_ROWS).map((row) =>
    Array.isArray(row)
      ? row.slice(0, WORK_STUDY_TABLE_MAX_COLS).map((cell) => clampStr(cell, 120))
      : [],
  );
  const rowCount = Math.min(
    WORK_STUDY_TABLE_MAX_ROWS,
    Math.max(WORK_STUDY_TABLE_DEFAULT_ROWS, parsed.length),
  );
  const colCount = Math.min(
    WORK_STUDY_TABLE_MAX_COLS,
    Math.max(WORK_STUDY_TABLE_DEFAULT_COLS, ...parsed.map((row) => row.length), 1),
  );
  return Array.from({ length: rowCount }, (_, rowIdx) => {
    const row = parsed[rowIdx] ?? [];
    const padded = row.slice(0, colCount);
    while (padded.length < colCount) padded.push('');
    return padded;
  });
}

function normalizeImageDisplayHeight(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(
    WORK_STUDY_IMAGE_MIN_DISPLAY_HEIGHT,
    Math.min(WORK_STUDY_IMAGE_MAX_DISPLAY_HEIGHT, Math.round(n)),
  );
}

export function clampWorkStudyImageDisplayHeight(height: number): number {
  return normalizeImageDisplayHeight(height) ?? WORK_STUDY_IMAGE_DEFAULT_DISPLAY_HEIGHT;
}

export function resolveWorkStudyImageDisplayHeight(
  block: Pick<WorkStudyDocBlock, 'imageDisplayHeight'>,
): number {
  return block.imageDisplayHeight ?? WORK_STUDY_IMAGE_DEFAULT_DISPLAY_HEIGHT;
}

export function stepWorkStudyImageDisplayHeight(current: number, delta: number): number {
  return clampWorkStudyImageDisplayHeight(current + delta * WORK_STUDY_IMAGE_DISPLAY_HEIGHT_STEP);
}

function normalizeBlockKind(raw: unknown): WorkStudyBlockKind {
  switch (raw) {
    case 'heading':
    case 'checklist':
    case 'bullet':
    case 'numbered':
    case 'paragraph':
    case 'table':
    case 'image':
      return raw;
    default:
      return 'paragraph';
  }
}

export function normalizeWorkStudyDocBlock(raw: unknown): WorkStudyDocBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kind = normalizeBlockKind(o.kind);
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newBlockId();
  const text = clampStr(o.text, MAX_TEXT);
  const subtitle = clampStr(o.subtitle, MAX_SUBTITLE);

  if (kind === 'table') {
    return { id, kind, text: '', tableRows: normalizeTableRows(o.tableRows) };
  }

  if (kind === 'image') {
    const imageUri = clampStr(o.imageUri, MAX_IMAGE_URI);
    const imageDisplayHeight = normalizeImageDisplayHeight(o.imageDisplayHeight);
    return {
      id,
      kind,
      text: clampStr(o.text, MAX_TEXT),
      imageUri: imageUri || undefined,
      imageDisplayHeight,
    };
  }

  if (kind === 'heading') {
    if (!text && !subtitle) return null;
    const accentRaw = Number(o.accentIndex);
    const accentIndex = Number.isFinite(accentRaw)
      ? Math.max(0, Math.min(WORK_STUDY_HEADING_ACCENTS.length - 1, Math.floor(accentRaw)))
      : 0;
    return {
      id,
      kind,
      text,
      subtitle: subtitle || undefined,
      headingLevel: normalizeHeadingLevel(o.headingLevel),
      accentIndex,
      marks: normalizeMarks(o.marks),
    };
  }

  if (!text && kind !== 'checklist' && kind !== 'bullet' && kind !== 'numbered') {
    return kind === 'paragraph'
      ? { id, kind, text: '', marks: normalizeMarks(o.marks) }
      : null;
  }

  return {
    id,
    kind,
    text,
    checked: kind === 'checklist' ? o.checked === true : undefined,
    marks: normalizeMarks(o.marks),
  };
}

function newPageId(): string {
  return `wsp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeBlocks(raw: unknown): WorkStudyDocBlock[] {
  const blocksRaw = Array.isArray(raw) ? raw : [];
  return blocksRaw
    .map(normalizeWorkStudyDocBlock)
    .filter((b): b is WorkStudyDocBlock => b != null)
    .slice(0, MAX_BLOCKS);
}

function normalizeCreatedDateKey(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : getLocalDateKey();
}

export function isLegacyAutoWorkStudyNoteTitle(title: string): boolean {
  return /^메모(\s*\d+)?$/.test(title.trim());
}

/** 예: 2026년 7월 6일 · 2 */
export function formatWorkStudyNoteTitleFromDateKey(dateKey: string, suffix?: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const base = `${parseInt(m[1]!, 10)}년 ${parseInt(m[2]!, 10)}월 ${parseInt(m[3]!, 10)}일`;
  return suffix != null && suffix > 1 ? `${base} · ${suffix}` : base;
}

function resolveWorkStudyNoteSameDayAutoOrder(
  page: WorkStudyNotePage,
  pages: readonly WorkStudyNotePage[],
): number {
  const dateKey = normalizeCreatedDateKey(page.createdDateKey);
  const pageIndex = pages.findIndex((p) => p.id === page.id);
  if (pageIndex < 0) return 1;
  return pages
    .slice(0, pageIndex + 1)
    .filter((p) => {
      const dk = normalizeCreatedDateKey(p.createdDateKey);
      const t = p.title.trim();
      return dk === dateKey && (!t || isLegacyAutoWorkStudyNoteTitle(t));
    }).length;
}

/** 저장된 사용자 제목이 없을 때 쓰는 날짜 기반 자동 제목 */
export function resolveWorkStudyNotePageAutoTitle(
  page: WorkStudyNotePage,
  pages: readonly WorkStudyNotePage[],
): string {
  const dateKey = normalizeCreatedDateKey(page.createdDateKey);
  const sameDayOrder = resolveWorkStudyNoteSameDayAutoOrder(page, pages);
  return formatWorkStudyNoteTitleFromDateKey(
    dateKey,
    sameDayOrder > 1 ? sameDayOrder : undefined,
  );
}

/** 편집 결과 저장 — 비었거나 자동 날짜 제목과 같으면 빈 문자열(자동 제목 복원) */
export function persistWorkStudyNotePageTitle(edited: string, autoFallback: string): string {
  const t = edited.trim();
  const fb = autoFallback.trim();
  if (t.length === 0 || t === fb) return '';
  return t.length > MAX_PAGE_TITLE ? t.slice(0, MAX_PAGE_TITLE) : t;
}

export function updateWorkStudyNotePageTitle(
  doc: WorkStudyDocument,
  pageId: string,
  title: string,
): WorkStudyDocument {
  return {
    ...doc,
    pages: doc.pages.map((page) => (page.id === pageId ? { ...page, title } : page)),
  };
}

export function resolveWorkStudyNotePageLabel(
  page: WorkStudyNotePage,
  pages: readonly WorkStudyNotePage[],
): string {
  const custom = page.title.trim();
  if (custom && !isLegacyAutoWorkStudyNoteTitle(custom)) return custom;
  return resolveWorkStudyNotePageAutoTitle(page, pages);
}

function normalizeWorkStudyNotePage(raw: unknown): WorkStudyNotePage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newPageId();
  let title = clampStr(o.title, MAX_PAGE_TITLE);
  if (isLegacyAutoWorkStudyNoteTitle(title)) title = '';
  const createdDateKey = normalizeCreatedDateKey(o.createdDateKey);
  const blocks = normalizeBlocks(o.blocks);
  return { id, title, createdDateKey, blocks };
}

export function createWorkStudyNotePage(input?: {
  title?: string;
  blocks?: WorkStudyDocBlock[];
  createdDateKey?: string;
}): WorkStudyNotePage {
  return {
    id: newPageId(),
    title: clampStr(input?.title, MAX_PAGE_TITLE),
    createdDateKey: normalizeCreatedDateKey(input?.createdDateKey),
    blocks: input?.blocks ?? [],
  };
}

export function getWorkStudyActivePage(doc: WorkStudyDocument): WorkStudyNotePage | null {
  if (doc.pages.length === 0) return null;
  return doc.pages.find((page) => page.id === doc.activePageId) ?? doc.pages[0] ?? null;
}

export function workStudyDocumentIsEmpty(doc: WorkStudyDocument): boolean {
  return doc.pages.length === 0 || doc.pages.every((page) => page.blocks.length === 0);
}

export function setWorkStudyActivePageBlocks(
  doc: WorkStudyDocument,
  blocks: WorkStudyDocBlock[],
): WorkStudyDocument {
  const active = getWorkStudyActivePage(doc);
  if (!active) return doc;
  return {
    ...doc,
    pages: doc.pages.map((page) =>
      page.id === active.id ? { ...page, blocks: blocks.slice(0, MAX_BLOCKS) } : page,
    ),
  };
}

export function normalizeWorkStudyDocument(raw: unknown): WorkStudyDocument {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  if (Array.isArray(o.pages)) {
    const pages = o.pages
      .map((page) => normalizeWorkStudyNotePage(page))
      .filter((page): page is WorkStudyNotePage => page != null)
      .slice(0, MAX_PAGES);
    const activeRaw = typeof o.activePageId === 'string' ? o.activePageId.trim() : '';
    const activePageId =
      pages.find((page) => page.id === activeRaw)?.id ?? pages[0]?.id ?? '';
    return { pages, activePageId };
  }

  const legacyBlocks = normalizeBlocks(o.blocks);
  if (legacyBlocks.length === 0) {
    return { pages: [], activePageId: '' };
  }
  const page = createWorkStudyNotePage({ blocks: legacyBlocks });
  return { pages: [page], activePageId: page.id };
}

export function getInitialWorkStudyDocument(): WorkStudyDocument {
  return { pages: [], activePageId: '' };
}

/** legacy focusMemo / tasks → 체크리스트 블록 */
export function migrateLegacyWorkContentToDocument(input: {
  focusMemo?: string;
  tasks?: { text: string; done: boolean }[];
}): WorkStudyDocument {
  const blocks: WorkStudyDocBlock[] = [];
  if (input.tasks?.length) {
    input.tasks.forEach((task) => {
      const text = task.text.trim();
      if (!text) return;
      blocks.push({
        id: newBlockId(),
        kind: 'checklist',
        text,
        checked: task.done,
      });
    });
  }
  const memo = (input.focusMemo ?? '').trim();
  if (memo) {
    memo.split('\n').forEach((line) => {
      const text = line.trim();
      if (!text) return;
      blocks.push({
        id: newBlockId(),
        kind: 'checklist',
        text,
        checked: false,
      });
    });
  }
  if (blocks.length === 0) {
    return { pages: [], activePageId: '' };
  }
  const page = createWorkStudyNotePage({ blocks });
  return { pages: [page], activePageId: page.id };
}

export function createWorkStudyDocBlock(
  kind: WorkStudyBlockKind,
  options?: {
    headingLevel?: WorkStudyHeadingLevel;
    accentIndex?: number;
    tableRows?: string[][];
  },
): WorkStudyDocBlock {
  const id = newBlockId();
  if (kind === 'heading') {
    return {
      id,
      kind,
      text: '',
      subtitle: '',
      headingLevel: options?.headingLevel ?? 1,
      accentIndex: options?.accentIndex ?? 0,
    };
  }
  if (kind === 'table') {
    return {
      id,
      kind,
      text: '',
      tableRows: options?.tableRows ?? createEmptyTableRows(),
    };
  }
  if (kind === 'image') {
    return { id, kind, text: '', imageUri: '' };
  }
  return { id, kind, text: '', checked: kind === 'checklist' ? false : undefined };
}

export function workStudyPageBlocksToPlainText(blocks: WorkStudyDocBlock[]): string {
  const lines: string[] = [];
  let listIndex = 0;
  blocks.forEach((block) => {
    switch (block.kind) {
      case 'heading': {
        const primary = block.text.trim();
        const secondary = block.subtitle?.trim();
        if (primary || secondary) {
          lines.push([primary, secondary].filter(Boolean).join(' · '));
        }
        listIndex = 0;
        break;
      }
      case 'checklist':
        lines.push(`${block.checked ? '[x]' : '[ ]'} ${block.text.trim()}`);
        break;
      case 'bullet':
        lines.push(`• ${block.text.trim()}`);
        break;
      case 'numbered':
        listIndex += 1;
        lines.push(`${listIndex}. ${block.text.trim()}`);
        break;
      case 'paragraph':
        if (block.text.trim()) lines.push(block.text.trim());
        listIndex = 0;
        break;
      case 'table': {
        const tableLines =
          block.tableRows
            ?.map((row) => row.map((cell) => cell.trim()).join(' | ').trim())
            .filter((line) => line.length > 0) ?? [];
        if (tableLines.length > 0) lines.push(...tableLines);
        listIndex = 0;
        break;
      }
      case 'image': {
        const caption = block.text.trim();
        if (caption) lines.push(`[이미지] ${caption}`);
        else if (block.imageUri?.trim()) lines.push('[이미지]');
        listIndex = 0;
        break;
      }
      default:
        break;
    }
  });
  return lines.join('\n').trim();
}

export function formatWorkStudyNoteDateLabel(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  return `${parseInt(m[1]!, 10)}. ${parseInt(m[2]!, 10)}. ${parseInt(m[3]!, 10)}.`;
}

export function resolveWorkStudyNotePagePreview(page: WorkStudyNotePage): string {
  for (const block of page.blocks) {
    if (block.kind === 'image') {
      const uri = block.imageUri?.trim();
      if (uri) return block.text.trim() || uri;
      continue;
    }
    if (block.kind === 'table') {
      const cell = block.tableRows?.flat().find((v) => v.trim().length > 0)?.trim();
      if (cell) return cell;
      continue;
    }
    const text = block.text.trim();
    if (text) return text;
  }
  return '';
}

export function workStudyDocumentToPlainText(doc: WorkStudyDocument): string {
  if (doc.pages.length === 0) return '';
  return doc.pages
    .map((page) => {
      const title = resolveWorkStudyNotePageLabel(page, doc.pages);
      const body = workStudyPageBlocksToPlainText(page.blocks);
      if (!body) return title;
      return `${title}\n${body}`;
    })
    .filter((section) => section.trim().length > 0)
    .join('\n\n')
    .trim();
}
