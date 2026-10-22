import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { RoutineSummaryField } from '@pages/goal-detail-settings/ui/category/lib/RoutineSummaryField';
import { loadGoalDetailCategoryConfig, saveGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';
import { PriorityBagRowAccordionPanel } from './PriorityBagRowAccordionPanel';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock('../model/dayPlanTabBridge', () => ({ useDayPlanTabBridge: () => ({ isDayPlanFocused: false }) }));
jest.mock('@pages/goal-detail-settings/ui/category', () => ({ resolveGoalDetailModuleForTarget: () => ({ Settings: () => null, getInitialDataConfig: () => ({}) }) }));
jest.mock('@pages/goal-detail-settings/ui/category/lib/RoutineSummaryField', () => ({ RoutineSummaryField: () => null }));
jest.mock('@shared/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@shared/ui/pencil-checkbox', () => ({ PencilCheckbox: () => null }));
jest.mock('@shared/ui/paper-action-icon', () => ({ PaperActionIcon: () => null }));
jest.mock('./PokitWeekTourLayoutNudgeSheet', () => ({ PokitWeekTourLayoutNudgeSheet: () => null }));
jest.mock('./PokitWeekTourPuzzleNudgeSheet', () => ({ PokitWeekTourPuzzleNudgeSheet: () => null }));
jest.mock('./PokitWeekTourTipSheet', () => ({ PokitWeekTourTipSheet: () => null }));
jest.mock('./PokitWeekTourWidgetNudgeSheet', () => ({ PokitWeekTourWidgetNudgeSheet: () => null }));

it('saves the last summary edit when closing before debounce, preserving later task changes', () => {
  jest.useFakeTimers();
  const original = { templateKey: 'checklist', summary: 'Before', checklist: [{ id: 'task', text: 'Water', done: false }] };
  saveGoalDetailCategoryConfig('other', original);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<PriorityBagRowAccordionPanel categoryKey="other" label="Checklist" ink="#222" muted="#777" isDark={false} />); });
  act(() => { tree.root.findByType(RoutineSummaryField).props.onChangeValue('After'); });
  act(() => { saveGoalDetailCategoryConfig('other', { ...original, checklist: [{ id: 'task', text: 'Water', done: true }] }); });
  act(() => tree.unmount());
  expect(loadGoalDetailCategoryConfig('other')).toMatchObject({ summary: 'After', checklist: [{ id: 'task', done: true }] });
  act(() => jest.runOnlyPendingTimers());
  expect(loadGoalDetailCategoryConfig('other')).toMatchObject({ summary: 'After', checklist: [{ id: 'task', done: true }] });
  jest.useRealTimers();
});
