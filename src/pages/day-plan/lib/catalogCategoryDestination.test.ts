import { catalogCategoryDestination } from './catalogCategoryDestination';
it('opens the original library for reading while retaining routine settings for other categories', () => {
  expect(catalogCategoryDestination('reading')).toEqual({ pathname: '/reading-library' });
  for (const categoryKey of ['healthIntake', 'fasting', 'customFlow:user']) {
    expect(catalogCategoryDestination(categoryKey)).toEqual({ pathname: '/goal-detail-settings', params: { categoryKey } });
  }
});
