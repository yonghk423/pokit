import { formatHhmmClock, t } from '@shared/lib/i18n';
import {
  isPostItFaceColorId,
  isPostItInkColorId,
  loadDayPlanDraft,
  loadGoalDetailCategoryConfig,
  loadPinnedRoutineCategoryKey,
} from '@shared/lib/storage';

import { resolveCategoryCatalogIcon } from './categoryCatalogAppearance';
import { resolveCounterUnitLabel } from './counterUnits';
import { resolveCustomFlowTemplateKey } from './customFlowTemplate';
import {
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  resolveReminderItemTitle,
} from './customFlowTemplateConfigs';
import {
  ensureCounterDayBoundary,
  reminderProgress,
} from './customFlowTemplateRuntime';
import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { resolveCustomFlowDisplayLabel } from './customFlowDisplayLabel';
import {
  normalizeFastingDetailConfig,
  normalizeMeasurementDetailConfig,
} from './goalCategorySessionConfig';
import {
  isHealthIntakeRelatedCategoryKey,
  normalizeHealthIntakeDetailConfig,
} from './healthIntakeDetailConfig';
import {
  formatMeasurementValue,
  resolveMeasurementUnitLabel,
} from './measurementUnits';
import { resolveStandardCatalogDisplayLabel } from './priorityCatalogPickerLabels';
import { readRoutineDisplayNameFromConfig } from './routineDisplayName';
import {
  getPriorityMarkPreset,
  isPriorityMarkColorId,
  resolveCategoryMarkColor,
  type PriorityMarkColorId,
} from './priorityMarkColor';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';
import {
  buildWeightChartSeries,
  latestWeightFromLogs,
  weightDeltaToTarget,
  weightGoalAchieved,
  weightProgressRatioFromLogs,
} from './weightLog';
import { resolveWidgetPostItAppearance } from './widgetPostItAppearance';

export type PinnedRoutineChecklistItem = {
  text: string;
  done: boolean;
  /** 큰 위젯용 슬롯/알람 시각 (예: AM 8:30) */
  timeLabel?: string;
};

/** 위젯 본문 레이아웃 — 템플릿별 대표 지표 */
export type PinnedRoutineMetricKind =
  | 'none'
  | 'checklist'
  | 'reading'
  | 'weight'
  | 'intake'
  | 'counter';

export type PinnedRoutineWidgetPayload = {
  categoryKey: string | null;
  title: string;
  iconName: string;
  /** @deprecated 위젯에서는 요약글 미표시 — 호환용으로 빈 문자열 유지 */
  summary: string;
  detailLines: string[];
  checklistItems: PinnedRoutineChecklistItem[];
  progressLabel: string;
  metricKind: PinnedRoutineMetricKind;
  /** 체중·독서 등 진행률 0~1 */
  progressRatio: number;
  /** 큰 한 줄 — 예: `68.5 → 65.0 kg` */
  heroLine: string;
  /** 보조 한 줄 — 예: 목표까지 · 주간 감량 */
  subLine: string;
  /** 큰 위젯용 수분 알림 시각 한 줄 — 섭취 루틴 */
  alarmLine: string;
  /** 최근 체중(kg) — 스파크라인용 */
  sparkWeights: number[];
  /** 홈 위젯 포스트잇 면색 `#RRGGBB` */
  faceHex: string;
  /** 홈 위젯 글자색 `#RRGGBB` */
  inkHex: string;
  /** 보조 글자색 */
  mutedHex: string;
  /**
   * 루틴 중요도 형광펜 — 제목 뒤 하이라이트 (`#RRGGBB`).
   * 앱 `priorityCategoryImportance` / 중요도 표시와 동일.
   */
  titleHighlightHex: string | null;
  /** 형광펜 불투명도 0~1 */
  titleHighlightOpacity: number;
  isCompleted: boolean;
  emptyMessage: string;
};

/**
 * 담기 행은 인스턴스 키로, 위젯 후보는 카탈로그 키로 색을 둘 수 있어
 * 동일 루틴 base 키·인스턴스 키를 모두 본다.
 */
