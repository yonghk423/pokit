jest.mock('./localDateKey', () => ({
  getLocalDateKey: () => '2026-09-18',
  addDaysToLocalDateKey: jest.requireActual('./localDateKey').addDaysToLocalDateKey,
}));

import {
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  clearPokitWeekTourSeeded,
  markDailyRhythmOnboardingCompleted,
  markPokitWeekTourSeeded,
} from '@shared/lib/storage';

import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { seedPokitWeekTourIntoTodayIfNeeded } from './seedPokitWeekTourIntoToday';

describe('seedPokitWeekTourIntoTodayIfNeeded', () => {
  beforeEach(() => {
    clearPokitWeekTourSeeded();
    markDailyRhythmOnboardingCompleted();
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      isHydrated: true,
      planMode: 'priority',
      priorityStart: '06:30',
      priorityEnd: '00:00',
      priorityPlanDateKey: '2026-09-18',
      priorityPlanDateKeyEnd: '2026-09-19',
      priorityPlanExplicitMultiDay: true,
      priorityOvernightEndAuto: true,
      priorityCategoryOrder: [],
      priorityEndedTodayKeys: [],
      priorityEndedTodayDateKey: '',
    });
  });

  it('does not put the tutorial back after the window rolled past device today', () => {
    markPokitWeekTourSeeded('2026-09-18');
    useDayPlanDraftStore.setState({
      priorityPlanDateKey: '2026-09-19',
      priorityPlanDateKeyEnd: '2026-09-20',
      priorityCategoryOrder: [],
    });
    seedPokitWeekTourIntoTodayIfNeeded();
    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).not.toContain(
      BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
    );
  });

  it('drops leftover tutorial when dates already rolled past device today', () => {
    markPokitWeekTourSeeded('2026-09-18');
    useDayPlanDraftStore.setState({
      priorityPlanDateKey: '2026-09-19',
      priorityPlanDateKeyEnd: '2026-09-20',
      priorityCategoryOrder: [BUILTIN_POKIT_WEEK_TOUR_FLOW_ID],
    });
    seedPokitWeekTourIntoTodayIfNeeded();
    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).toEqual([]);
  });

  it('does not restore the tutorial on a later calendar day', () => {
    markPokitWeekTourSeeded('2026-09-17');
    seedPokitWeekTourIntoTodayIfNeeded();
    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).not.toContain(
      BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
    );
  });
});
