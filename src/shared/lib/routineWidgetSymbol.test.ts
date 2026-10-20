import { CUSTOM_FLOW_ICON_OPTIONS } from './customFlowAppearanceCatalog';
import { toRoutineWidgetSymbol } from './routineWidgetSymbol';
import { SF_SYMBOL_ICON_OPTIONS } from './sfSymbolIconOptions.generated';

describe('routine widget symbols', () => {
  it('exports supported system symbols instead of illustration IDs for every icon', () => {
    const supported = new Set<string>(SF_SYMBOL_ICON_OPTIONS);
    for (const icon of CUSTOM_FLOW_ICON_OPTIONS) {
      expect(supported.has(toRoutineWidgetSymbol(icon))).toBe(true);
    }
    expect(toRoutineWidgetSymbol('routine:water')).toBe('drop.fill');
    expect(toRoutineWidgetSymbol('routine:music')).toBe('headphones');
  });

  it('keeps existing symbol names and handles unknown illustration IDs', () => {
    expect(toRoutineWidgetSymbol('book.closed.fill')).toBe('book.closed.fill');
    expect(toRoutineWidgetSymbol('routine:future')).toBe('square.grid.2x2');
  });
});