function lookupDraftMapValue(
  map: Record<string, string> | undefined,
  categoryKey: string,
): string | undefined {
  if (!map) return undefined;
  const trimmed = categoryKey.trim();
  if (!trimmed) return undefined;
  const direct = map[trimmed];
  if (direct != null && direct !== '') return direct;
  const base = resolvePriorityRoutineCategoryKey(trimmed);
  const onBase = map[base];
  if (onBase != null && onBase !== '') return onBase;
  for (const [key, value] of Object.entries(map)) {
    if (value == null || value === '') continue;
    if (resolvePriorityRoutineCategoryKey(key) === base) return value;
  }
  return undefined;
}

function resolveRoutineWidgetAppearance(categoryKey: string) {
  const draft = loadDayPlanDraft();
  const rawFace = lookupDraftMapValue(draft?.priorityCategoryFaceColor, categoryKey);
  const rawInk = lookupDraftMapValue(draft?.priorityCategoryInkColor, categoryKey);
  const faceId = isPostItFaceColorId(rawFace) ? rawFace : null;
  const inkId = isPostItInkColorId(rawInk) ? rawInk : null;
  return resolveWidgetPostItAppearance(false, { faceId, inkId });
}

function loadImportanceHighlight(categoryKey: string): {
  titleHighlightHex: string | null;
  titleHighlightOpacity: number;
} {
  const draft = loadDayPlanDraft();
  const rawMap = draft?.priorityCategoryImportance ?? {};
  const map: Record<string, PriorityMarkColorId> = {};
  for (const [key, value] of Object.entries(rawMap)) {
    if (isPriorityMarkColorId(value)) map[key] = value;
  }
  const markRaw = lookupDraftMapValue(rawMap, categoryKey);
  const markId = isPriorityMarkColorId(markRaw)
    ? markRaw
    : resolveCategoryMarkColor(map, categoryKey);
  const preset = getPriorityMarkPreset(markId);
  if (!preset) {
    return { titleHighlightHex: null, titleHighlightOpacity: 0 };
  }
  return {
    titleHighlightHex: preset.face,
    // 글자 뒤 형광펜 — 위젯에서 잉크가 탁해지지 않게 앱보다 옅게
    titleHighlightOpacity: 0.42,
  };
}

function emptyPayload(emptyMessage: string): PinnedRoutineWidgetPayload {
  const appearance = resolveWidgetPostItAppearance(false);
  return {
    categoryKey: null,
    title: '',
    iconName: 'square.grid.2x2',
    summary: '',
    detailLines: [],
    checklistItems: [],
    progressLabel: '',
    metricKind: 'none',
    progressRatio: 0,
    heroLine: '',
    subLine: '',
    alarmLine: '',
    sparkWeights: [],
    faceHex: appearance.faceHex,
    inkHex: appearance.inkHex,
    mutedHex: appearance.mutedHex,
    titleHighlightHex: null,
    titleHighlightOpacity: 0,
    isCompleted: false,
    emptyMessage,
  };
}

function resolvePinnedTitle(categoryKey: string): string {
  const cfg = loadGoalDetailCategoryConfig(categoryKey);
  const displayName = readRoutineDisplayNameFromConfig(cfg);
  if (isCustomFlowCategoryKey(categoryKey)) {
    return resolveCustomFlowDisplayLabel(categoryKey, displayName);
  }
  // 표준 루틴도 사용자가 바꾼 표시명을 위젯 제목에 반영
  return resolveStandardCatalogDisplayLabel(categoryKey, displayName);
}

function collectChecklistItems(config: unknown): PinnedRoutineChecklistItem[] {
  if (!config || typeof config !== 'object') return [];
  const list = (config as { checklist?: unknown }).checklist;
  if (!Array.isArray(list)) return [];
  const out: PinnedRoutineChecklistItem[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as {
      text?: unknown;
      title?: unknown;
      isDone?: unknown;
      done?: unknown;
      completed?: unknown;
    };
    const textRaw = typeof row.text === 'string' ? row.text : typeof row.title === 'string' ? row.title : '';
    const text = textRaw.trim();
    if (!text) continue;
    out.push({
      text,
      done: row.isDone === true || row.done === true || row.completed === true,
    });
  }
  return out;
}

