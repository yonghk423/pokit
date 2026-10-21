/** Reading opens the original auto-saving library instead of the routine settings editor. */
export function catalogCategoryDestination(categoryKey: string) {
  if (categoryKey === 'reading') return { pathname: '/reading-library' as const };
  return { pathname: '/goal-detail-settings' as const, params: { categoryKey } };
}
