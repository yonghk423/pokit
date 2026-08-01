import type { DayMealSlot } from '@shared/lib/storage';

/** 새벽·아침·점심·저녁·밤 구간 배지용 SF Symbol */
export const DAY_MEAL_SLOT_ICON: Record<DayMealSlot, string> = {
  dawn: 'moon.stars.fill',
  morning: 'sun.horizon.fill',
  lunch: 'sun.max.fill',
  dinner: 'sunset.fill',
  night: 'moon.fill',
};

/**
 * 구간 아이콘 의미색 — 달=노랑, 해=골든/석양 등.
 * 라벨 텍스트는 잉크색을 유지하고 아이콘만 이 색을 쓴다.
 */
const DAY_MEAL_SLOT_ICON_COLOR_LIGHT: Record<DayMealSlot, string> = {
  dawn: '#F5C518',
  morning: '#F59E0B',
  lunch: '#E8A317',
  dinner: '#E86A33',
  night: '#D4A017',
};

const DAY_MEAL_SLOT_ICON_COLOR_DARK: Record<DayMealSlot, string> = {
  dawn: '#FFD54A',
  morning: '#FFB020',
  lunch: '#FFCC33',
  dinner: '#FF8A4C',
  night: '#E8C547',
};

export function dayMealSlotIconColor(slot: DayMealSlot, isDark = false): string {
  return (isDark ? DAY_MEAL_SLOT_ICON_COLOR_DARK : DAY_MEAL_SLOT_ICON_COLOR_LIGHT)[slot];
}

/** 「오늘의 주야」 헤더 아이콘 */
export const DAY_NIGHT_HEADER_ICON = 'sun.and.horizon.fill';
export const DAY_NIGHT_HEADER_MOON_ICON = 'moon.fill';
