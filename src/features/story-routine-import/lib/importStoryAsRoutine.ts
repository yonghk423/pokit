import {
  getInitialOtherDataConfig,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  appendCustomFlowCatalogEntry,
  listCustomFlowCatalogEntries,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';

import type { StoryRoutineArticle } from '../model/storyRoutinePayload';
import {
  resolveCatalogGroupKeyForPersist,
  storyArticleCategoryKey,
} from './storyArticleCategoryKey';

export type ImportStoryResult = {
  categoryKey: string;
  /** false면 기존 스토리 루틴을 갱신한 것 */
  created: boolean;
};

/**
 * pokitstory 아티클을 커스텀 플로우로 등록한다.
 * 동일 slug는 항상 같은 categoryKey를 써 중복 추가를 막는다.
 */
export function importStoryAsRoutine(
  article: StoryRoutineArticle,
  groupKey: string,
): ImportStoryResult {
  const id = storyArticleCategoryKey(article);
  const safeGroupKey = resolveCatalogGroupKeyForPersist(groupKey);
  const existed = listCustomFlowCatalogEntries().some((e) => e.id === id);

  const initial = getInitialOtherDataConfig();
  const config = {
    ...initial,
    displayName: article.title.trim(),
    summary: (article.summary ?? '').trim(),
    checklist: (article.steps ?? []).map((text, index) => ({
      id: `step_${index}_${id.slice(-8)}`,
      text: text.trim(),
      done: false,
    })),
  };
  saveGoalDetailCategoryConfig(id, config);
  appendCustomFlowCatalogEntry({ id, groupKey: safeGroupKey });

  registerOtherCategoryResolverFromStorage();
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();

  return { categoryKey: id, created: !existed };
}
