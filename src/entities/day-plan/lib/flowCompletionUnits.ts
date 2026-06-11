import type { DayPlanBlock } from '../model/types';
import { resolveBlockCategoryKey, resolveCategoryKeyFromLabel } from './dayPlanRuntimeTime';
import { parseNumberedFlowLines } from './priorityBlockTitle';

/**
 * 히스토리 집계용 완료 단위를 블록에서 추출합니다.
 * - 일반 블록: 1개(categoryKey 1개)
 * - prioritySession 합본 블록: 제목 라인 수만큼 분해
 */
export function getFlowCompletionCategoryKeysForBlock(
  block: Pick<DayPlanBlock, 'title' | 'category' | 'categoryKey' | 'blockOrigin'>,
): string[] {
  if (block.blockOrigin === 'quickMemo') return [];

  const fallback = resolveBlockCategoryKey(block) ?? 'other';
  if (block.blockOrigin !== 'prioritySession') {
    return [fallback];
  }

  const lines = parseNumberedFlowLines(block.title);
  if (lines.length === 0) return [fallback];

  return lines.map((line) => resolveCategoryKeyFromLabel(line) ?? fallback);
}

export function getFlowCompletionUnitCountForBlock(
  block: Pick<DayPlanBlock, 'title' | 'category' | 'categoryKey' | 'blockOrigin'>,
): number {
  const keys = getFlowCompletionCategoryKeysForBlock(block);
  return keys.length;
}
