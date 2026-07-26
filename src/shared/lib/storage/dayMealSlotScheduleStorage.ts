import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayMealSlot = 'dawn' | 'morning' | 'lunch' | 'dinner' | 'night';

export const DAY_MEAL_SLOT_ORDER: readonly DayMealSlot[] = [
  'dawn',
  'morning',
  'lunch',
  'dinner',
  'night',
];

export type DayMealSlotSchedule = Record<DayMealSlot, string>;

export const DEFAULT_DAY_MEAL_SLOT_SCHEDULE: DayMealSlotSchedule = {
  dawn: '04:00',
  morning: '06:00',
  lunch: '12:30',
  dinner: '19:00',
  night: '21:00',
};

/** 0~1439 및 하루 끝 `24:00`(1440) */
function parseHhmmToMinutes(raw: string): number | null {
  const t = raw.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h === 24 && min === 0) return 24 * 60;
  if (h > 23 || min > 59 || h < 0 || min < 0) return null;
  return h * 60 + min;
}

function formatMinutesToHhmm(minutes: number): string {
  const t = Math.max(0, Math.min(minutes, 24 * 60));
  if (t === 24 * 60) return '24:00';
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeHhmm(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const mins = parseHhmmToMinutes(raw);
  if (mins === null) return fallback;
  return formatMinutesToHhmm(mins);
}

function schedulesEqual(a: DayMealSlotSchedule, b: DayMealSlotSchedule): boolean {
  return DAY_MEAL_SLOT_ORDER.every((slot) => a[slot] === b[slot]);
}

/** 새벽 → 아침 → … → 밤 순으로 시작 시각이 증가해야 함 (`24:00` 허용) */
export function isDayMealSlotScheduleValid(schedule: DayMealSlotSchedule): boolean {
  let prev = -1;
  for (const slot of DAY_MEAL_SLOT_ORDER) {
    const mins = parseHhmmToMinutes(schedule[slot]);
    if (mins === null) return false;
    if (mins <= prev) return false;
    prev = mins;
  }
  return true;
}

export function normalizeDayMealSlotSchedule(input: unknown): DayMealSlotSchedule {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const next: DayMealSlotSchedule = {
    dawn: normalizeHhmm(raw.dawn, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.dawn),
    morning: normalizeHhmm(raw.morning, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.morning),
    lunch: normalizeHhmm(raw.lunch, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.lunch),
    dinner: normalizeHhmm(raw.dinner, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.dinner),
    night: normalizeHhmm(raw.night, DEFAULT_DAY_MEAL_SLOT_SCHEDULE.night),
  };
  if (!isDayMealSlotScheduleValid(next)) {
    return { ...DEFAULT_DAY_MEAL_SLOT_SCHEDULE };
  }
  return next;
}

export function loadDayMealSlotSchedule(): DayMealSlotSchedule {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.dayMealSlotSchedule);
  return normalizeDayMealSlotSchedule(raw);
}

export function saveDayMealSlotSchedule(next: DayMealSlotSchedule): DayMealSlotSchedule {
  const normalized = normalizeDayMealSlotSchedule(next);
  localStorageClient.setJson(StorageKeys.dayMealSlotSchedule, normalized);
  return normalized;
}

export function mealSlotStartMinutes(schedule: DayMealSlotSchedule, slot: DayMealSlot): number {
  return parseHhmmToMinutes(schedule[slot]) ?? parseHhmmToMinutes(DEFAULT_DAY_MEAL_SLOT_SCHEDULE[slot]) ?? 0;
}

/**
 * 오늘 탭 구간 보기와 동일하게, 같은 날 창의 첫·끝 구간 시작 시각을
 * 하루 시작·마무리에 맞춘 스케줄을 반환합니다.
 * (자정 넘김 창은 선형 스케줄로 표현할 수 없어 원본을 유지합니다.)
 */
