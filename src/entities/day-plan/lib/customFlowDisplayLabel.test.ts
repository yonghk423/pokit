import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { resolveCustomFlowCategoryLabelKo } from './customFlowDisplayLabel';
import { CUSTOM_FLOW_CATEGORY_PREFIX } from './customFlowCategoryKey';

jest.mock('@shared/lib/storage', () => ({
  loadGoalDetailCategoryConfig: jest.fn(),
  DEFAULT_BUILTIN_CUSTOM_FLOWS: [],
}));

const mockLoadGoalDetailCategoryConfig = loadGoalDetailCategoryConfig as jest.MockedFunction<
  typeof loadGoalDetailCategoryConfig
>;

describe('resolveCustomFlowCategoryLabelKo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadGoalDetailCategoryConfig.mockReturnValue(null);
  });

  it('returns saved display name from goal detail config', () => {
    mockLoadGoalDetailCategoryConfig.mockReturnValue({ displayName: '아침 스트레칭' });
    expect(resolveCustomFlowCategoryLabelKo(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcdefgh`)).toBe(
      '아침 스트레칭',
    );
  });

  it('falls back to generic label when display name is empty', () => {
    mockLoadGoalDetailCategoryConfig.mockReturnValue({ displayName: '' });
    expect(resolveCustomFlowCategoryLabelKo(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcd1234`)).toBe('루틴');
  });
});
