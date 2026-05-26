export type HorizonBlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'paragraph';

export type HorizonGoalBlock = {
  id: string;
  type: HorizonBlockType;
  text: string;
  checked?: boolean;
  bold?: boolean;
  underline?: boolean;
};

export type HorizonGoalDocument = {
  version: 2;
  blocks: HorizonGoalBlock[];
};

export const EMPTY_HORIZON_DOCUMENT: HorizonGoalDocument = {
  version: 2,
  blocks: [],
};

export const HORIZON_BLOCK_TYPE_LABELS: Record<HorizonBlockType, string> = {
  heading1: '제목1',
  heading2: '제목2',
  heading3: '제목3',
  bullet: '리스트',
  numbered: '번호 리스트',
  checklist: '체크리스트',
  paragraph: '본문',
};

/** 연속된 numbered 블록 기준 1부터 표시 번호 */
export function getNumberedBlockOrder(blocks: HorizonGoalBlock[], index: number): number | null {
  if (index < 0 || index >= blocks.length || blocks[index].type !== 'numbered') {
    return null;
  }
  let order = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type !== 'numbered') break;
    order += 1;
  }
  return order;
}

export function createHorizonBlockId(): string {
  return `hb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createHorizonBlock(
  type: HorizonBlockType,
  partial?: Partial<Pick<HorizonGoalBlock, 'text' | 'checked' | 'bold' | 'underline'>>,
): HorizonGoalBlock {
  return {
    id: createHorizonBlockId(),
    type,
    text: partial?.text ?? '',
    checked: type === 'checklist' ? Boolean(partial?.checked) : undefined,
    bold: partial?.bold,
    underline: partial?.underline,
  };
}

function normalizeBlock(raw: unknown): HorizonGoalBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (
    type !== 'heading1' &&
    type !== 'heading2' &&
    type !== 'heading3' &&
    type !== 'bullet' &&
    type !== 'numbered' &&
    type !== 'checklist' &&
    type !== 'paragraph'
  ) {
    return null;
  }
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : createHorizonBlockId();
  return {
    id,
    type,
    text: typeof o.text === 'string' ? o.text : '',
    checked: type === 'checklist' ? Boolean(o.checked) : undefined,
    bold: Boolean(o.bold),
    underline: Boolean(o.underline),
  };
}

function migrateLegacyDetail(raw: Record<string, unknown>): HorizonGoalBlock[] {
  const blocks: HorizonGoalBlock[] = [];
  const mainTitle = typeof raw.mainTitle === 'string' ? raw.mainTitle.trim() : '';
  const subTitle = typeof raw.subTitle === 'string' ? raw.subTitle.trim() : '';
  const body = typeof raw.body === 'string' ? raw.body : '';

  if (mainTitle) blocks.push(createHorizonBlock('heading1', { text: mainTitle }));
  if (subTitle) blocks.push(createHorizonBlock('heading3', { text: subTitle }));

  body.split('\n').forEach((line) => {
    const t = line.trim();
    if (!t) return;
    const m1 = /^(-|\*)\s*\[(x| )\]\s*(.+)$/i.exec(t);
    if (m1) {
      blocks.push(
        createHorizonBlock('checklist', {
          text: m1[3].trim(),
          checked: /x/i.test(m1[2]),
        }),
      );
      return;
    }
    const m2 = /^\[(x| )\]\s*(.+)$/i.exec(t);
    if (m2) {
      blocks.push(
        createHorizonBlock('checklist', {
          text: m2[2].trim(),
          checked: /x/i.test(m2[1]),
        }),
      );
      return;
    }
    if (/^\d+\.\s+/.test(t)) {
      blocks.push(createHorizonBlock('numbered', { text: t.replace(/^\d+\.\s+/, '') }));
      return;
    }
    if (/^[-*•]\s+/.test(t)) {
      blocks.push(createHorizonBlock('bullet', { text: t.replace(/^[-*•]\s+/, '') }));
      return;
    }
    if (/^###\s+/.test(t)) {
      blocks.push(createHorizonBlock('heading3', { text: t.replace(/^###\s+/, '') }));
      return;
    }
    if (/^##\s+/.test(t)) {
      blocks.push(createHorizonBlock('heading2', { text: t.replace(/^##\s+/, '') }));
      return;
    }
    if (/^#\s+/.test(t)) {
      blocks.push(createHorizonBlock('heading1', { text: t.replace(/^#\s+/, '') }));
      return;
    }
    blocks.push(createHorizonBlock('paragraph', { text: t }));
  });

  return blocks;
}

export function parseHorizonGoalDocument(raw: unknown): HorizonGoalDocument {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { ...EMPTY_HORIZON_DOCUMENT };
    return { version: 2, blocks: migrateLegacyDetail({ body: trimmed }) };
  }
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_HORIZON_DOCUMENT };
  }
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.blocks)) {
    const blocks = o.blocks.map(normalizeBlock).filter((b): b is HorizonGoalBlock => b != null);
    return { version: 2, blocks };
  }
  if ('mainTitle' in o || 'subTitle' in o || 'body' in o) {
    return { version: 2, blocks: migrateLegacyDetail(o) };
  }
  return { ...EMPTY_HORIZON_DOCUMENT };
}

export function horizonDocumentHasContent(doc: HorizonGoalDocument): boolean {
  return doc.blocks.some((b) => b.text.trim().length > 0);
}

export function horizonDocumentToPlainText(doc: HorizonGoalDocument): string {
  return doc.blocks
    .map((b) => {
      if (b.type === 'checklist') {
        return `${b.checked ? '[x]' : '[ ]'} ${b.text}`;
      }
      if (b.type === 'bullet') return `• ${b.text}`;
      if (b.type === 'numbered') {
        const order = getNumberedBlockOrder(doc.blocks, doc.blocks.indexOf(b));
        return `${order ?? 1}. ${b.text}`;
      }
      return b.text;
    })
    .filter((s) => s.trim().length > 0)
    .join('\n');
}

export function estimateHorizonDocumentProgress(doc: HorizonGoalDocument): number {
  const checklist = doc.blocks.filter((b) => b.type === 'checklist' && b.text.trim());
  if (checklist.length > 0) {
    const done = checklist.filter((b) => b.checked).length;
    return Math.round((done / checklist.length) * 100);
  }
  const lines = doc.blocks.filter((b) => b.text.trim());
  if (lines.length === 0) return 0;
  return Math.min(40, 10 + lines.length * 6);
}
