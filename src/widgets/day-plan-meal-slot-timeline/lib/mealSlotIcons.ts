import type { DayMealSlot } from '@shared/lib/storage';

/** 새벽·아침·점심·저녁·밤 구간 배지용 SF Symbol */
export const DAY_MEAL_SLOT_ICON: Record<DayMealSlot, string> = {
  dawn: 'moon.stars.fill',
  morning: 'sun.horizon.fill',
  lunch: 'sun.max.fill',
  dinner: 'sunset.fill',
  night: 'moon.fill',
};

/** 「오늘의 주야」 헤더 아이콘 */
export const DAY_NIGHT_HEADER_ICON = 'sun.and.horizon.fill';
export const DAY_NIGHT_HEADER_MOON_ICON = 'moon.fill';
