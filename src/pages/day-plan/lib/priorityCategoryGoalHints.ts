import {
  formatStudyDdayLabel,
  isCustomFlowCategoryKey,
  MEASUREMENT_UNIT_OPTIONS,
  nearestUpcomingDdayEvent,
  normalizeCounterDetailConfig,
  normalizeFastingDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeHealthIntakeDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMeasurementDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeOtherDetailConfig,
  normalizeReadingLiveActivityConfig,
  normalizeReminderDetailConfig,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  reminderProgress,
  resolveCustomFlowTemplateKey,
} from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

function medicineEnabledSlots(cfg: ReturnType<typeof normalizeMedicineDetailConfig>): string[] {
  const out: string[] = [];
  if (cfg.morningOn) out.push('아침');
  if (cfg.lunchOn) out.push('점심');
  if (cfg.dinnerOn) out.push('저녁');
  return out;
}

/** 체크리스트가 비어 있으면 null — 목록 부제는 `설정 안 함` 등 미설정 문구로 떨어진다. */
function hintFromMeasurementRaw(raw: unknown): string | null {
  const cfg = normalizeMeasurementDetailConfig(raw ?? {});
  const label = cfg.metricLabel.trim();
  if (label.length === 0) return null;
  const unitLabel =
    MEASUREMENT_UNIT_OPTIONS.find((u) => u.key === cfg.unit)?.labelKo ?? '';
  if (cfg.currentValue > 0) {
    const valueText =
      cfg.currentValue % 1 === 0 ? String(cfg.currentValue) : cfg.currentValue.toFixed(1);
    return unitLabel.length > 0 && cfg.unit !== 'none'
      ? `${label} ${valueText} ${unitLabel}`
      : `${label} ${valueText}`;
  }
  if (cfg.useGoalValue && cfg.goalValue > 0) {
    const goalText = cfg.goalValue % 1 === 0 ? String(cfg.goalValue) : cfg.goalValue.toFixed(1);
    return unitLabel.length > 0 && cfg.unit !== 'none'
      ? `${label} · 목표 ${goalText} ${unitLabel}`
      : `${label} · 목표 ${goalText}`;
  }
  return label;
}

function hintFromCustomFlowRaw(raw: unknown): string | null {
  switch (resolveCustomFlowTemplateKey(raw)) {
    case 'measurement':
      return hintFromMeasurementRaw(raw);
    case 'habit': {
      const cfg = normalizeHabitDetailConfig(raw ?? {});
      if (cfg.doneToday) {
        return cfg.streakDays > 0 ? `오늘 완료 · ${cfg.streakDays}일 연속` : '오늘 완료';
      }
      return cfg.streakDays > 0 ? `습관 · ${cfg.streakDays}일 연속` : '습관 기록';
    }
    case 'counter': {
      const cfg = normalizeCounterDetailConfig(raw ?? {});
      const label = cfg.activityLabel.trim() || '횟수';
      if (cfg.currentCount > 0) {
        return `${label} ${cfg.currentCount}/${cfg.goalCount}${cfg.unitLabel}`;
      }
      return `${label} · 목표 ${cfg.goalCount}${cfg.unitLabel}`;
    }
    case 'focus': {
      const cfg = normalizeFocusDetailConfig(raw ?? {});
      if (cfg.doneMin > 0) return `집중 ${cfg.doneMin}/${cfg.planMin}분`;
      return `목표 ${cfg.planMin}분`;
    }
    case 'journal': {
      const cfg = normalizeJournalDetailConfig(raw ?? {});
      if (cfg.lastEntry.trim().length > 0) return cfg.lastEntry.trim();
      if (cfg.prompt.trim().length > 0) return cfg.prompt.trim();
      return '한 줄 기록';
    }
    case 'reminder': {
      const cfg = normalizeReminderDetailConfig(raw ?? {});
      const times = cfg.reminderTimes.join(' · ');
      const { done, total } = reminderProgress(cfg);
      if (total > 0 && done >= total) return `${times} · 전체 완료`;
      if (done > 0) return `${times} · ${done}/${total}`;
      return times;
    }
    case 'checklist':
    default:
      return hintFromOtherStyleRaw(raw);
  }
}

function hintFromOtherStyleRaw(raw: unknown): string | null {
  const cfg = normalizeOtherDetailConfig(raw ?? {});
  const total = cfg.checklist.length;
  const done = cfg.checklist.filter((x) => x.done).length;
  if (total > 0) {
    return done > 0 ? `할 일 ${total}개 · 완료 ${done}` : `할 일 ${total}개`;
  }
  return null;
}

export type PriorityGoalHintOptions = {
  /**
   * 현재 미사용(하위 호환용).
   */
  isFocusStarted?: boolean;
};

