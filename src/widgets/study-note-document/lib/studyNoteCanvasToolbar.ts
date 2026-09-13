import {
  createWorkStudyDocBlock,
  type WorkStudyDocBlock,
  type WorkStudyHeadingLevel,
} from '@entities/day-plan';

import type { StudyToolbarAction } from '../ui/StudyDocumentToolbar';

export type CanvasListKind = 'bullet' | 'numbered';

const HEADING_RE = /^(#{1,3})\s/;
const CHECKED_RE = /^(?:\[x\]|☑)\s/i;
const UNCHECKED_RE = /^(?:\[\s\]|☐)\s/;
const BULLET_RE = /^•\s/;
const NUMBERED_RE = /^\d+\.\s/;

export function canvasLineRange(text: string, cursor: number): { start: number; end: number; line: string } {
  const start = text.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
  const nl = text.indexOf('\n', cursor);
  const end = nl === -1 ? text.length : nl;
  return { start, end, line: text.slice(start, end) };
}

export function stripCanvasLinePrefix(line: string): string {
  return line
    .replace(HEADING_RE, '')
    .replace(CHECKED_RE, '')
    .replace(UNCHECKED_RE, '')
    .replace(BULLET_RE, '')
    .replace(NUMBERED_RE, '');
}

export function canvasLineHeadingLevel(line: string): WorkStudyHeadingLevel | null {
  const m = HEADING_RE.exec(line);
  if (!m) return null;
  const n = m[1]?.length;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

export function canvasLineListKind(line: string): CanvasListKind | null {
  if (BULLET_RE.test(line)) return 'bullet';
  if (NUMBERED_RE.test(line)) return 'numbered';
  return null;
}

export function canvasLinePrefixLength(line: string): number {
  const match = /^(?:#{1,3}|\[x\]|\[\s\]|☐|☑|•|\d+\.)\s/i.exec(line);
  return match?.[0].length ?? 0;
}

export function shiftCursorAfterLinePrefixChange(
  prev: string,
  next: string,
  cursor: number,
): number {
  const prevRange = canvasLineRange(prev, cursor);
  const offsetInLine = Math.max(0, cursor - prevRange.start);
  const nextRange = canvasLineRange(next, Math.min(prevRange.start, next.length));
  const delta = canvasLinePrefixLength(nextRange.line) - canvasLinePrefixLength(prevRange.line);
  const nextOffset = Math.max(canvasLinePrefixLength(nextRange.line), offsetInLine + delta);
  return Math.max(0, Math.min(next.length, nextRange.start + nextOffset));
}

function numberedValue(line: string): number {
  const match = /^(\d+)\.\s/.exec(line);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) ? value : 0;
}

function numberedPrefix(value: number): string {
  return `${Math.max(1, value)}. `;
}

function nextNumberedPrefix(line: string): string {
  return numberedPrefix(numberedValue(line) + 1);
}

function listPrefixForContinuedLine(line: string, kind: CanvasListKind): string {
  if (kind === 'bullet') return '• ';
  return nextNumberedPrefix(line);
}

function lineIndexAt(text: string, cursor: number): number {
  return text.slice(0, Math.max(0, cursor)).split('\n').length - 1;
}

function lineStartAt(lines: string[], index: number): number {
  let start = 0;
  for (let i = 0; i < index; i += 1) start += (lines[i]?.length ?? 0) + 1;
  return start;
}

export function syncCanvasNumberedLines(text: string): string {
  const lines = text.split('\n');
  let n = 0;
  let changed = false;
  const next = lines.map((line) => {
    if (!NUMBERED_RE.test(line)) {
      n = 0;
      return line;
    }
    n += 1;
    const synced = `${numberedPrefix(n)}${stripCanvasLinePrefix(line)}`;
    if (synced !== line) changed = true;
    return synced;
  });
  return changed ? next.join('\n') : text;
}

export function applyCanvasListToDraft(
  text: string,
  start: number,
  end: number,
  kind: CanvasListKind,
): { text: string; cursor: number } {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  const first = lineIndexAt(text, from);
  const last = lineIndexAt(text, to);
  const lines = text.split('\n');
  const selected = lines.slice(first, last + 1);
  const allSame = selected.length > 0 && selected.every((line) => canvasLineListKind(line) === kind);
  const nextLines = [...lines];

  if (allSame) {
    for (let i = first; i <= last; i += 1) {
      nextLines[i] = stripCanvasLinePrefix(nextLines[i] ?? '');
    }
  } else {
    let n = 1;
    if (kind === 'numbered') {
      const prev = nextLines[first - 1];
      if (prev && NUMBERED_RE.test(prev)) n = numberedValue(prev) + 1;
    }
    for (let i = first; i <= last; i += 1) {
      const body = stripCanvasLinePrefix(nextLines[i] ?? '');
      nextLines[i] = kind === 'bullet' ? `• ${body}` : `${numberedPrefix(n)}${body}`;
      n += 1;
    }
  }

  const next = syncCanvasNumberedLines(nextLines.join('\n'));
  const syncedLines = next.split('\n');
  const cursorLine = Math.max(0, Math.min(syncedLines.length - 1, lineIndexAt(text, start)));
  const prevRange = canvasLineRange(text, start);
  const bodyOffset = Math.max(0, start - prevRange.start - canvasLinePrefixLength(prevRange.line));
  const prefixLen = canvasLinePrefixLength(syncedLines[cursorLine] ?? '');
  const cursor = Math.max(0, Math.min(next.length, lineStartAt(syncedLines, cursorLine) + prefixLen + bodyOffset));
  return { text: next, cursor };
}

export type CanvasProgrammaticEcho = {
  expected: string;
  stale: string;
  until: number;
};

/** iOS가 접두어 적용 직후 보내는 되돌림만 무시한다. 새로 친 글은 통과시킨다. */
export function isCanvasProgrammaticTextEcho(
  echo: CanvasProgrammaticEcho | null,
  text: string,
  now: number,
): boolean {
  if (!echo || now >= echo.until) return false;
  if (text === echo.expected || text === echo.stale) return true;
  if (text.length < echo.expected.length && echo.expected.startsWith(text)) return true;
  if (text.length < echo.stale.length && echo.stale.startsWith(text)) return true;
  const deletedAt = findDeletedCharIndex(echo.expected, text);
  if (deletedAt == null) return false;
  const range = canvasLineRange(echo.expected, deletedAt + 1);
  return deletedAt - range.start < canvasLinePrefixLength(range.line);
}

function findDeletedCharIndex(prev: string, next: string): number | null {
  if (next.length !== prev.length - 1) return null;
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i] === next[i]) continue;
    return prev.slice(i + 1) === next.slice(i) ? i : null;
  }
  return null;
}

