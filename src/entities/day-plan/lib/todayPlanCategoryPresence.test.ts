import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanStore } from '../model/dayPlanStore';
import { useFixedFlowSetsStore } from '../model/fixedFlowSetsStore';
import { getLocalDateKey } from './localDateKey';
import {
  addCategoryToTodayRoutine,
  isCategoryOnTodayPlan,
  listTodayPlanCategoryKeys,
} from './todayPlanCategoryPresence';

describe('todayPlanCategoryPresence', () => {
  beforeEach(() => {
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      priorityCategoryOrder: [],
      prioritySectionsCategoryOrder: [],
      priorityEndedTodayKeys: [],
      priorityEndedTodayDateKey: '',
    });
    useDayPlanStore.setState({
      ...useDayPlanStore.getState(),
      blocks: [],
    });
    useFixedFlowSetsStore.setState({
      ...useFixedFlowSetsStore.getState(),
      todayAppliedCategoryKeys: [],
    });
  });

  it('detects bag items as on today', () => {
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      priorityCategoryOrder: ['healthIntake'],
    });
    expect(isCategoryOnTodayPlan('healthIntake')).toBe(true);
    expect(isCategoryOnTodayPlan('fasting')).toBe(false);
  });

  it('does not treat an ended applied category as still on today', () => {
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      priorityEndedTodayKeys: ['healthIntake'],
      priorityEndedTodayDateKey: getLocalDateKey(),
    });
    useFixedFlowSetsStore.setState({
      ...useFixedFlowSetsStore.getState(),
      todayAppliedCategoryKeys: ['healthIntake'],
    });
    expect(isCategoryOnTodayPlan('healthIntake')).toBe(false);
  });

  it('adds a missing category to today bag', () => {
    expect(addCategoryToTodayRoutine('healthIntake')).toBe(true);
    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).toContain('healthIntake');
    expect(isCategoryOnTodayPlan('healthIntake')).toBe(true);
    expect(listTodayPlanCategoryKeys()).toContain('healthIntake');
  });
});