/**
 * 우선순위 목록·담기 탭에 표시할 목표 상세 한 줄 (저장소 기준).
 * 세션 중 실시간 값은 별도 스토어가 없으면 목표 상세에 반영된 값을 사용한다.
 */
export function getPriorityCategoryGoalHint(
  categoryKey: string,
  options?: PriorityGoalHintOptions,
): string | null {
  const raw = loadGoalDetailCategoryConfig(categoryKey);

  switch (categoryKey) {
    case 'reading': {
      const cfg = normalizeReadingLiveActivityConfig(raw);
      const t = cfg.bookTitle.trim();
      return t.length > 0 ? t : null;
    }
    case 'fasting': {
      const cfg = normalizeFastingDetailConfig(raw);
      const goalH = Math.max(1, Math.round(cfg.fastingMin / 60));
      if (cfg.elapsedMin > 0) {
        const h = Math.floor(cfg.elapsedMin / 60);
        const m = cfg.elapsedMin % 60;
        if (h > 0 && m > 0) return `누적 ${h}시간 ${m}분`;
        if (h > 0) return `누적 ${h}시간`;
        return `누적 ${m}분`;
      }
      return `목표 ${goalH}시간`;
    }
    case 'healthIntake': {
      const hi = normalizeHealthIntakeDetailConfig(raw);
      const med = hi.medicine;
      const scheduleParts: string[] = [];
      if (med.morningOn) scheduleParts.push(`아침 ${med.morningTime}`);
      if (med.lunchOn) scheduleParts.push(`점심 ${med.lunchTime}`);
      if (med.dinnerOn) scheduleParts.push(`저녁 ${med.dinnerTime}`);
      const label = med.doseLabel.trim();
      if (scheduleParts.length === 0) {
        return label.length > 0 ? label : null;
      }
      const line = scheduleParts.join(' · ');
      const slots = medicineEnabledSlots(med);
      if (med.takenCount > 0 && slots.length > 0) {
        const item = label.length > 0 ? `${label} · ` : '';
        return `${item}${med.takenCount}/${med.dosesPerDay}회 · ${line}`;
      }
      return label.length > 0 ? `${label} · ${line}` : line;
    }
    case 'water': {
      const cfg = normalizeWaterDetailConfig(raw);
      const drankL = (cfg.drankMl / 1000).toFixed(1);
      const goalL = (cfg.goalMl / 1000).toFixed(1);
      return `섭취 ${drankL}L · 목표 ${goalL}L`;
    }
    case 'medicine': {
      const cfg = normalizeMedicineDetailConfig(raw);
      const scheduleParts: string[] = [];
      if (cfg.morningOn) scheduleParts.push(`아침 ${cfg.morningTime}`);
      if (cfg.lunchOn) scheduleParts.push(`점심 ${cfg.lunchTime}`);
      if (cfg.dinnerOn) scheduleParts.push(`저녁 ${cfg.dinnerTime}`);
      if (scheduleParts.length === 0) return '복용 슬롯 없음';
      const line = scheduleParts.join(' · ');
      const slots = medicineEnabledSlots(cfg);
      if (slots.length === 0) return line;
      if (cfg.takenCount <= 0) return line;
      const idx = Math.min(cfg.takenCount - 1, slots.length - 1);
      const last = slots[idx] ?? slots[slots.length - 1];
      return `${line} · ${last} 복용 · ${cfg.takenCount}/${cfg.dosesPerDay}회`;
    }
    case 'work': {
      const cfg = normalizeWorkDetailConfig(raw);
      const parts: string[] = [];
      const subject = cfg.subject.trim();
      if (subject.length > 0) parts.push(subject);
      const nearest = nearestUpcomingDdayEvent(cfg.ddayEvents);
      if (nearest) {
        parts.push(`${nearest.title} ${formatStudyDdayLabel(nearest.dateKey)}`);
      }
      if (cfg.studyMode === 'pomodoro') {
        parts.push(`뽀모도로 ${cfg.planMin}+${cfg.breakMin}분`);
      } else if (cfg.doneMin > 0) {
        parts.push(`${cfg.doneMin}/${cfg.planMin}분`);
      } else {
        parts.push(`목표 ${cfg.planMin}분`);
      }
      const total = cfg.tasks.length;
      if (total > 0) {
        const done = cfg.tasks.filter((t) => t.done).length;
        parts.push(`할 일 ${done}/${total}`);
      }
      if (cfg.timetableSlots.length > 0) {
        parts.push(`시간표 ${cfg.timetableSlots.length}칸`);
      }
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'other':
      return hintFromOtherStyleRaw(raw);
    default: {
      if (isCustomFlowCategoryKey(categoryKey)) return hintFromCustomFlowRaw(raw);
      return null;
    }
  }
}
