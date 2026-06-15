import {
  CATEGORY_REMINDER_KEYS,
  categoryReminderIconName,
  categoryReminderLabelKo,
} from './categoryReminderCatalog';
import { CUSTOM_FLOW_CATEGORY_PREFIX } from './customFlowCategoryKey';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

jest.mock('@shared/lib/storage', () => {
  const actual = jest.requireActual('@shared/lib/storage/defaultPriorityCatalog');
  return {
    loadGoalDetailCategoryConfig: jest.fn(),
    resolveCustomFlowCatalogIcon: actual.resolveCustomFlowCatalogIcon,
    DEFAULT_BUILTIN_CUSTOM_FLOWS: actual.DEFAULT_BUILTIN_CUSTOM_FLOWS,
  };
});

const mockLoadGoalDetailCategoryConfig = loadGoalDetailCategoryConfig as jest.MockedFunction<
  typeof loadGoalDetailCategoryConfig
>;

describe('categoryReminderCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadGoalDetailCategoryConfig.mockReturnValue(null);
  });

  it('includes core reminder keys', () => {
    expect(CATEGORY_REMINDER_KEYS).toContain('reading');
    expect(CATEGORY_REMINDER_KEYS).toContain('water');
  });

  it('returns Korean labels', () => {
    expect(categoryReminderLabelKo('reading')).toBe('독서');
    expect(categoryReminderLabelKo('unknown_key')).toBe('unknown_key');
    mockLoadGoalDetailCategoryConfig.mockReturnValue({ displayName: '내 루틴' });
    expect(
      categoryReminderLabelKo(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcdefgh`),
    ).toBe('내 루틴');
    mockLoadGoalDetailCategoryConfig.mockReturnValue(null);
    expect(categoryReminderLabelKo('customFlow:builtin_hobby_photo')).toBe('사진 촬영');
  });

  it('returns catalog icon names', () => {
    expect(categoryReminderIconName('reading')).toBe('book.fill');
    expect(categoryReminderIconName('planning')).toBe('calendar.badge.clock');
    expect(categoryReminderIconName('unknown_key')).toBe('star.fill');
    expect(categoryReminderIconName(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcdefgh`)).toBe('person.fill');
    expect(categoryReminderIconName('customFlow:builtin_hobby_photo')).toBe('camera.fill');
  });
});
