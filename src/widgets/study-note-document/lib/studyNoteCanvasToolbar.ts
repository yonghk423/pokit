import {
  createWorkStudyDocBlock,
  type WorkStudyDocBlock,
  type WorkStudyHeadingLevel,
} from '@entities/day-plan';

import type { StudyToolbarAction } from '../ui/StudyDocumentToolbar';

export type CanvasListKind = 'checklist' | 'bullet' | 'numbered';

const HEADING_RE = /^(#{1,3})\s/;
const CHECKED_RE = /^\[x\]\s/i;
const UNCHECKED_RE = /^\[\s\]\s/;
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
  if (CHECKED_RE.test(line) || UNCHECKED_RE.test(line)) return 'checklist';
  if (BULLET_RE.test(line)) return 'bullet';
  if (NUMBERED_RE.test(line)) return 'numbered';
  return null;
}

function replaceLine(text: string, cursor: number, nextLine: string): string {
  const range = canvasLineRange(text, cursor);
  return `${text.slice(0, range.start)}${nextLine}${text.slice(range.end)}`;
}

function applyLinePrefix(text: string, cursor: number, prefix: string): string {
  const range = canvasLineRange(text, cursor);
  return replaceLine(text, cursor, `${prefix}${stripCanvasLinePrefix(range.line)}`);
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
      return replaceLine(text, cursor, body);
    case 'checklist':
      return applyLinePrefix(text, cursor, canvasLineListKind(range.line) === 'checklist' ? '' : '[ ] ');
    case 'bullet':
      return applyLinePrefix(text, cursor, canvasLineListKind(range.line) === 'bullet' ? '' : '• ');
    case 'numbered':
      return applyLinePrefix(text, cursor, canvasLineListKind(range.line) === 'numbered' ? '' : '1. ');
    case 'insert-line-top':
      return `${text.slice(0, range.start)}\n${text.slice(range.start)}`;
    case 'insert-line-bottom':
      return `${text.slice(0, range.end)}\n${text.slice(range.end)}`;
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
    if (CHECKED_RE.test(raw)) {
      const block = createWorkStudyDocBlock('checklist');
      block.checked = true;
      block.text = raw.replace(CHECKED_RE, '');
      return block;
    }
    if (UNCHECKED_RE.test(raw)) {
      const block = createWorkStudyDocBlock('checklist');
      block.text = raw.replace(UNCHECKED_RE, '');
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
  return blocks
    .map((block) => {
      switch (block.kind) {
        case 'heading':
          return `${'#'.repeat(block.headingLevel ?? 1)} ${block.text}`;
        case 'checklist':
          return `${block.checked ? '[x]' : '[ ]'} ${block.text}`;
        case 'bullet':
          return `• ${block.text}`;
        case 'numbered':
          return `1. ${block.text}`;
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
