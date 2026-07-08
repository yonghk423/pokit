import {
  formatStudyDdayLabel,
  isCustomFlowCategoryKey,
  formatMeasurementValue,
  nearestUpcomingDdayEvent,
  normalizeCounterDetailConfig,
  normalizeFastingDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeHealthIntakeDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeMeasurementDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeOtherDetailConfig,
  normalizeReadingLiveActivityConfig,
  normalizeReminderDetailConfig,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  reminderProgress,
  resolveCounterUnitLabel,
  resolveCustomFlowTemplateKey,
  resolveMeasurementUnitLabel,
  resolveReminderItemTitle,
} from '@entities/day-plan';
import { latestWeightFromLogs } from '@entities/day-plan/lib/weightLog';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';
import { formatDurationMinKo } from '@shared/lib/formatDurationMinKo';

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
  const unitLabel = resolveMeasurementUnitLabel(cfg.unit, cfg.customUnitLabel);
  if (cfg.currentValue > 0) {
    const valueText = formatMeasurementValue(cfg.currentValue, cfg.unit);
    return unitLabel.length > 0 && cfg.unit !== 'none'
      ? `${label} ${valueText} ${unitLabel}`
      : `${label} ${valueText}`;
  }
  if (cfg.useGoalValue && cfg.goalValue > 0) {
    const goalText = formatMeasurementValue(cfg.goalValue, cfg.unit);
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
      const unit = resolveCounterUnitLabel(cfg.unitKey, cfg.customUnitLabel, cfg.unitLabel);
      if (cfg.currentCount > 0) {
        return unit === '회' ? `${label} ${cfg.currentCount}/${cfg.goalCount}회` : `${label} ${cfg.currentCount}/${cfg.goalCount}${unit}`;
      }
      return unit === '회'
        ? `${label} · 목표 ${cfg.goalCount}회`
        : `${label} · 목표 ${cfg.goalCount}${unit}`;
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
    case 'memo': {
      const cfg = normalizeMemoDetailConfig(raw ?? {});
      if (cfg.lastEntry.trim().length > 0) return cfg.lastEntry.trim();
      return '간단한 메모';
    }
    case 'reminder': {
      const cfg = normalizeReminderDetailConfig(raw ?? {});
      const labels = cfg.reminderItems
        .map((item) => resolveReminderItemTitle(item))
        .join(' · ');
      const { done, total } = reminderProgress(cfg);
      if (total > 0 && done >= total) return `${labels} · 전체 완료`;
      if (done > 0) return `${labels} · ${done}/${total}`;
      return labels;
    }
    case 'checklist':
      return hintFromOtherStyleRaw(raw);
    case 'abstain':
      return hintFromAbstainRaw(raw);
  }
}

function hintFromAbstainRaw(raw: unknown): string | null {
  const cfg = normalizeOtherDetailConfig(raw ?? {});
  const total = cfg.checklist.length;
  const kept = cfg.checklist.filter((x) => x.done).length;
  if (total > 0) {
    return kept > 0 ? `금지 ${total}개 · 지킴 ${kept}` : `금지 ${total}개`;
  }
  return null;
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
      const current = latestWeightFromLogs(cfg.weightLogs, cfg.currentWeightKg);
      if (current > 0 && cfg.targetWeightKg > 0) {
        if (current <= cfg.targetWeightKg) {
          return `목표 ${cfg.targetWeightKg.toFixed(1)}kg 달성`;
        }
        const delta = current - cfg.targetWeightKg;
        return `${current.toFixed(1)}kg · 목표까지 ${delta.toFixed(1)}kg`;
      }
      return cfg.weeklyLossTargetKg > 0
        ? `주간 ${cfg.weeklyLossTargetKg.toFixed(1)}kg 감량 목표`
        : null;
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
