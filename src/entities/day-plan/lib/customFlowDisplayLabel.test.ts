import { getBuiltinFlowDefaultLabel, getBuiltinFlowKoDefaultLabel } from '@shared/lib/i18n/lib/builtinFlowLabels';
import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { resolveCustomFlowCategoryLabelKo, resolveCustomFlowDisplayLabel } from './customFlowDisplayLabel';
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
    useAppLocaleStore.setState({ locale: 'ko' });
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

  it('localizes builtin Korean default names when locale is en', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    const bedId = 'customFlow:preset_daily_bed';
    const koName = getBuiltinFlowKoDefaultLabel(bedId);
    expect(koName).toBeTruthy();
    mockLoadGoalDetailCategoryConfig.mockReturnValue({ displayName: koName });
    expect(resolveCustomFlowCategoryLabelKo(bedId)).toBe(getBuiltinFlowDefaultLabel(bedId, 'en'));
  });
});

describe('resolveCustomFlowDisplayLabel', () => {
  beforeEach(() => {
    useAppLocaleStore.setState({ locale: 'en' });
  });

  it('maps stored English builtin default back to Korean when locale is ko', () => {
    useAppLocaleStore.setState({ locale: 'ko' });
    const cleanId = 'customFlow:preset_daily_clean';
    expect(
      resolveCustomFlowDisplayLabel(cleanId, getBuiltinFlowDefaultLabel(cleanId, 'en')!),
    ).toBe(getBuiltinFlowDefaultLabel(cleanId, 'ko'));
  });

  it('localizes the tutorial routine default name', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(
      resolveCustomFlowDisplayLabel('customFlow:preset_pokit_week_tour', '포킷 빠르게 둘러보기'),
    ).toBe('Try POKIT quickly');
    useAppLocaleStore.setState({ locale: 'ja' });
    expect(
      resolveCustomFlowDisplayLabel('customFlow:preset_pokit_week_tour', '포킷 빠르게 둘러보기'),
    ).toBe('POKITをさっと見てみる');
  });

  it('keeps user-custom names', () => {
    expect(resolveCustomFlowDisplayLabel('customFlow:preset_daily_bed', 'My morning reset')).toBe(
      'My morning reset',
    );
  });
});
