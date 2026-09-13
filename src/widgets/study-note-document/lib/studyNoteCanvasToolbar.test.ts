import {
  applyCanvasListToDraft,
  applyCanvasToolbarToDraft,
  canvasBlocksToDraft,
  canvasDraftToBlocks,
  canvasLineListKind,
  CANVAS_LINK_ICON_GAP,
  continueCanvasListAfterChange,
  detectCanvasLinkBackspace,
  ensureCanvasLinkGaps,
  exitCanvasListAfterBackspace,
  extractCanvasLineLink,
  insertCanvasLinkText,
  isCanvasProgrammaticTextEcho,
  removeCanvasLinkSpan,
} from './studyNoteCanvasToolbar';

describe('studyNoteCanvasToolbar', () => {
  it('does not treat leftover checkbox prefixes as a list', () => {
    expect(canvasLineListKind('[ ] 장보기')).toBeNull();
    expect(canvasLineListKind('☐ 장보기')).toBeNull();
    expect(applyCanvasToolbarToDraft('장보기', 0, 'checklist')).toBe('장보기');
  });

  it('loads saved checklist blocks as plain text', () => {
    expect(
      canvasBlocksToDraft([
        {
          id: '1',
          kind: 'checklist',
          text: '장보기',
          checked: true,
        },
      ]),
    ).toBe('장보기');
  });

  it('does not save checkbox prefixes as checklist blocks', () => {
    expect(canvasDraftToBlocks('[ ] 장보기').map((block) => block.kind)).toEqual(['paragraph']);
    expect(canvasDraftToBlocks('[x] 장보기')[0]?.text).toBe('장보기');
  });

  it('toggles a bullet list on the current line', () => {
    expect(applyCanvasListToDraft('장보기', 0, 0, 'bullet')).toEqual({
      text: '• 장보기',
      cursor: 2,
    });
    expect(applyCanvasListToDraft('• 장보기', 2, 2, 'bullet')).toEqual({
      text: '장보기',
      cursor: 0,
    });
  });

  it('applies a bullet to every selected line', () => {
    expect(applyCanvasListToDraft('하나\n둘', 0, 5, 'bullet')).toEqual({
      text: '• 하나\n• 둘',
      cursor: 2,
    });
  });

  it('starts a numbered list and continues the next number', () => {
    expect(applyCanvasListToDraft('장보기', 0, 0, 'numbered')).toEqual({
      text: '1. 장보기',
      cursor: 3,
    });
    expect(continueCanvasListAfterChange('1. 장보기', '1. 장보기\n')).toEqual({
      text: '1. 장보기\n2. ',
      cursor: '1. 장보기\n2. '.length,
    });
  });

  it('numbers consecutive saved blocks from 1', () => {
    expect(
      canvasBlocksToDraft([
        { id: '1', kind: 'numbered', text: '하나' },
        { id: '2', kind: 'numbered', text: '둘' },
        { id: '3', kind: 'paragraph', text: '쉬어가기' },
        { id: '4', kind: 'numbered', text: '다시' },
      ]),
    ).toBe('1. 하나\n2. 둘\n쉬어가기\n1. 다시');
  });

  it('exits an empty list item on enter', () => {
    expect(continueCanvasListAfterChange('• 장보기\n• ', '• 장보기\n• \n')).toEqual({
      text: '• 장보기\n',
      cursor: '• 장보기\n'.length,
    });
  });

  it('removes the list prefix when backspacing inside it', () => {
    expect(exitCanvasListAfterBackspace('• 장보기', '•장보기')).toEqual({
      text: '장보기',
      cursor: 0,
    });
    expect(exitCanvasListAfterBackspace('1. 장보기', '1.장보기')).toEqual({
      text: '장보기',
      cursor: 0,
    });
  });

  it('continues a bullet list on enter', () => {
    expect(continueCanvasListAfterChange('• 장보기', '• 장보기\n')).toEqual({
      text: '• 장보기\n• ',
      cursor: '• 장보기\n• '.length,
    });
  });

  it('inserts the url at the cursor and asks to remove it as a unit', () => {
    expect(insertCanvasLinkText('장보기', 3, 3, 'https://www.naver.com')).toEqual({
      text: `장보기 https://www.naver.com${CANVAS_LINK_ICON_GAP}`,
      cursor: `장보기 https://www.naver.com${CANVAS_LINK_ICON_GAP}`.length,
    });
    expect(insertCanvasLinkText('', 0, 0, 'https://www.naver.com')).toEqual({
      text: `https://www.naver.com${CANVAS_LINK_ICON_GAP}`,
      cursor: `https://www.naver.com${CANVAS_LINK_ICON_GAP}`.length,
    });
    expect(extractCanvasLineLink('https://www.naver.com')).toBe('https://www.naver.com');
    expect(ensureCanvasLinkGaps('https://www.naver.com')).toBe(
      `https://www.naver.com${CANVAS_LINK_ICON_GAP}`,
    );
    const inserted = insertCanvasLinkText('', 0, 0, 'https://www.naver.com');
    const afterBackspace = inserted.text.slice(0, -1);
    expect(detectCanvasLinkBackspace(inserted.text, afterBackspace)?.url).toBe('https://www.naver.com');
    expect(removeCanvasLinkSpan(inserted.text, detectCanvasLinkBackspace(inserted.text, afterBackspace)!)).toEqual({
      text: '',
      cursor: 0,
    });
    expect(canvasDraftToBlocks(`장보기 https://www.naver.com${CANVAS_LINK_ICON_GAP}`)[0]?.marks?.link).toBe(
      'https://www.naver.com',
    );
  });

  it('ignores only native rollback after a list prefix is applied', () => {
    const echo = { expected: '• ', stale: '', until: 1_000 };
    expect(isCanvasProgrammaticTextEcho(echo, '• ', 500)).toBe(true);
    expect(isCanvasProgrammaticTextEcho(echo, '', 500)).toBe(true);
    expect(isCanvasProgrammaticTextEcho(echo, '•', 500)).toBe(true);
    expect(isCanvasProgrammaticTextEcho(echo, '• 가', 500)).toBe(false);
    expect(isCanvasProgrammaticTextEcho(echo, '• ㄱ', 500)).toBe(false);
  });
});
