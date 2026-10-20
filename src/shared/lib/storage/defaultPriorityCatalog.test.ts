import {
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_FOCUS_FLOW_ID,
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
    expect(resolveCustomFlowCatalogColor(BUILTIN_GOOD_POSTURE_FLOW_ID)).toBe('#ffffff');
  });

  it('returns builtin icon for stretching preset', () => {
    expect(resolveCustomFlowCatalogIcon(BUILTIN_STRETCHING_FLOW_ID)).toBe('routine:stretching');
    expect(resolveCustomFlowCatalogColor(BUILTIN_STRETCHING_FLOW_ID)).toBe('#ffffff');
  });

  it('returns legacy icon metadata for removed focus preset', () => {
    expect(resolveCustomFlowCatalogIcon(BUILTIN_FOCUS_FLOW_ID)).toBe('brain.head.profile');
    expect(resolveCustomFlowCatalogColor(BUILTIN_FOCUS_FLOW_ID)).toBe('#ffffff');
  });

  it('returns hand.raised.fill for abstain preset (picker-compatible icon)', () => {
    expect(resolveCustomFlowCatalogIcon(BUILTIN_ABSTAIN_FLOW_ID)).toBe('routine:abstain');
    expect(resolveCustomFlowCatalogColor(BUILTIN_ABSTAIN_FLOW_ID)).toBe('#ffffff');
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
  it('starts every preset and unknown routine without an accent', () => {
    for (const id of ['customFlow:builtin_hobby_draw', 'customFlow:builtin_family_call', 'customFlow:builtin_mind_detox', BUILTIN_ABSTAIN_FLOW_ID, BUILTIN_STRETCHING_FLOW_ID]) {
      expect(resolveCustomFlowCatalogColor(id)).toBe('#ffffff');
    }
  });

  it('falls back to uncolored default for unknown custom flows', () => {
    expect(resolveCustomFlowCatalogColor('customFlow:user-made-01')).toBe(DEFAULT_CUSTOM_FLOW_COLOR);
  });
});


it('replaces saved system symbols for active presets and preserves new illustration choices', () => {
  for (const id of [BUILTIN_ABSTAIN_FLOW_ID, BUILTIN_STRETCHING_FLOW_ID]) {
    saveGoalDetailCategoryConfig(id, { displayName: '루틴', summary: '', icon: 'star.fill' });
    expect(resolveCustomFlowCatalogIcon(id)).toBe(id === BUILTIN_ABSTAIN_FLOW_ID ? 'routine:abstain' : 'routine:stretching');
    saveGoalDetailCategoryConfig(id, { displayName: '루틴', summary: '', icon: 'routine:camera' });
    expect(resolveCustomFlowCatalogIcon(id)).toBe('routine:camera');
  }
});
