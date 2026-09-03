import { t } from '@shared/lib/i18n';

export function getFixedFlowPresetScheduleLabel(
  applyRule: 'daily' | 'weekend' | string,
): string | null {
  if (applyRule === 'daily') return t('fixedRoutine.ruleDaily');
  if (applyRule === 'weekend') return t('fixedRoutine.ruleWeekend');
  return null;
}

export function getFixedFlowPresetScheduleHint(applyRule: 'daily' | 'weekend' | string): string {
  if (applyRule === 'daily') return t('fixedRoutine.hintDaily');
  if (applyRule === 'weekend') return t('fixedRoutine.hintWeekend');
  return '';
}
