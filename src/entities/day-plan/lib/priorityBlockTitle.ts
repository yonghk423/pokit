import { resolveCategoryKeyFromLabel } from './dayPlanRuntimeTime';

const NUMBERED_LINE = /^\s*(\d+)\.\s*(.+?)\s*$/;

/**
 * 우선순위·빠른 메모 블록 제목에서 줄 단위 항목을 추출합니다.
 * - 예전: `1. 제목A\n2. 제목B` (번호 접두어)
 * - 현재: `제목A\n제목B` (줄바꿈만)
 * 번호 형식이면 본문만, 아니면 줄 전체를 그대로 씁니다.
 */
export function parseNumberedFlowLines(title: string): string[] {
  const rawLines = (title ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (rawLines.length === 0) return [];

  const bodies: string[] = [];
  for (const line of rawLines) {
    const m = line.match(NUMBERED_LINE);
    if (!m) {
      return rawLines;
    }
    const body = (m[2] ?? '').trim();
    if (body.length === 0) {
      return rawLines;
    }
    bodies.push(body);
  }
  return bodies;
}

/** 우선순위 모드 합본 블록(할 일이 2개 이상). */
export function isPriorityCompoundBlockTitle(title: string): boolean {
  return parseNumberedFlowLines(title).length >= 2;
}

/**
 * 제목이 비줄바꿈 한 줄이면서, 담기(우선순위) 카탈로그에 해당하는 라벨인지.
 * 집중 구간과 동일 시각의 단일 항목 블록은 담기를 비운 뒤에도 타임라인에 다시 뜨지 않게 구분할 때 사용.
 */
export function isLikelyPriorityCatalogMonolineTitle(title: string): boolean {
  const rawLines = (title ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (rawLines.length !== 1) return false;
  return resolveCategoryKeyFromLabel(rawLines[0]!) !== null;
}