/** 목록 접두어 안에서 백스페이스하면 목록을 해제한다. */
export function exitCanvasListAfterBackspace(
  prev: string,
  next: string,
): { text: string; cursor: number } | null {
  const deletedAt = findDeletedCharIndex(prev, next);
  if (deletedAt == null) return null;
  const range = canvasLineRange(prev, deletedAt + 1);
  if (!canvasLineListKind(range.line)) return null;
  if (deletedAt - range.start >= canvasLinePrefixLength(range.line)) return null;
  const text = syncCanvasNumberedLines(
    `${prev.slice(0, range.start)}${stripCanvasLinePrefix(range.line)}${prev.slice(range.end)}`,
  );
  return { text, cursor: range.start };
}

function findInsertedNewline(prev: string, next: string): number | null {
  if (next.length !== prev.length + 1) return null;
  for (let i = 0; i < next.length; i += 1) {
    if (next[i] === prev[i]) continue;
    if (next[i] === '\n' && next.slice(i + 1) === prev.slice(i)) return i;
    return null;
  }
  return next.endsWith('\n') ? next.length - 1 : null;
}

/** 리스트 줄에서 엔터: 다음 항목을 이어 쓰거나, 빈 항목이면 목록을 끝낸다. */
export function continueCanvasListAfterChange(
  prev: string,
  next: string,
): { text: string; cursor: number } | null {
  const insertedAt = findInsertedNewline(prev, next);
  if (insertedAt == null) return null;
  const lineBefore = canvasLineRange(prev, insertedAt).line;
  const kind = canvasLineListKind(lineBefore);
  if (!kind) return null;

  if (stripCanvasLinePrefix(lineBefore).length === 0) {
    const range = canvasLineRange(prev, insertedAt);
    const text = syncCanvasNumberedLines(`${prev.slice(0, range.start)}${prev.slice(insertedAt)}`);
    return { text, cursor: range.start };
  }

  const prefix = listPrefixForContinuedLine(lineBefore, kind);
  const after = next.slice(insertedAt + 1);
  if (canvasLineListKind(after.split('\n')[0] ?? '')) return null;
  const text = syncCanvasNumberedLines(`${next.slice(0, insertedAt + 1)}${prefix}${after}`);
  const newLine = canvasLineRange(text, insertedAt + 1).line;
  return { text, cursor: insertedAt + 1 + canvasLinePrefixLength(newLine) };
}

function replaceLine(text: string, cursor: number, nextLine: string): string {
  const range = canvasLineRange(text, cursor);
  return `${text.slice(0, range.start)}${nextLine}${text.slice(range.end)}`;
}

function applyLinePrefix(text: string, cursor: number, prefix: string): string {
  const range = canvasLineRange(text, cursor);
  return replaceLine(text, cursor, `${prefix}${stripCanvasLinePrefix(range.line)}`);
}

function stripInlineMarks(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
}

/** 제목·목록·볼드·밑줄을 빼고 본문만 남긴다. */
export function clearCanvasLineFormat(text: string, cursor: number): string {
  const range = canvasLineRange(text, cursor);
  return replaceLine(text, cursor, stripInlineMarks(stripCanvasLinePrefix(range.line)));
}