function collectReadingDetailLines(config: unknown): string[] {
  if (!config || typeof config !== 'object') return [];
  const root = config as Record<string, unknown>;
  const reading =
    root.reading && typeof root.reading === 'object' ? (root.reading as Record<string, unknown>) : root;
  const titleRaw = reading.title ?? reading.bookTitle;
  const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
  const current =
    typeof reading.currentPage === 'number' && Number.isFinite(reading.currentPage)
      ? Math.max(0, Math.floor(reading.currentPage))
      : null;
  const total =
    typeof reading.totalPages === 'number' && Number.isFinite(reading.totalPages)
      ? Math.max(0, Math.floor(reading.totalPages))
      : null;
  const lines: string[] = [];
  if (title) lines.push(title);
  if (current != null && total != null && total > 0) {
    lines.push(t('widgetSettings.pinned.readingProgress', { current, total }));
  } else if (current != null) {
    lines.push(t('widgetSettings.pinned.readingPage', { current }));
  }
  return lines;
}

function isWeightTemplate(categoryKey: string, config: unknown): boolean {
  if (resolvePriorityRoutineCategoryKey(categoryKey) === 'fasting') return true;
  return resolveCustomFlowTemplateKey(config) === 'fasting';
}

function isIntakeTemplate(categoryKey: string, config: unknown): boolean {
  if (isHealthIntakeRelatedCategoryKey(categoryKey)) return true;
  return resolveCustomFlowTemplateKey(config) === 'healthIntake';
}

type HeroMetrics = {
  heroLine: string;
  subLine: string;
  progressRatio: number;
  progressLabel: string;
  detailLines: string[];
};

function collectCounterMetrics(config: unknown): HeroMetrics {
  const cfg = ensureCounterDayBoundary(normalizeCounterDetailConfig(config ?? {}));
  const unit = resolveCounterUnitLabel(cfg.unitKey, cfg.customUnitLabel, cfg.unitLabel);
  const current = cfg.currentCount;
  const goal = Math.max(1, cfg.goalCount);
  const remain = Math.max(0, goal - current);
  const done = current >= goal;
  const progressRatio = Math.min(1, current / goal);
  const heroLine = t('widgetSettings.pinned.counterHero', {
    current,
    goal,
    unit,
  });
  const activity = cfg.activityLabel.trim();
  const subLine = activity
    ? activity
    : done
      ? t('customFlowTemplate.goalReached')
      : t('customFlowTemplate.remainingToGoal', { count: remain });
  const progressLabel = done
    ? t('widgetSettings.pinned.counterDone')
    : t('widgetSettings.pinned.counterRemain', { remain, unit });

  return {
    heroLine,
    subLine,
    progressRatio,
    progressLabel,
    detailLines: [heroLine, subLine].filter(Boolean),
  };
}

function collectHabitMetrics(config: unknown): HeroMetrics {
  const cfg = normalizeHabitDetailConfig(config ?? {});
  const streak = cfg.streakDays;
  const heroLine = cfg.doneToday
    ? t('widgetSettings.pinned.habitDone')
    : streak > 0
      ? t('widgetSettings.pinned.habitStreak', { count: streak })
      : t('widgetSettings.pinned.habitIdle');
  const subLine =
    cfg.doneToday && streak > 0
      ? t('widgetSettings.pinned.habitStreak', { count: streak })
      : cfg.doneToday
        ? t('customFlowTemplate.doneTodayCheck')
        : streak > 0
          ? t('widgetSettings.pinned.habitIdle')
          : t('customFlowTemplate.desc.habit');
  return {
    heroLine,
    subLine,
    progressRatio: cfg.doneToday ? 1 : 0,
    progressLabel: cfg.doneToday
      ? t('widgetSettings.pinned.habitDone')
      : t('widgetSettings.pinned.habitPending'),
    detailLines: [heroLine, subLine].filter(Boolean),
  };
}

