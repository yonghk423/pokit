import {
  normalizeReminderDetailConfig,
  type ReminderDetailDataConfig,
} from './customFlowTemplateConfigs';
import type { ReminderSchedulePreset } from './reminderSchedule';

/** 미리보기용 — 프리셋별 완료된 알림 시각 */
const REMINDER_DEMO_COMPLETED: Record<string, string[]> = {
  medicine: ['09:00'],
  water: ['10:00'],
  meals: ['08:00'],
  study: [],
};

export function applyReminderSchedulePreset(
  cfg: ReminderDetailDataConfig,
  preset: ReminderSchedulePreset,
  options?: { includeDemoProgress?: boolean },
): ReminderDetailDataConfig {
  const next = normalizeReminderDetailConfig({
    ...cfg,
    reminderItems: preset.items,
    completedTimes: options?.includeDemoProgress ? (REMINDER_DEMO_COMPLETED[preset.id] ?? []) : [],
  });
  return next;
}

export function pickReminderSettingsForCreate(raw: unknown): Record<string, unknown> | null {
  const cfg = normalizeReminderDetailConfig(raw);
  const isDefaultOnly =
    cfg.reminderItems.length === 1 &&
    cfg.reminderItems[0]?.time === '09:00' &&
    !cfg.reminderItems[0]?.label.trim();
  if (isDefaultOnly) return null;
  return {
    reminderItems: cfg.reminderItems,
  };
}
