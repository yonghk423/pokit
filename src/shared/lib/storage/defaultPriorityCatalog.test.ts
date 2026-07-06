import {
  BUILTIN_GOOD_POSTURE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  DEFAULT_CUSTOM_FLOW_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  resolveCustomFlowCatalogColor,
  resolveCustomFlowCatalogIcon,
} from './defaultPriorityCatalog';
import { saveGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

beforeEach(() => {
  localStorageClient.removeItem(StorageKeys.goalDetailSettings);
});

describe('resolveCustomFlowCatalogIcon', () => {
  it('returns legacy icon metadata for removed builtin custom flows', () => {
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_hobby_draw')).toBe('paintbrush.pointed.fill');
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_family_call')).toBe('phone.fill');
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_mind_nap')).toBe('moon.zzz.fill');
  });

  it('falls back to person.fill for unknown custom flows', () => {
    expect(resolveCustomFlowCatalogIcon('customFlow:user-made-01')).toBe(DEFAULT_CUSTOM_FLOW_ICON);
  });

  it('returns legacy icon metadata for removed good posture preset', () => {
    expect(resolveCustomFlowCatalogIcon(BUILTIN_GOOD_POSTURE_FLOW_ID)).toBe('figure.stand');
    expect(resolveCustomFlowCatalogColor(BUILTIN_GOOD_POSTURE_FLOW_ID)).toBe('#6366f1');
  });

  it('returns builtin icon for stretching preset', () => {
    expect(resolveCustomFlowCatalogIcon(BUILTIN_STRETCHING_FLOW_ID)).toBe('figure.flexibility');
    expect(resolveCustomFlowCatalogColor(BUILTIN_STRETCHING_FLOW_ID)).toBe('#14b8a6');
  });

  it('reads icon from saved goal-detail config for user custom flows', () => {
    const id = 'customFlow:test-user-icon';
    saveGoalDetailCategoryConfig(id, {
      displayName: '테스트',
      summary: '',
      checklist: [],
      icon: 'star.fill',
      accentColor: '#3b82f6',
    });
    expect(resolveCustomFlowCatalogIcon(id)).toBe('star.fill');
    expect(resolveCustomFlowCatalogColor(id)).toBe('#3b82f6');
  });

  it('prefers saved config over legacy builtin defaults', () => {
    saveGoalDetailCategoryConfig('customFlow:builtin_hobby_draw', {
      displayName: '드로잉',
      summary: '',
      checklist: [],
      icon: 'star.fill',
      accentColor: '#dc2626',
    });
    expect(resolveCustomFlowCatalogIcon('customFlow:builtin_hobby_draw')).toBe('star.fill');
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_hobby_draw')).toBe('#dc2626');
  });
});

describe('resolveCustomFlowCatalogColor', () => {
  it('returns distinct colors for legacy removed builtin custom flows', () => {
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_hobby_draw')).toBe('#a855f7');
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_family_call')).toBe('#3b82f6');
    expect(resolveCustomFlowCatalogColor('customFlow:builtin_mind_detox')).toBe('#22c55e');
    expect(
      new Set([
        resolveCustomFlowCatalogColor('customFlow:builtin_hobby_draw'),
        resolveCustomFlowCatalogColor('customFlow:builtin_hobby_guitar'),
        resolveCustomFlowCatalogColor('customFlow:builtin_family_call'),
      ]).size,
    ).toBe(3);
  });

  it('falls back to default orange for unknown custom flows', () => {
    expect(resolveCustomFlowCatalogColor('customFlow:user-made-01')).toBe(DEFAULT_CUSTOM_FLOW_COLOR);
  });
});
