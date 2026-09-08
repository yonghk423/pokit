import { t } from '@shared/lib/i18n';
import {
  isSameApplyWeekdaySet,
  resolveApplyWeekdays,
  WEEKDAY_PICKER_ORDER,
  WEEKDAY_PRESET_DAILY,
  WEEKDAY_PRESET_WEEKDAY,
  WEEKDAY_PRESET_WEEKEND,
  type FixedFlowSet,
  type WeekdayIndex,
} from '@shared/lib/storage';

const WEEKDAY_SHORT_KEYS: Record<WeekdayIndex, Parameters<typeof t>[0]> = {
  0: 'fixedRoutine.weekdayShort.sun',
  1: 'fixedRoutine.weekdayShort.mon',
  2: 'fixedRoutine.weekdayShort.tue',
  3: 'fixedRoutine.weekdayShort.wed',
  4: 'fixedRoutine.weekdayShort.thu',
  5: 'fixedRoutine.weekdayShort.fri',
  6: 'fixedRoutine.weekdayShort.sat',
};

export function getFixedFlowPresetScheduleLabel(
  applyRule: 'daily' | 'weekend' | string,
): string | null {
  if (applyRule === 'daily') return t('fixedRoutine.ruleWeekday');
  if (applyRule === 'weekend') return t('fixedRoutine.ruleWeekend');
  return null;
}

/** 실제 적용 요일 기준 라벨 (프리셋 헤더 필용) */
export function getFixedFlowSetScheduleLabel(
  set: Pick<FixedFlowSet, 'applyRule' | 'applyWeekdays'>,
): string {
  const days = resolveApplyWeekdays(set);
  if (isSameApplyWeekdaySet(days, WEEKDAY_PRESET_WEEKDAY)) return t('fixedRoutine.ruleWeekday');
  if (isSameApplyWeekdaySet(days, WEEKDAY_PRESET_WEEKEND)) return t('fixedRoutine.ruleWeekend');
  if (isSameApplyWeekdaySet(days, WEEKDAY_PRESET_DAILY)) return t('fixedRoutine.ruleDaily');
  return WEEKDAY_PICKER_ORDER.filter((day) => days.includes(day))
    .map((day) => t(WEEKDAY_SHORT_KEYS[day]))
    .join('·');
}

export function getFixedFlowPresetScheduleHint(applyRule: 'daily' | 'weekend' | string): string {
  if (applyRule === 'daily') return t('fixedRoutine.hintDaily');
  if (applyRule === 'weekend') return t('fixedRoutine.hintWeekend');
  return '';
}
