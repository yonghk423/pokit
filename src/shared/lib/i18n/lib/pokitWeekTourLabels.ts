import { resolvePokitWeekTourStepIndex } from '@shared/lib/storage/defaultPriorityCatalog';

import { t, type I18nKey } from '../model/translate';

const STEP_TITLE_KEYS = [
  'tour.pokitWeek.step1.title',
  'tour.pokitWeek.step2.title',
  'tour.pokitWeek.step3.title',
  'tour.pokitWeek.step4.title',
  'tour.pokitWeek.step5.title',
  'tour.pokitWeek.step6.title',
  'tour.pokitWeek.step7.title',
] as const satisfies readonly I18nKey[];

/** 저장된 한글 체크 문구를 현재 로케일 단계 제목으로 보여 준다. */
export function resolvePokitWeekTourTaskLabel(taskId: string, storedText: string): string {
  const fromId = resolvePokitWeekTourStepIndex(taskId);
  if (fromId != null) return t(STEP_TITLE_KEYS[fromId]);

  const trimmed = storedText.trim();
  if (!trimmed) return storedText;
  for (const key of STEP_TITLE_KEYS) {
    if (trimmed === t(key, 'ko') || trimmed === t(key, 'en') || trimmed === t(key, 'ja')) {
      return t(key);
    }
  }
  return storedText;
}
