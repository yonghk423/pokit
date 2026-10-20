import type { CustomFlowIconCategoryId } from './customFlowIconCategories';
import { getRoutineIllustration } from './routineIllustrationCatalog';

const CATEGORY_SYMBOLS: Partial<Record<CustomFlowIconCategoryId, string>> = {
  exercise: 'figure.run', study: 'book.closed.fill', health: 'heart.fill',
  food: 'fork.knife', tools: 'wrench.fill', travel: 'bag.fill',
  nature: 'leaf.fill', people: 'person.2.fill', rest: 'moon.fill',
  creative: 'paintpalette.fill', life: 'house.fill',
};
const SPECIFIC_SYMBOLS: Record<string, string> = {
  'routine:abstain': 'hand.raised.fill',
  'routine:weight': 'scalemass.fill',
  'routine:stretching': 'figure.flexibility',
  'routine:running': 'figure.run',
  'routine:planning': 'pencil.and.list.clipboard',
  'routine:exercise': 'dumbbell.fill', 'routine:reading': 'book.closed.fill',
  'routine:water': 'drop.fill', 'routine:medicine': 'pills.fill',
  'routine:work': 'laptopcomputer', 'routine:cleaning': 'sparkles',
  'routine:music': 'headphones', 'routine:journal': 'square.and.pencil',
};

/** SwiftUI widgets accept system symbol names; illustration IDs stay inside the app. */
export function toRoutineWidgetSymbol(icon: string): string {
  if (!icon.startsWith('routine:')) return icon;
  const illustration = getRoutineIllustration(icon);
  return SPECIFIC_SYMBOLS[icon] ??
    (illustration ? CATEGORY_SYMBOLS[illustration.category] : undefined) ?? 'square.grid.2x2';
}