function wrapSelection(
  text: string,
  start: number,
  end: number,
  open: string,
  close: string,
  fallbackLine: string,
): string {
  if (start === end) return fallbackLine;
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  return `${text.slice(0, from)}${open}${text.slice(from, to)}${close}${text.slice(to)}`;
}

export function applyCanvasToolbarToDraft(
  text: string,
  cursor: number,
  action: StudyToolbarAction,
  selectionEnd = cursor,
): string | null {
  const range = canvasLineRange(text, cursor);
  const body = stripCanvasLinePrefix(range.line);
  const heading = canvasLineHeadingLevel(range.line);

  switch (action) {
    case 'heading-1':
      return applyLinePrefix(text, cursor, heading === 1 ? '' : '# ');
    case 'heading-2':
      return applyLinePrefix(text, cursor, heading === 2 ? '' : '## ');
    case 'heading-3':
      return applyLinePrefix(text, cursor, heading === 3 ? '' : '### ');
    case 'body-text':
      return clearCanvasLineFormat(text, cursor);
    case 'checklist':
      return text;
    case 'bullet':
      return applyCanvasListToDraft(text, cursor, selectionEnd, 'bullet').text;
    case 'numbered':
      return applyCanvasListToDraft(text, cursor, selectionEnd, 'numbered').text;
    case 'bold':
      return wrapSelection(text, cursor, selectionEnd, '**', '**', replaceLine(text, cursor, `**${body}**`));
    case 'underline':
      return wrapSelection(text, cursor, selectionEnd, '__', '__', replaceLine(text, cursor, `__${body}__`));
    case 'table':
      return `${text}${text.endsWith('\n') || text.length === 0 ? '' : '\n'}[표]`;
    case 'image':
      return `${text}${text.endsWith('\n') || text.length === 0 ? '' : '\n'}[이미지]`;
    case 'link': {
      if (body.length === 0) return replaceLine(text, cursor, '[링크](https://)');
      return replaceLine(text, cursor, `[${body}](https://)`);
    }
    default:
      return null;
  }
}

export function canvasDraftToBlocks(text: string): WorkStudyDocBlock[] {
  return text.split('\n').map((raw) => {
    if (raw.trim() === '[표]') return createWorkStudyDocBlock('table');
    if (raw.trim() === '[이미지]' || raw.startsWith('[이미지] ')) {
      const block = createWorkStudyDocBlock('image');
      const rest = raw.replace(/^\[이미지\]\s?/, '');
      if (/^(file:\/\/|https?:\/\/|\/)/i.test(rest)) {
        block.imageUri = rest;
      } else {
        block.text = rest;
      }
      return block;
    }
    const heading = canvasLineHeadingLevel(raw);
    if (heading) {
      const block = createWorkStudyDocBlock('heading', { headingLevel: heading });
      block.text = stripCanvasLinePrefix(raw);
      return block;
    }
    if (CHECKED_RE.test(raw) || UNCHECKED_RE.test(raw)) {
      const block = createWorkStudyDocBlock('paragraph');
      block.text = stripCanvasLinePrefix(raw);
      return block;
    }
    if (BULLET_RE.test(raw)) {
      const block = createWorkStudyDocBlock('bullet');
      block.text = raw.replace(BULLET_RE, '');
      return block;
    }
    if (NUMBERED_RE.test(raw)) {
      const block = createWorkStudyDocBlock('numbered');
      block.text = raw.replace(NUMBERED_RE, '');
      return block;
    }
    const block = createWorkStudyDocBlock('paragraph');
    block.text = raw;
    return block;
  });
}

export function canvasBlocksToDraft(blocks: WorkStudyDocBlock[]): string {
  let numberedRun = 0;
  return blocks
    .map((block) => {
      if (block.kind !== 'numbered') numberedRun = 0;
      switch (block.kind) {
        case 'heading':
          return `${'#'.repeat(block.headingLevel ?? 1)} ${block.text}`;
        case 'checklist':
          return block.text;
        case 'bullet':
          return `• ${block.text}`;
        case 'numbered': {
          numberedRun += 1;
          return `${numberedRun}. ${block.text}`;
        }
        case 'table':
          return '[표]';
        case 'image':
          return '[이미지]';
        default:
          return block.text;
      }
    })
    .join('\n');
}

export function mergeCanvasImageUris(
  next: WorkStudyDocBlock[],
  prev: WorkStudyDocBlock[],
): WorkStudyDocBlock[] {
  const prevImages = prev.filter((block) => block.kind === 'image' && block.imageUri?.trim());
  let index = 0;
  return next.map((block) => {
    if (block.kind !== 'image' || block.imageUri?.trim()) return block;
    const reused = prevImages[index];
    index += 1;
    if (!reused) return block;
    return {
      ...block,
      imageUri: reused.imageUri,
      imageDisplayHeight: reused.imageDisplayHeight,
    };
  });
}
