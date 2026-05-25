import {
  createCustomFlowCategoryId,
  CUSTOM_FLOW_CATEGORY_PREFIX,
  defaultCustomFlowPickerLabel,
  isCustomFlowCategoryKey,
} from './customFlowCategoryKey';

describe('customFlowCategoryKey', () => {
  it('validates custom flow keys', () => {
    expect(isCustomFlowCategoryKey('reading')).toBe(false);
    expect(isCustomFlowCategoryKey(`${CUSTOM_FLOW_CATEGORY_PREFIX}abc`)).toBe(false);
    expect(isCustomFlowCategoryKey(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcdefgh`)).toBe(true);
  });

  it('creates prefixed ids', () => {
    const id = createCustomFlowCategoryId();
    expect(id.startsWith(CUSTOM_FLOW_CATEGORY_PREFIX)).toBe(true);
    expect(isCustomFlowCategoryKey(id)).toBe(true);
  });

  it('builds picker label from key tail', () => {
    expect(defaultCustomFlowPickerLabel('reading')).toBe('플로우');
    expect(defaultCustomFlowPickerLabel(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcd1234`)).toBe(
      '플로우 abcd1234',
    );
  });
});
