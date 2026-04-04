const NUMBERED_LINE = /^\s*(\d+)\.\s*(.+?)\s*$/;

/**
 * 우선순위 모드 저장 시 `1. 제목A\n2. 제목B` 형태로 합쳐진 블록 제목에서
 * 할 일 제목만 순서대로 추출합니다.
 */
export function parseNumberedFlowLines(title: string): string[] {
  const out: string[] = [];
  for (const line of (title ?? '').split(/\r?\n/)) {
    const m = line.match(NUMBERED_LINE);
    if (m) {
      const body = (m[2] ?? '').trim();
      if (body.length > 0) out.push(body);
    }
  }
  return out;
}

/** 우선순위 모드 합본 블록(할 일이 2개 이상). */
export function isPriorityCompoundBlockTitle(title: string): boolean {
  return parseNumberedFlowLines(title).length >= 2;
}
