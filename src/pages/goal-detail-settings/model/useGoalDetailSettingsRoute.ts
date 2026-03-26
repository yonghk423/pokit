import { useLocalSearchParams } from 'expo-router';

import type { GoalDetailCategoryKey } from './types';

type Params = {
  rhythmTitle?: string;
  categoryKey?: string;
  startBlockId?: string;
};

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
} {
  const params = useLocalSearchParams<Params>();
  const rhythmTitle =
    typeof params.rhythmTitle === 'string' && params.rhythmTitle.trim()
      ? params.rhythmTitle.trim()
      : '리듬';

  const rawKey = typeof params.categoryKey === 'string' ? params.categoryKey : '';
  const categoryKey = isGoalDetailCategoryKey(rawKey) ? rawKey : 'other';

  const startBlockId = pickParam(params.startBlockId);

  return { rhythmTitle, categoryKey, startBlockId };
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
    v === 'water' ||
    v === 'medicine' ||
    v === 'stretch' ||
    v === 'other'
  );
}