export function alignDayMealSlotScheduleToPriorityWindow(
  schedule: DayMealSlotSchedule,
  priorityStart: string,
  priorityEnd: string,
  spansNextDay = false,
): DayMealSlotSchedule {
  const normalized = normalizeDayMealSlotSchedule(schedule);
  const startMin = parseHhmmToMinutes(priorityStart);
  const endMinRaw = parseHhmmToMinutes(priorityEnd);
  if (startMin === null || endMinRaw === null) return normalized;

  const overnight = spansNextDay || endMinRaw <= startMin;
  if (overnight) return normalized;

  const windowLen = endMinRaw - startMin;
  if (windowLen <= 0) return normalized;

  const mod = (n: number) => ((n % (24 * 60)) + 24 * 60) % (24 * 60);
  const withMinutes = DAY_MEAL_SLOT_ORDER.map((slot) => ({
    slot,
    start: mealSlotStartMinutes(normalized, slot),
  }));

  let activeIdx = 0;
  let bestRot = Infinity;
  withMinutes.forEach(({ start }, i) => {
    const rot = mod(startMin - start);
    if (rot < bestRot) {
      bestRot = rot;
      activeIdx = i;
    }
  });

  const firstSlot = withMinutes[activeIdx]!.slot;
  const rest = withMinutes
    .filter((_, i) => i !== activeIdx)
    .map((v) => ({ slot: v.slot, off: mod(v.start - startMin) }));
  // 하루 끝과 시작이 같은 구간(밤 24:00)도 마지막으로 포함 — 빠지면 저녁이 끝으로 덮임
  const inWindowSlots = rest
    .filter((v) => v.off > 0 && v.off <= windowLen)
    .sort((a, b) => a.off - b.off)
    .map((v) => v.slot);

  const windowSlots: DayMealSlot[] = [firstSlot, ...inWindowSlots];
  const endDisplayMin = endMinRaw;

  const tryApply = (patch: Partial<DayMealSlotSchedule>): DayMealSlotSchedule | null => {
    const next = { ...normalized, ...patch };
    return isDayMealSlotScheduleValid(next) ? next : null;
  };

  const firstHhmm = formatMinutesToHhmm(startMin);
  const endHhmm = formatMinutesToHhmm(endDisplayMin);

  if (windowSlots.length >= 2) {
    const lastSlot = windowSlots[windowSlots.length - 1]!;
    const full = tryApply({ [firstSlot]: firstHhmm, [lastSlot]: endHhmm });
    if (full) return full;
    const lastOnly = tryApply({ [lastSlot]: endHhmm });
    if (lastOnly) return lastOnly;
    const firstOnly = tryApply({ [firstSlot]: firstHhmm });
    if (firstOnly) return firstOnly;
    return normalized;
  }

  if (firstSlot === 'night' && endDisplayMin === 24 * 60) {
    return tryApply({ night: '24:00' }) ?? normalized;
  }

  return tryApply({ [firstSlot]: firstHhmm }) ?? normalized;
}

/** 로드 → 정렬 → 변경 시 저장. 호출측 훅 상태 갱신용으로 최종 스케줄을 반환합니다. */
export function syncDayMealSlotScheduleWithPriorityWindow(
  priorityStart: string,
  priorityEnd: string,
  spansNextDay = false,
): DayMealSlotSchedule {
  const current = loadDayMealSlotSchedule();
  const aligned = alignDayMealSlotScheduleToPriorityWindow(
    current,
    priorityStart,
    priorityEnd,
    spansNextDay,
  );
  if (schedulesEqual(current, aligned)) return current;
  return saveDayMealSlotSchedule(aligned);
}

/** 현재 시각(0–1439) 기준 활성 구간 — 사용자 시작 시각 기준 */
export function resolveCurrentMealSlotFromSchedule(
  nowMin: number,
  schedule: DayMealSlotSchedule = DEFAULT_DAY_MEAL_SLOT_SCHEDULE,
): DayMealSlot {
  const normalized = normalizeDayMealSlotSchedule(schedule);
  let current: DayMealSlot = 'night';
  for (const slot of DAY_MEAL_SLOT_ORDER) {
    const start = mealSlotStartMinutes(normalized, slot);
    if (start >= 24 * 60) continue;
    if (nowMin >= start) current = slot;
  }
  return current;
}

export function getMealSlotStartHhmm(
  schedule: DayMealSlotSchedule,
  slot: DayMealSlot,
): string {
  return normalizeDayMealSlotSchedule(schedule)[slot];
}

/**
 * 현재 구간 시작 → 다음 구간 시작까지 진행률(0~1).
 * 자정을 넘는 밤→새벽도 처리합니다. 밤 시작이 `24:00`이면 자정(0분)부터로 봅니다.
 */
export function mealSlotProgressTowardNext(
  nowMin: number,
  schedule: DayMealSlotSchedule,
  currentSlot: DayMealSlot,
): number {
  const normalized = normalizeDayMealSlotSchedule(schedule);
  const idx = DAY_MEAL_SLOT_ORDER.indexOf(currentSlot);
  if (idx < 0) return 0;

  let start = mealSlotStartMinutes(normalized, currentSlot);
  if (start >= 24 * 60) start = 0;
  const nextSlot = DAY_MEAL_SLOT_ORDER[idx + 1] ?? DAY_MEAL_SLOT_ORDER[0]!;
  let nextStart = mealSlotStartMinutes(normalized, nextSlot);
  if (nextStart >= 24 * 60) nextStart = 24 * 60;

  const wraps = nextStart <= start;
  const end = wraps ? nextStart + 24 * 60 : nextStart;
  let now = Math.max(0, Math.min(Math.floor(nowMin), 24 * 60 - 1));
  if (wraps && now < start) now += 24 * 60;

  const span = end - start;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (now - start) / span));
}
