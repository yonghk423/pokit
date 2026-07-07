import type { DayPlanBlock } from '../model/types';

import { filterSpineTimelineBlocks } from './dayPlanFlowBlock';
import { parseHHmmToMinutes } from './parseTime';

const DEFAULT_BLOCK_MIN = 30;
const GAP_MIN = 5;

export type SpineBagImportBlock = {
  categoryKey: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
};

export function buildSpineImportFromBag(input: {
  categoryKeys: readonly string[];
  resolveTitle: (categoryKey: string) => string;
  priorityStart: string;
  priorityEnd: string;
  existingBlocks: readonly DayPlanBlock[];
  nowMinutes: number;
  defaultDurationMin?: number;
}): SpineBagImportBlock[] {
  const windowStart = parseHHmmToMinutes(input.priorityStart) ?? 9 * 60;
  const windowEndRaw = parseHHmmToMinutes(input.priorityEnd) ?? 22 * 60;
  const windowEnd = windowEndRaw <= windowStart ? 24 * 60 : windowEndRaw;

  const existingKeys = new Set(
    filterSpineTimelineBlocks([...input.existingBlocks])
      .map((block) => block.categoryKey?.trim())
      .filter((key): key is string => Boolean(key)),
  );

  const keysToImport = input.categoryKeys
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && !existingKeys.has(key));
  if (keysToImport.length === 0) return [];

  const duration = input.defaultDurationMin ?? DEFAULT_BLOCK_MIN;
  let cursor = Math.max(windowStart, input.nowMinutes);
  const result: SpineBagImportBlock[] = [];

  for (const categoryKey of keysToImport) {
    if (cursor + duration > windowEnd) break;
    result.push({
      categoryKey,
      title: input.resolveTitle(categoryKey),
      startMinutes: cursor,
      endMinutes: cursor + duration,
    });
    cursor += duration + GAP_MIN;
  }

  return result;
}
