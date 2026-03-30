import { useLocalSearchParams } from 'expo-router';

import type { GoalDetailCategoryKey } from './types';

type Params = {
  rhythmTitle?: string;
  categoryKey?: string;
  startBlockId?: string;
  blockIds?: string;
};

function parseBlockIds(raw: string | undefined): string[] {
  if (!raw) return [];
  const t = raw.trim();
  if (!t) return [];

  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  return t
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function pickParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

export function useGoalDetailSettingsRoute(): {
  rhythmTitle: string;
  categoryKey: GoalDetailCategoryKey;
  /** 저장 직후 세션 시작에 사용할 오늘 일정 블록 id */
  startBlockId: string | undefined;
  /** 목표 상세를 한 번에 편집할 블록 id 목록 */
  blockIds: string[];
} {
  const params = useLocalSearchParams<Params>();
  const rhythmTitle =
    typeof params.rhythmTitle === 'string' ? params.rhythmTitle.trim() : '';

  const rawKey = typeof params.categoryKey === 'string' ? params.categoryKey : '';
  const categoryKey = isGoalDetailCategoryKey(rawKey) ? rawKey : 'other';

  const startBlockId = pickParam(params.startBlockId);
  const blockIds = parseBlockIds(pickParam(params.blockIds));

  return { rhythmTitle, categoryKey, startBlockId, blockIds };
}

function isGoalDetailCategoryKey(v: string): v is GoalDetailCategoryKey {
  return (
    v === 'run' ||
    v === 'work' ||
    v === 'reading' ||
    v === 'study' ||
    v === 'meditation' ||
    v === 'yoga' ||
    v === 'rest' ||
    v === 'fasting' ||
    v === 'water' ||
    v === 'medicine' ||
    v === 'stretch' ||
    v === 'other'
  );
}

