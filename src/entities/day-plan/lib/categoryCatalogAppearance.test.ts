import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { saveGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import {
  mergeCategoryAppearanceIntoConfig,
  readEditableCategoryAppearance,
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon,
} from './categoryCatalogAppearance';

beforeEach(() => {
  localStorageClient.removeItem(StorageKeys.goalDetailSettings);
});

describe('resolveCategoryCatalogIcon', () => {
  it('returns builtin icon for standard categories', () => {
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('pills.fill');
    expect(resolveCategoryCatalogIcon('water')).toBe('drop.fill');
    expect(resolveCategoryCatalogIcon('work')).toBe('bag.fill');
  });

  it('returns builtin blue accent for water', () => {
    expect(resolveCategoryCatalogAccentColor('water')).toBe('#0ea5e9');
  });

  it('returns builtin brown accent for healthIntake', () => {
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#8b5a2b');
  });

  it('maps legacy water blue accent to brown for healthIntake', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '건강을 위한 섭취',
      summary: '',
      icon: 'pills.fill',
      accentColor: '#0ea5e9',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 0,
        takenCount: 0,
        morningOn: false,
        morningNotify: false,
        morningTime: '08:00',
        lunchOn: false,
        lunchNotify: false,
        lunchTime: '12:00',
        dinnerOn: false,
        dinnerNotify: false,
        dinnerTime: '18:00',
      },
    });
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#8b5a2b');
  });

  it('maps legacy water drop icon to pills for healthIntake', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '건강을 위한 섭취',
      summary: '',
      icon: 'drop.fill',
      accentColor: '#0ea5e9',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 0,
        takenCount: 0,
        morningOn: false,
        morningNotify: false,
        morningTime: '08:00',
        lunchOn: false,
        lunchNotify: false,
        lunchTime: '12:00',
        dinnerOn: false,
        dinnerNotify: false,
        dinnerTime: '18:00',
      },
    });
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('pills.fill');
  });

  it('maps legacy hospital icon to pills for healthIntake', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '건강을 위한 섭취',
      summary: '',
      icon: 'cross.case.fill',
      accentColor: '#0ea5e9',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 0,
        takenCount: 0,
        morningOn: false,
        morningNotify: false,
        morningTime: '08:00',
        lunchOn: false,
        lunchNotify: false,
        lunchTime: '12:00',
        dinnerOn: false,
        dinnerNotify: false,
        dinnerTime: '18:00',
      },
    });
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('pills.fill');
  });

  it('prefers saved icon over builtin default', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '건강을 위한 섭취',
      summary: '',
      icon: 'star.fill',
      accentColor: '#3b82f6',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 0,
        takenCount: 0,
        morningOn: false,
        morningNotify: false,
        morningTime: '08:00',
        lunchOn: false,
        lunchNotify: false,
        lunchTime: '12:00',
        dinnerOn: false,
        dinnerNotify: false,
        dinnerTime: '18:00',
      },
    });
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('star.fill');
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#3b82f6');
  });
});

describe('readEditableCategoryAppearance', () => {
  it('reads icon from healthIntake config without catalog legacy remap', () => {
    const cfg = {
      displayName: '수분 섭취',
      summary: '',
      icon: 'drop.fill',
      accentColor: '#0ea5e9',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 0,
        takenCount: 0,
        morningOn: false,
        morningNotify: false,
        morningTime: '08:00',
        lunchOn: false,
        lunchNotify: false,
        lunchTime: '12:00',
        dinnerOn: false,
        dinnerNotify: false,
        dinnerTime: '18:00',
      },
    };
    expect(readEditableCategoryAppearance('healthIntake', cfg)).toEqual({
      icon: 'drop.fill',
      accentColor: '#0ea5e9',
    });
  });

  it('falls back to water builtin defaults for legacy water category', () => {
    expect(readEditableCategoryAppearance('water', { displayName: '수분 섭취', summary: '' })).toEqual({
      icon: 'drop.fill',
      accentColor: '#0ea5e9',
    });
  });

  it('merges appearance without stripping healthIntake nested config', () => {
    const base = {
      displayName: '건강',
      summary: '요약',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 0,
        takenCount: 0,
        morningOn: false,
        morningNotify: false,
        morningTime: '08:00',
        lunchOn: false,
        lunchNotify: false,
        lunchTime: '12:00',
        dinnerOn: false,
        dinnerNotify: false,
        dinnerTime: '18:00',
      },
    };
    const merged = mergeCategoryAppearanceIntoConfig('healthIntake', base, {
      icon: 'drop.fill',
      accentColor: '#0ea5e9',
    }) as typeof base & { icon: string; accentColor: string };
    expect(merged.water.goalMl).toBe(2000);
    expect(merged.icon).toBe('drop.fill');
    expect(merged.accentColor).toBe('#0ea5e9');
  });
});
