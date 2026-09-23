import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';

import { useGoalDetailSettingsStore } from './goalDetailSettingsStore';

describe('goalDetailSettingsStore', () => {
  const categoryKey = 'customFlow:story:global-state-test';

  afterEach(() => {
    useGoalDetailSettingsStore.getState().removeCategoryConfig(categoryKey);
  });

  it('keeps a webview routine config in global state and persistent storage', () => {
    const config = {
      displayName: '웹뷰 루틴',
      icon: 'heart.fill',
      accentColor: '#3b82f6',
      checklist: [],
    };

    useGoalDetailSettingsStore.getState().saveCategoryConfig(categoryKey, config);

    expect(useGoalDetailSettingsStore.getState().getCategoryConfig(categoryKey)).toEqual(config);
    expect(loadGoalDetailCategoryConfig(categoryKey)).toEqual(config);
  });

  it('reflects legacy storage writes into global state immediately', () => {
    const revisionBefore = useGoalDetailSettingsStore.getState().revision;

    saveGoalDetailCategoryConfig(categoryKey, {
      icon: 'star.fill',
      accentColor: '#8b5cf6',
    });

    expect(useGoalDetailSettingsStore.getState().getCategoryConfig(categoryKey)).toEqual({
      icon: 'star.fill',
      accentColor: '#8b5cf6',
    });
    expect(useGoalDetailSettingsStore.getState().revision).toBe(revisionBefore + 1);
  });
});