function collectFocusMetrics(config: unknown): HeroMetrics {
  const cfg = normalizeFocusDetailConfig(config ?? {});
  const plan = Math.max(1, cfg.planMin);
  const done = Math.max(0, Math.min(plan, cfg.doneMin));
  const remain = Math.max(0, plan - done);
  const complete = done >= plan;
  const heroLine = t('widgetSettings.pinned.focusHero', { done, plan });
  const memo = cfg.focusMemo.trim();
  const subLine = memo
    ? memo
    : complete
      ? t('widgetSettings.pinned.focusDone')
      : t('widgetSettings.pinned.focusRemain', { remain });
  return {
    heroLine,
    subLine,
    progressRatio: Math.min(1, done / plan),
    progressLabel: complete
      ? t('widgetSettings.pinned.focusDone')
      : t('widgetSettings.pinned.focusRemain', { remain }),
    detailLines: [heroLine, subLine].filter(Boolean),
  };
}

function collectMeasurementMetrics(config: unknown): HeroMetrics {
  const cfg = normalizeMeasurementDetailConfig(config ?? {});
  const unit = resolveMeasurementUnitLabel(cfg.unit, cfg.customUnitLabel);
  const unitSuffix = unit.length > 0 && cfg.unit !== 'none' ? unit : '';
  const valueText = formatMeasurementValue(cfg.currentValue, cfg.unit);
  const label = cfg.metricLabel.trim();
  const heroLine =
    cfg.currentValue > 0
      ? t('widgetSettings.pinned.measurementHero', {
          value: valueText,
          unit: unitSuffix,
        })
      : label || t('widgetSettings.pinned.measurementEmpty');
  let subLine = '';
  if (cfg.useGoalValue && cfg.goalValue > 0) {
    subLine = t('widgetSettings.pinned.measurementGoal', {
      value: formatMeasurementValue(cfg.goalValue, cfg.unit),
      unit: unitSuffix,
    });
  } else if (label && cfg.currentValue > 0) {
    subLine = label;
  }
  const progressRatio =
    cfg.useGoalValue && cfg.goalValue > 0
      ? Math.min(1, Math.max(0, cfg.currentValue / cfg.goalValue))
      : cfg.currentValue > 0
        ? 1
        : 0;
  return {
    heroLine,
    subLine,
    progressRatio,
    progressLabel: subLine,
    detailLines: [heroLine, subLine].filter(Boolean),
  };
}

function collectReminderMetrics(config: unknown): {
  heroLine: string;
  subLine: string;
  progressRatio: number;
  progressLabel: string;
  checklistItems: PinnedRoutineChecklistItem[];
  detailLines: string[];
  alarmLine: string;
} {
  const cfg = normalizeReminderDetailConfig(config ?? {});
  const { done, total } = reminderProgress(cfg);
  const checklistItems: PinnedRoutineChecklistItem[] = cfg.reminderItems.map((item) => ({
    text: resolveReminderItemTitle(item),
    done: cfg.completedTimes.includes(item.time),
    timeLabel: formatHhmmClock(item.time),
  }));
  if (total === 0) {
    return {
      heroLine: t('widgetSettings.pinned.reminderEmpty'),
      subLine: t('customFlowTemplate.desc.reminder'),
      progressRatio: 0,
      progressLabel: '',
      checklistItems: [],
      detailLines: [t('widgetSettings.pinned.reminderEmpty')],
      alarmLine: '',
    };
  }
  const complete = done >= total;
  const remain = Math.max(0, total - done);
  const times = cfg.reminderTimes.map((hhmm) => formatHhmmClock(hhmm)).filter(Boolean);
  const alarmLine =
    times.length > 0
      ? t('widgetSettings.pinned.intakeAlarms', { times: times.join(' · ') })
      : '';
  return {
    heroLine: t('widgetSettings.pinned.reminderHero', { done, total }),
    subLine: complete
      ? t('widgetSettings.pinned.reminderDone')
      : t('widgetSettings.pinned.reminderRemain', { remain }),
    progressRatio: done / Math.max(1, total),
    progressLabel: complete
      ? t('widgetSettings.pinned.reminderDone')
      : t('widgetSettings.pinned.reminderRemain', { remain }),
    checklistItems,
    detailLines: [
      t('widgetSettings.pinned.reminderHero', { done, total }),
      alarmLine,
    ].filter(Boolean),
    alarmLine,
  };
}

