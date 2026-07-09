import { categoryReminderLabelKo } from '@entities/day-plan';

import { resolveTopCategoryLabels } from './resolveTopCategoryLabels';

describe('resolveTopCategoryLabels', () => {
  it('returns empty array when no categories', () => {
    expect(resolveTopCategoryLabels(new Map())).toEqual([]);
  });

  it('returns all categories tied at the maximum count', () => {
    const labels = resolveTopCategoryLabels(
      new Map([
        ['water', 3],
        ['medicine', 3],
        ['fasting', 3],
        ['reading', 1],
      ]),
    );

    expect(labels).toEqual(
      [
        categoryReminderLabelKo('water'),
        categoryReminderLabelKo('medicine'),
        categoryReminderLabelKo('fasting'),
      ].sort((a, b) => a.localeCompare(b, 'ko')),
    );
  });

  it('returns single label when one category leads', () => {
    expect(
      resolveTopCategoryLabels(
        new Map([
          ['reading', 5],
          ['water', 2],
        ]),
      ),
    ).toEqual([categoryReminderLabelKo('reading')]);
  });
});
