import {
  createHorizonBlock,
  estimateHorizonDocumentProgress,
  getNumberedBlockOrder,
  horizonDocumentHasContent,
  horizonDocumentToPlainText,
  parseHorizonGoalDocument,
} from './horizonGoalBlocks';

describe('horizonGoalBlocks', () => {
  it('parses legacy string into blocks', () => {
    const doc = parseHorizonGoalDocument('첫 줄\n- [x] 완료');
    expect(doc.blocks.length).toBeGreaterThanOrEqual(2);
    expect(doc.blocks.some((b) => b.type === 'checklist' && b.checked)).toBe(true);
  });

  it('parses v2 document', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [createHorizonBlock('heading2', { text: '섹션' })],
    });
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].text).toBe('섹션');
  });

  it('parses numbered list lines from legacy string', () => {
    const doc = parseHorizonGoalDocument('1. 첫 항목\n2. 둘째 항목');
    expect(doc.blocks.filter((b) => b.type === 'numbered')).toHaveLength(2);
    expect(doc.blocks[0].text).toBe('첫 항목');
  });

  it('assigns sequential order for consecutive numbered blocks', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [
        createHorizonBlock('paragraph', { text: '구분' }),
        createHorizonBlock('numbered', { text: 'a' }),
        createHorizonBlock('numbered', { text: 'b' }),
        createHorizonBlock('paragraph', { text: '끊김' }),
        createHorizonBlock('numbered', { text: 'c' }),
      ],
    });
    expect(getNumberedBlockOrder(doc.blocks, 1)).toBe(1);
    expect(getNumberedBlockOrder(doc.blocks, 2)).toBe(2);
    expect(getNumberedBlockOrder(doc.blocks, 4)).toBe(1);
    const plain = horizonDocumentToPlainText(doc);
    expect(plain).toContain('1. a');
    expect(plain).toContain('2. b');
    expect(plain).toContain('1. c');
  });

  it('progress from checklist completion', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [
        createHorizonBlock('checklist', { text: 'a', checked: true }),
        createHorizonBlock('checklist', { text: 'b', checked: false }),
      ],
    });
    expect(estimateHorizonDocumentProgress(doc)).toBe(50);
  });

  it('detects empty document', () => {
    expect(horizonDocumentHasContent(parseHorizonGoalDocument(''))).toBe(false);
    expect(
      horizonDocumentHasContent(
        parseHorizonGoalDocument({
          version: 2,
          blocks: [createHorizonBlock('paragraph', { text: '   ' })],
        }),
      ),
    ).toBe(false);
  });

  it('serializes bullet and checklist blocks', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [
        createHorizonBlock('bullet', { text: '항목' }),
        createHorizonBlock('checklist', { text: '할 일', checked: false }),
      ],
    });
    expect(horizonDocumentToPlainText(doc)).toBe('• 항목\n[ ] 할 일');
  });

  it('estimates line-based progress when no checklist', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [
        createHorizonBlock('paragraph', { text: 'a' }),
        createHorizonBlock('paragraph', { text: 'b' }),
      ],
    });
    expect(estimateHorizonDocumentProgress(doc)).toBe(22);
  });
});