function collectJournalDetailLines(config: unknown): string[] {
  const cfg = normalizeJournalDetailConfig(config ?? {});
  const last = cfg.lastEntry.trim();
  if (last) return [last];
  const prompt = cfg.prompt.trim();
  if (prompt) return [prompt];
  return [t('customFlowTemplate.journalFallback')];
}

function collectMemoDetailLines(config: unknown): string[] {
  const cfg = normalizeMemoDetailConfig(config ?? {});
  const last = cfg.lastEntry.trim();
  if (last) return [last];
  return [t('widgetSettings.pinned.memoEmpty')];
}

function heroPayload(
  base: ReturnType<typeof buildPinnedBase>,
  metrics: HeroMetrics,
): PinnedRoutineWidgetPayload {
  return {
    ...base,
    detailLines: metrics.detailLines.slice(0, 3),
    checklistItems: [],
    progressLabel: metrics.progressLabel,
    metricKind: 'counter',
    progressRatio: metrics.progressRatio,
    heroLine: metrics.heroLine,
    subLine: metrics.subLine,
    alarmLine: '',
    sparkWeights: [],
  };
}

function buildPinnedBase(
  categoryKey: string,
  emptyMessage: string,
  options?: { isCompleted?: boolean },
) {
  const appearance = resolveRoutineWidgetAppearance(categoryKey);
  const importance = loadImportanceHighlight(categoryKey);
  return {
    categoryKey,
    title: resolvePinnedTitle(categoryKey),
    iconName: resolveCategoryCatalogIcon(categoryKey),
    summary: '',
    faceHex: appearance.faceHex,
    inkHex: appearance.inkHex,
    mutedHex: appearance.mutedHex,
    titleHighlightHex: importance.titleHighlightHex,
    titleHighlightOpacity: importance.titleHighlightOpacity,
    isCompleted: Boolean(options?.isCompleted),
    emptyMessage,
  };
}

function formatIntakeAlarmTime(hhmm: string, nextDay: boolean): string {
  const clock = formatHhmmClock(hhmm);
  return nextDay ? `${t('dayPlan.nextDayPrefix')} ${clock}` : clock;
}

function collectIntakeMetrics(config: unknown): {
  heroLine: string;
  subLine: string;
  progressRatio: number;
  progressLabel: string;
  checklistItems: PinnedRoutineChecklistItem[];
  detailLines: string[];
  alarmLine: string;
} {
  const cfg = normalizeHealthIntakeDetailConfig(config);
  const med = cfg.medicine;
  const water = cfg.water;
  const slots: PinnedRoutineChecklistItem[] = [];
  if (med.morningOn) {
    slots.push({
      text: t('mealSlot.morning'),
      done: false,
      timeLabel: formatIntakeAlarmTime(med.morningTime, med.morningTimeNextDay),
    });
  }
  if (med.lunchOn) {
    slots.push({
      text: t('mealSlot.lunch'),
      done: false,
      timeLabel: formatIntakeAlarmTime(med.lunchTime, med.lunchTimeNextDay),
    });
  }
  if (med.dinnerOn) {
    slots.push({
      text: t('mealSlot.dinner'),
      done: false,
      timeLabel: formatIntakeAlarmTime(med.dinnerTime, med.dinnerTimeNextDay),
    });
  }

  const total = slots.length;
  const taken = total === 0 ? 0 : Math.max(0, Math.min(total, med.takenCount));
  const checklistItems = slots.map((slot, index) => ({
    ...slot,
    done: index < taken,
  }));
  const remain = Math.max(0, total - taken);
  const progressRatio = total > 0 ? taken / total : 0;
  const doseLabel = med.doseLabel.trim();
  const waterAlarmClocks = water.reminderTimes.map((hhmm) => formatHhmmClock(hhmm)).filter(Boolean);
  const alarmLine =
    waterAlarmClocks.length > 0
      ? t('widgetSettings.pinned.intakeAlarms', { times: waterAlarmClocks.join(' · ') })
      : '';

  if (total === 0) {
    return {
      heroLine: t('widgetSettings.pinned.intakeNoSlots'),
      subLine: doseLabel || alarmLine || t('session.medicine.addSlotsHint'),
      progressRatio: 0,
      progressLabel: '',
      checklistItems: [],
      detailLines: [doseLabel || t('session.medicine.addSlotsHint'), alarmLine].filter(Boolean),
      alarmLine,
    };
  }

  const doneToday = taken >= total;
  return {
    heroLine: t('widgetSettings.pinned.intakeHero', { taken, total }),
    subLine: doseLabel
      ? doseLabel
      : doneToday
        ? t('session.healthIntake.todayDone')
        : t('widgetSettings.pinned.intakeRemain', { remain }),
    progressRatio,
    progressLabel: doneToday
      ? t('widgetSettings.pinned.intakeDone')
      : t('widgetSettings.pinned.intakeRemain', { remain }),
    checklistItems,
    detailLines: [
      doseLabel,
      doneToday
        ? t('session.healthIntake.todayDone')
        : t('widgetSettings.pinned.intakeRemain', { remain }),
      alarmLine,
    ].filter(Boolean),
    alarmLine,
  };
}

