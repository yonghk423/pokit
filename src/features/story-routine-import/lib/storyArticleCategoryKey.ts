import {
  createCustomFlowCategoryId,
  isSystemCatalogGroupKey,
  type CustomFlowCategoryKey,
} from '@entities/day-plan';
import { DEFAULT_CUSTOM_FLOW_GROUP_KEY } from '@shared/lib/storage';
import { isCustomCatalogGroupKey } from '@shared/lib/storage/customCatalogGroupStorage';

import type { StoryRoutineArticle } from '../model/storyRoutinePayload';

const STORY_FLOW_PREFIX = 'customFlow:story:' as const;

/** pokitstory 아티클 slug → 안정적인 customFlow 키 (중복 추가 방지) */
export function storyArticleCategoryKey(article: StoryRoutineArticle): CustomFlowCategoryKey {
  const raw = (article.slug || article.id).trim().toLowerCase();
  const safe = raw
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);

  if (safe.length === 0) {
    return createCustomFlowCategoryId();
  }

  return `${STORY_FLOW_PREFIX}${safe}`;
}

const STORY_CATEGORY_TO_GROUP: Record<string, string> = {
  movement: 'health',
  nutrition: 'health',
  sleep_prep: 'health',
  wind_down: 'health',
  meditation: 'health',
  hydration: 'health',
  breath: 'health',
  posture: 'health',
  recovery: 'health',
  eye_care: 'health',
  morning_light: 'health',
  energy: 'health',
};

/** 아티클 메타에서 루틴 카탈로그 그룹 초기값 추천 */
export function suggestCatalogGroupKey(article: StoryRoutineArticle): string {
  const key = article.categoryKey?.trim().toLowerCase();
  if (key && STORY_CATEGORY_TO_GROUP[key]) {
    return STORY_CATEGORY_TO_GROUP[key];
  }
  return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
}

export function resolveCatalogGroupKeyForPersist(groupKey: string): string {
  const t = groupKey.trim();
  if (isSystemCatalogGroupKey(t)) return t;
  if (isCustomCatalogGroupKey(t)) return t;
  return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
}
