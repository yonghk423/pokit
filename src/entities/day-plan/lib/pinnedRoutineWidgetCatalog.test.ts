import { listPinnedRoutineWidgetCandidates } from './pinnedRoutineWidgetCatalog';
import { loadDayPlanDraft } from '@shared/lib/storage/dayPlanDraftStorage';

jest.mock('@shared/lib/storage', () => ({
  listAllCustomFlowCatalogEntries: () => [{ id: 'custom-flow:one' }],
  loadGoalDetailCategoryConfig: () => ({}),
  loadHiddenStandardCatalogKeys: () => [],
}));
jest.mock('@shared/lib/storage/dayPlanDraftStorage', () => ({ loadDayPlanDraft: jest.fn() }));
jest.mock('./categoryCatalogAppearance', () => ({ resolveCategoryCatalogIcon: () => 'checklist' }));
jest.mock('./routineDisplayName', () => ({ readRoutineDisplayNameFromConfig: () => '' }));
jest.mock('./customFlowDisplayLabel', () => ({ resolveCustomFlowDisplayLabel: (key: string) => key }));
jest.mock('./priorityCatalogPickerLabels', () => ({ resolveStandardCatalogDisplayLabel: (key: string) => key }));
jest.mock('./priorityCatalogRegistry', () => ({ getPriorityCatalogStandardKeys: () => ['todoList', 'reading'] }));

it('does not offer default templates or unused custom tasks before a task is added', () => {
  (loadDayPlanDraft as jest.Mock).mockReturnValue(null);
  expect(listPinnedRoutineWidgetCandidates()).toEqual([]);
  (loadDayPlanDraft as jest.Mock).mockReturnValue({ priorityCategoryOrder: [] });
  expect(listPinnedRoutineWidgetCandidates()).toEqual([]);
});
it('offers only added tasks and resolves repeated task instance keys', () => {
  (loadDayPlanDraft as jest.Mock).mockReturnValue({ priorityCategoryOrder: ['todoList::instance:one'] });
  expect(listPinnedRoutineWidgetCandidates().map(row => row.key)).toEqual(['todoList']);
});