function collectWeightMetrics(config: unknown): {
  heroLine: string;
  subLine: string;
  progressRatio: number;
  sparkWeights: number[];
  progressLabel: string;
} {
  const cfg = normalizeFastingDetailConfig(config);
  const currentKg = latestWeightFromLogs(cfg.weightLogs, cfg.currentWeightKg);
  const targetKg = cfg.targetWeightKg;
  const weeklyKg = cfg.weeklyLossTargetKg;
  const deltaKg = weightDeltaToTarget(currentKg, targetKg);
  const achieved = weightGoalAchieved(currentKg, targetKg);
  const progressRatio = achieved
    ? 1
    : Object.keys(cfg.weightLogs).length > 0
      ? weightProgressRatioFromLogs(cfg.weightLogs, targetKg, cfg.currentWeightKg)
      : weeklyKg > 0
        ? Math.min(0.95, weeklyKg / Math.max(0.1, deltaKg))
        : 0;

  const heroLine = achieved
    ? t('goalDetail.fasting.goalAchieved')
    : t('widgetSettings.pinned.weightHero', {
        current: currentKg.toFixed(1),
        target: targetKg.toFixed(1),
      });

  const subLine = achieved
    ? t('goalDetail.fasting.weeklyMaintain', { kg: weeklyKg.toFixed(1) })
    : t('goalDetail.fasting.goalDelta', {
        delta: deltaKg.toFixed(1),
        weekly: weeklyKg.toFixed(1),
      });

  // medium·large 위젯 그래프용 — 최근 14개 (1개면 평탄선용으로 복제)
  const series = buildWeightChartSeries(cfg.weightLogs, 14).map((p) => p.weightKg);
  const sparkWeights =
    series.length >= 2
      ? series
      : series.length === 1
        ? [series[0]!, series[0]!]
        : currentKg > 0
          ? [currentKg, currentKg]
          : [];

  return {
    heroLine,
    subLine,
    progressRatio,
    sparkWeights,
    progressLabel: achieved
      ? t('widgetSettings.pinned.weightDone')
      : t('widgetSettings.pinned.weightRemain', { delta: deltaKg.toFixed(1) }),
  };
}

