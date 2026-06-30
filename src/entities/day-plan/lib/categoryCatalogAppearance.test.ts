import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { saveGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import {
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon,
} from './categoryCatalogAppearance';

beforeEach(() => {
  localStorageClient.removeItem(StorageKeys.goalDetailSettings);
});

describe('resolveCategoryCatalogIcon', () => {
  it('returns builtin icon for standard categories', () => {
    expect(resolveCategoryCatalogIcon('neckPosture')).toBe('tortoise.fill');
  });

  it('prefers saved icon over builtin default', () => {
    saveGoalDetailCategoryConfig('neckPosture', {
      displayName: '거북목',
      summary: '',
      checklist: [],
      icon: 'star.fill',
      accentColor: '#3b82f6',
    });
    expect(resolveCategoryCatalogIcon('neckPosture')).toBe('star.fill');
    expect(resolveCategoryCatalogAccentColor('neckPosture')).toBe('#3b82f6');
  });
});
