import {
  isCustomFlowCategoryKey,
  isGoalDetailChecklistDerivedCategoryKey,
  normalizeFastingDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeOtherDetailConfig,
  normalizeReadingLiveActivityConfig,
  normalizeWaterDetailConfig,
} from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';
import {
  formatRoutineSummaryHint,
  readRoutineSummaryFromConfig,
} from '@entities/day-plan/lib/routineSummary';

function medicineEnabledSlots(cfg: ReturnType<typeof normalizeMedicineDetailConfig>): string[] {
  const out: string[] = [];
  if (cfg.morningOn) out.push('아침');
  if (cfg.lunchOn) out.push('점심');
  if (cfg.dinnerOn) out.push('저녁');
  return out;
}

/** 체크리스트가 비어 있으면 null — 목록 부제는 `설정 안 함` 등 미설정 문구로 떨어진다. */
function hintFromOtherStyleRaw(raw: unknown): string | null {
  const cfg = normalizeOtherDetailConfig(raw ?? {});
  const total = cfg.checklist.length;
  const done = cfg.checklist.filter((x) => x.done).length;
  if (total > 0) {
    return done > 0 ? `작업 ${total}개 · 완료 ${done}` : `작업 ${total}개`;
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
  const summaryHint = formatRoutineSummaryHint(readRoutineSummaryFromConfig(raw));
  if (summaryHint) return summaryHint;

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
    case 'other':
      return hintFromOtherStyleRaw(raw);
    default: {
      if (isCustomFlowCategoryKey(categoryKey)) return hintFromOtherStyleRaw(raw);
      if (!isGoalDetailChecklistDerivedCategoryKey(categoryKey)) return null;
      return hintFromOtherStyleRaw(raw);
    }
  }
}