export function buildPinnedRoutineWidgetPayload(
  categoryKeyInput: string | null = loadPinnedRoutineCategoryKey(),
  options?: { isCompleted?: boolean },
): PinnedRoutineWidgetPayload {
  const emptyMessage = t('widgetSettings.pinned.emptyMessageConfigure');
  const categoryKey =
    typeof categoryKeyInput === 'string' && categoryKeyInput.trim()
      ? resolvePriorityRoutineCategoryKey(categoryKeyInput.trim())
      : null;

  if (!categoryKey) {
    return emptyPayload(emptyMessage);
  }

  const config = loadGoalDetailCategoryConfig(categoryKey);
  const base = buildPinnedBase(categoryKey, emptyMessage, options);
  const templateKey = resolveCustomFlowTemplateKey(config);

  if (isWeightTemplate(categoryKey, config)) {
    const weight = collectWeightMetrics(config);
    return {
      ...base,
      detailLines: [weight.subLine].filter(Boolean).slice(0, 3),
      checklistItems: [],
      progressLabel: weight.progressLabel,
      metricKind: 'weight',
      progressRatio: weight.progressRatio,
      heroLine: weight.heroLine,
      subLine: weight.subLine,
      alarmLine: '',
      sparkWeights: weight.sparkWeights,
    };
  }

  if (isIntakeTemplate(categoryKey, config)) {
    const intake = collectIntakeMetrics(config);
    return {
      ...base,
      detailLines: intake.detailLines.slice(0, 3),
      checklistItems: intake.checklistItems,
      progressLabel: intake.progressLabel,
      metricKind: 'intake',
      progressRatio: intake.progressRatio,
      heroLine: intake.heroLine,
      subLine: intake.subLine,
      alarmLine: intake.alarmLine,
      sparkWeights: [],
    };
  }

  switch (templateKey) {
    case 'counter':
      return heroPayload(base, collectCounterMetrics(config));
    case 'habit':
      return heroPayload(base, collectHabitMetrics(config));
    case 'focus':
      return heroPayload(base, collectFocusMetrics(config));
    case 'measurement':
      return heroPayload(base, collectMeasurementMetrics(config));
    case 'reminder': {
      const reminder = collectReminderMetrics(config);
      return {
        ...base,
        detailLines: reminder.detailLines.slice(0, 3),
        checklistItems: reminder.checklistItems.slice(0, 8),
        progressLabel: reminder.progressLabel,
        metricKind: 'intake',
        progressRatio: reminder.progressRatio,
        heroLine: reminder.heroLine,
        subLine: reminder.subLine,
        alarmLine: reminder.alarmLine,
        sparkWeights: [],
      };
    }
    case 'journal': {
      const detailLines = collectJournalDetailLines(config);
      return {
        ...base,
        detailLines: detailLines.slice(0, 3),
        checklistItems: [],
        progressLabel: '',
        metricKind: 'reading',
        progressRatio: 0,
        heroLine: '',
        subLine: '',
        alarmLine: '',
        sparkWeights: [],
      };
    }
    case 'memo': {
      const detailLines = collectMemoDetailLines(config);
      return {
        ...base,
        detailLines: detailLines.slice(0, 3),
        checklistItems: [],
        progressLabel: '',
        metricKind: 'reading',
        progressRatio: 0,
        heroLine: '',
        subLine: '',
        alarmLine: '',
        sparkWeights: [],
      };
    }
    default:
      break;
  }

  const checklistItems = collectChecklistItems(config);
  const doneCount = checklistItems.filter((item) => item.done).length;
  const progressLabel =
    checklistItems.length > 0
      ? t('widgetSettings.pinned.checklistProgress', {
          done: doneCount,
          total: checklistItems.length,
        })
      : '';

  const readingLines = collectReadingDetailLines(config);
  const detailLines: string[] = [];
  for (const line of readingLines) {
    if (!detailLines.includes(line)) detailLines.push(line);
  }
  if (checklistItems.length === 0 && detailLines.length === 0) {
    // checklist/abstain 등 — 항목이 비어도 빈 화면이 되지 않게
    detailLines.push(t('widgetSettings.pinned.checklistEmpty'));
  }

  const metricKind: PinnedRoutineMetricKind =
    checklistItems.length > 0 ? 'checklist' : detailLines.length > 0 ? 'reading' : 'none';

  return {
    ...base,
    detailLines: detailLines.slice(0, 3),
    checklistItems: checklistItems.slice(0, 8),
    progressLabel,
    metricKind,
    progressRatio:
      checklistItems.length > 0 ? doneCount / Math.max(1, checklistItems.length) : 0,
    heroLine: '',
    subLine: '',
    alarmLine: '',
    sparkWeights: [],
  };
}
