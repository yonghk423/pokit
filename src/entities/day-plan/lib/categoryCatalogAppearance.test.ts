import { BUILTIN_ABSTAIN_FLOW_ID } from '@shared/lib/storage/defaultPriorityCatalog';
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
    expect(resolveCategoryCatalogIcon('fasting')).toBe('person.fill');
    expect(resolveCategoryCatalogIcon('work')).toBe('square.and.pencil');
    expect(resolveCategoryCatalogIcon('reading')).toBe('book.closed.fill');
  });

  it('returns builtin blue accent for water', () => {
    expect(resolveCategoryCatalogAccentColor('water')).toBe('#0ea5e9');
  });

  it('returns builtin brown accent for healthIntake', () => {
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#8b5a2b');
  });

  it('returns builtin teal accent for fasting (distinct from healthIntake)', () => {
    expect(resolveCategoryCatalogAccentColor('fasting')).toBe('#14b8a6');
  });

  it('maps legacy shared brown accent to teal for fasting', () => {
    saveGoalDetailCategoryConfig('fasting', {
      displayName: '체중조절',
      summary: '',
      icon: 'person.fill',
      accentColor: '#8b5a2b',
    });
    expect(resolveCategoryCatalogAccentColor('fasting')).toBe('#14b8a6');
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

  it('maps legacy open book icon to closed book for reading', () => {
    saveGoalDetailCategoryConfig('reading', {
      displayName: '독서',
      summary: '',
      icon: 'book.fill',
      books: [],
    });
    expect(resolveCategoryCatalogIcon('reading')).toBe('book.closed.fill');
  });

  it('maps legacy bag icon to square pencil for work', () => {
    saveGoalDetailCategoryConfig('work', {
      displayName: '노트',
      summary: '',
      icon: 'bag.fill',
      tasks: [],
    });
    expect(resolveCategoryCatalogIcon('work')).toBe('square.and.pencil');
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

  it('matches catalog icon for abstain preset in settings picker', () => {
    const catalogIcon = resolveCategoryCatalogIcon(BUILTIN_ABSTAIN_FLOW_ID);
    const editable = readEditableCategoryAppearance(BUILTIN_ABSTAIN_FLOW_ID, {});
    expect(editable.icon).toBe(catalogIcon);
    expect(editable.icon).toBe('hand.raised.fill');
    expect(editable.accentColor).toBe('#dc2626');
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

  it('keeps stored displayName when raw layer cleared it during appearance merge', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '영양제 섭취',
      summary: '',
      icon: 'heart.fill',
      accentColor: '#8b2b59',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 1,
        takenCount: 0,
        morningOn: true,
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
    const staleBlock = {
      displayName: '',
      summary: '',
      water: { displayName: '', summary: '', goalMl: 2000, drankMl: 0, smartNotification: false, reminderTimes: [] },
      medicine: {
        displayName: '',
        summary: '',
        doseLabel: '',
        dosesPerDay: 1,
        takenCount: 0,
        morningOn: true,
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
    const merged = mergeCategoryAppearanceIntoConfig('healthIntake', staleBlock, {
      icon: 'heart.fill',
      accentColor: '#8b2b59',
    }) as { displayName: string; icon: string };
    expect(merged.displayName).toBe('영양제 섭취');
    expect(merged.icon).toBe('heart.fill');
  });
});
