import { Alert } from 'react-native';

import {
  addDaysToLocalDateKey,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { formatTimelineHeaderDate, getAppLocale } from '@shared/lib/i18n';
import {
  advanceDevClockToNextLocalMorning,
  clearDevClock,
} from '@shared/lib/time/appClock';

export type OvernightWindowSeedResult = {
  today: string;
  tomorrow: string;
  start: string;
  end: string;
};

/** __DEV__: 앱 오늘 06:30 ~ 내일 00:00 */
export function seedOvernightWindowTodayToTomorrow(): OvernightWindowSeedResult {
  const today = getLocalDateKey();
  const tomorrow = addDaysToLocalDateKey(today, 1);
  const start = '06:30';
  const end = '00:00';
  const bag = useDayPlanDraftStore.getState().priorityCategoryOrder;
  useDayPlanDraftStore.setState({
    planMode: 'priority',
    priorityStart: start,
    priorityEnd: end,
    priorityPlanDateKey: today,
    priorityPlanDateKeyEnd: tomorrow,
    priorityPlanExplicitMultiDay: true,
    priorityOvernightEndAuto: true,
    priorityBagResetForEndedKey: '',
    priorityCategoryOrder: bag.length > 0 ? bag : ['fasting'],
    isFocusStarted: true,
  });
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
  return { today, tomorrow, start, end };
}

/**
 * 앱이 보는 오늘을 다음날 오전 8시로 옮긴 뒤, 끝난 구간이면 롤오버.
 * 헤더 큰 날짜(금요일 9월 18일 → 토요일 9월 19일)가 이 시계를 따른다.
 */
export function rollOvernightWindowAsEndDateMorning(): {
  before: { startDate: string; endDate: string; todayKey: string };
  after: { startDate: string; endDate: string; todayKey: string };
} {
  const s = useDayPlanDraftStore.getState();
  const before = {
    startDate: s.priorityPlanDateKey,
    endDate: s.priorityPlanDateKeyEnd,
    todayKey: getLocalDateKey(),
  };
  const nextMorning = advanceDevClockToNextLocalMorning();
  const todayKey = getLocalDateKey(nextMorning);
  useDayPlanDraftStore.getState().rollPriorityPlanForwardIfEnded({
    nowKey: todayKey,
    nowMin: getLocalMinutesOfDayNow(nextMorning),
  });
  const next = useDayPlanDraftStore.getState();
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
  return {
    before,
    after: {
      startDate: next.priorityPlanDateKey,
      endDate: next.priorityPlanDateKeyEnd,
      todayKey,
    },
  };
}

export function resetDevAppClockToDeviceNow(): string {
  clearDevClock();
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
  return getLocalDateKey();
}

export function alertOvernightSeedResult(seeded: OvernightWindowSeedResult): void {
  const locale = getAppLocale();
  Alert.alert(
    '시드 완료',
    `앱 오늘 ${formatTimelineHeaderDate(seeded.today, locale)}\n구간: ${seeded.today} ${seeded.start} → ${seeded.tomorrow} ${seeded.end}\n이어서 Dev 메뉴 「[Time] 다음날로 넘기기」를 누르세요.`,
  );
}

export function alertOvernightRollResult(
  result: ReturnType<typeof rollOvernightWindowAsEndDateMorning>,
): void {
  const locale = getAppLocale();
  Alert.alert(
    '다음날로 넘김',
    `상단: ${formatTimelineHeaderDate(result.before.todayKey, locale)} → ${formatTimelineHeaderDate(result.after.todayKey, locale)}\n구간 ${result.before.startDate} → ${result.before.endDate}\n    ${result.after.startDate} → ${result.after.endDate}\n큰 날짜가 다음 요일로 바뀌어야 합니다.`,
  );
}

export function alertDevClockReset(todayKey: string): void {
  Alert.alert(
    '시계 되돌림',
    `기기 오늘로 돌아갔습니다.\n상단: ${formatTimelineHeaderDate(todayKey, getAppLocale())}`,
  );
}
