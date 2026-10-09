import {
  checklistRowsFromQuickMemoTitle,
  parseQuickMemoChecklist,
  serializeQuickMemoChecklist,
  serializeQuickMemoChecklistForSave,
  quickMemoPlainBody,
} from './quickMemoChecklist';

describe('quickMemoChecklist', () => {
  it('parses plain lines as unchecked', () => {
    const lines = parseQuickMemoChecklist('오전 독서\n오후 운동');
    expect(lines.map((l) => ({ text: l.text, checked: l.checked }))).toEqual([
      { text: '오전 독서', checked: false },
      { text: '오후 운동', checked: false },
    ]);
  });

  it('parses checkbox markers', () => {
    const lines = parseQuickMemoChecklist('[ ] 물 마시기\n[x] 스트레칭');
    expect(lines.map((l) => ({ text: l.text, checked: l.checked }))).toEqual([
      { text: '물 마시기', checked: false },
      { text: '스트레칭', checked: true },
    ]);
  });

  it('round-trips serialize', () => {
    const lines = parseQuickMemoChecklist('[x] A\n[ ] B');
    const next = serializeQuickMemoChecklist(lines);
    expect(next).toBe('[x] A\n[ ] B');
  });

  it('serializes empty lines as empty draft', () => {
    const lines = parseQuickMemoChecklist('');
    expect(serializeQuickMemoChecklist(lines)).toBe('');
  });

  it('save format drops empty lines', () => {
    const lines = parseQuickMemoChecklist('[ ] A\n[ ] \n[x] B');
    expect(serializeQuickMemoChecklistForSave(lines)).toBe('[ ] A\n[x] B');
    expect(quickMemoPlainBody(lines)).toBe('A\nB');
  });

  it('builds LA rows from title', () => {
    const rows = checklistRowsFromQuickMemoTitle('[ ] one\n[x] two\n[ ] ');
    expect(rows).toEqual([
      { id: 'row_0', text: 'one', checked: false },
      { id: 'row_1', text: 'two', checked: true },
    ]);
  });
});
