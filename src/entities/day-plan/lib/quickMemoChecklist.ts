/** 잠금화면 메모 한 줄 — 체크박스 상태 포함 */
export type QuickMemoChecklistLine = {
  id: string;
  text: string;
  checked: boolean;
};

const MARKER_RE = /^\[([ xX])\]\s?(.*)$/;

let lineIdSeq = 0;

function newLineId(): string {
  lineIdSeq += 1;
  return `qm_${Date.now().toString(36)}_${lineIdSeq.toString(36)}`;
}

/** 드래프트/블록 title → 체크리스트 줄 */
export function parseQuickMemoChecklist(draft: string): QuickMemoChecklistLine[] {
  const raw = draft.replace(/\r\n/g, '\n');
  if (raw.length === 0) {
    return [createEmptyQuickMemoLine()];
  }
  return raw.split('\n').map((line) => {
    const match = line.match(MARKER_RE);
    if (match) {
      return {
        id: newLineId(),
        text: match[2] ?? '',
        checked: (match[1] ?? ' ').toLowerCase() === 'x',
      };
    }
    return { id: newLineId(), text: line, checked: false };
  });
}

/** 체크리스트 → 드래프트 문자열 (`[ ]` / `[x]` 마커). 내용 없으면 빈 문자열. */
export function serializeQuickMemoChecklist(lines: QuickMemoChecklistLine[]): string {
  if (lines.length === 0) return '';
  const hasContent = lines.some((line) => line.text.length > 0 || line.checked);
  if (!hasContent) return '';
  return lines.map((line) => `[${line.checked ? 'x' : ' '}] ${line.text}`).join('\n');
}

/** Live Activity·표시용 본문 (마커·빈 줄 제거) */
export function quickMemoPlainBody(lines: QuickMemoChecklistLine[]): string {
  return lines
    .map((line) => line.text.trim())
    .filter((text) => text.length > 0)
    .join('\n');
}

/** 저장·LA용 — 내용 있는 줄만 마커 포함 */
export function serializeQuickMemoChecklistForSave(lines: QuickMemoChecklistLine[]): string {
  return lines
    .filter((line) => line.text.trim().length > 0)
    .map((line) => `[${line.checked ? 'x' : ' '}] ${line.text.trim()}`)
    .join('\n');
}

export function createEmptyQuickMemoLine(): QuickMemoChecklistLine {
  return { id: newLineId(), text: '', checked: false };
}

/** 블록 title에서 LA용 체크 행만 추출 */
export function checklistRowsFromQuickMemoTitle(
  title: string,
): Array<{ id: string; text: string; checked: boolean }> {
  return parseQuickMemoChecklist(title)
    .filter((line) => line.text.trim().length > 0)
    .map((line, index) => ({
      id: `row_${index}`,
      text: line.text.trim(),
      checked: line.checked,
    }));
}
