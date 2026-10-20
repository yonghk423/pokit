import { BUILTIN_ABSTAIN_FLOW_ID } from '@shared/lib/storage/defaultPriorityCatalog';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { saveGoalDetailCategoryConfig } from '@shared/lib/storage/goalDetailSettingsStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { useGoalDetailSettingsStore } from '../model/goalDetailSettingsStore';
import {
  mergeCategoryAppearanceIntoConfig,
  readEditableCategoryAppearance,
  resolveCategoryCatalogAccentColor,
  resolveCategoryCatalogIcon,
  resolveCategoryCatalogIconTile,
} from './categoryCatalogAppearance';

beforeEach(() => {
  localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  useGoalDetailSettingsStore.setState({ byCategory: {}, revision: 0 });
});

describe('resolveCategoryCatalogIcon', () => {
  it('persists proprietary icons through builtin and custom routine readers', () => {
    for (const key of ['water', 'customFlow:artwork']) {
      const config = mergeCategoryAppearanceIntoConfig(key, { displayName: '내 루틴', summary: '' }, {
        icon: 'routine:music', accentColor: '#ffc078',
      });
      saveGoalDetailCategoryConfig(key, config);
      expect(resolveCategoryCatalogIcon(key)).toBe('routine:music');
      expect(readEditableCategoryAppearance(key, config).icon).toBe('routine:music');
    }
  });

  it('returns builtin icon for standard categories', () => {
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('routine:medicine');
    expect(resolveCategoryCatalogIcon('water')).toBe('routine:water');
    expect(resolveCategoryCatalogIcon('fasting')).toBe('routine:weight');
    expect(resolveCategoryCatalogIcon('work')).toBe('routine:work');
    expect(resolveCategoryCatalogIcon('reading')).toBe('routine:reading');
  });

  it('returns uncolored accent for water', () => {
    expect(resolveCategoryCatalogAccentColor('water')).toBe('#ffffff');
  });

  it('returns uncolored accent for healthIntake', () => {
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#ffffff');
  });

  it('renders uncolored initial icon tiles with no background', () => {
    for (const category of ['healthIntake', 'water', 'fasting', 'reading', 'work']) {
      expect(resolveCategoryCatalogIconTile(category)).toEqual({ boxBg: 'transparent', iconColor: '#252525' });
    }
  });

  it('ignores stored icon colors on builtin and custom routines in both themes', () => {
    for (const category of ['water', 'customFlow:artwork']) {
      saveGoalDetailCategoryConfig(category, { icon: 'routine:music', accentColor: '#ffc078' });
      expect(resolveCategoryCatalogIconTile(category)).toEqual({ boxBg: 'transparent', iconColor: '#252525' });
      expect(resolveCategoryCatalogIconTile(category, true)).toEqual({ boxBg: 'transparent', iconColor: '#FAFAFA' });
    }
  });

  it('maps legacy person and scale icons to standing figure for fasting', () => {
    saveGoalDetailCategoryConfig('fasting', {
      displayName: '체중조절',
      summary: '',
      icon: 'person.fill',
    });
    expect(resolveCategoryCatalogIcon('fasting')).toBe('routine:weight');

    saveGoalDetailCategoryConfig('fasting', {
      displayName: '체중조절',
      summary: '',
      icon: 'scalemass.fill',
    });
    expect(resolveCategoryCatalogIcon('fasting')).toBe('routine:weight');
  });

  it('starts fasting without an accent', () => {
    expect(resolveCategoryCatalogAccentColor('fasting')).toBe('#ffffff');
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

  it('maps legacy water blue accent to amber for healthIntake', () => {
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
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#e9a23b');
  });

  it('maps legacy brown accent to amber for healthIntake', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '건강을 위한 섭취',
      summary: '',
      icon: 'pills.fill',
      accentColor: '#8b5a2b',
    });
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#e9a23b');
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
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('routine:medicine');
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
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('routine:medicine');
  });

  it('maps legacy open book icon to closed book for reading', () => {
    saveGoalDetailCategoryConfig('reading', {
      displayName: '독서',
      summary: '',
      icon: 'book.fill',
      books: [],
    });
    expect(resolveCategoryCatalogIcon('reading')).toBe('routine:reading');
  });

  it('maps legacy bag icon to square pencil for work', () => {
    saveGoalDetailCategoryConfig('work', {
      displayName: '노트',
      summary: '',
      icon: 'bag.fill',
      tasks: [],
    });
    expect(resolveCategoryCatalogIcon('work')).toBe('routine:work');
  });

  it('prefers saved icon over builtin default', () => {
    saveGoalDetailCategoryConfig('healthIntake', {
      displayName: '건강을 위한 섭취',
      summary: '',
      icon: 'routine:camera',
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
    expect(resolveCategoryCatalogIcon('healthIntake')).toBe('routine:camera');
    expect(resolveCategoryCatalogAccentColor('healthIntake')).toBe('#3b82f6');
  });
  it('reads customFlow icon from goal-detail storage like accent color', () => {
    saveGoalDetailCategoryConfig(BUILTIN_ABSTAIN_FLOW_ID, {
      displayName: '금지',
      summary: '',
      icon: 'routine:music',
      accentColor: '#f97316',
      templateKey: 'abstain',
    });
    expect(resolveCategoryCatalogIcon(BUILTIN_ABSTAIN_FLOW_ID)).toBe('routine:music');
    expect(resolveCategoryCatalogAccentColor(BUILTIN_ABSTAIN_FLOW_ID)).toBe('#f97316');
  });
});

describe('readEditableCategoryAppearance', () => {
  it('maps the old healthIntake symbol to its illustration in settings', () => {
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
      icon: 'routine:medicine',
      accentColor: '#e9a23b',
    });
  });

  it('falls back to water builtin defaults for legacy water category', () => {
    expect(readEditableCategoryAppearance('water', { displayName: '수분 섭취', summary: '' })).toEqual({
      icon: 'routine:water',
      accentColor: '#ffffff',
    });
  });

  it('matches catalog icon for abstain preset in settings picker', () => {
    const catalogIcon = resolveCategoryCatalogIcon(BUILTIN_ABSTAIN_FLOW_ID);
    const editable = readEditableCategoryAppearance(BUILTIN_ABSTAIN_FLOW_ID, {});
    expect(editable.icon).toBe(catalogIcon);
    expect(editable.icon).toBe('routine:abstain');
    expect(editable.accentColor).toBe('#ffffff');
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


it('uses title-appropriate illustrations for all six active defaults even with stored system symbols', () => {
  const cases = [
    ['customFlow:preset_pokit_week_tour', 'headphones', 'routine:planning'],
    ['healthIntake', 'pills.fill', 'routine:medicine'],
    ['customFlow:preset_abstain', 'hand.raised.fill', 'routine:abstain'],
    ['customFlow:preset_stretching', 'figure.flexibility', 'routine:stretching'],
    ['customFlow:preset_daily_exercise', 'figure.run', 'routine:running'],
    ['fasting', 'figure.stand', 'routine:weight'],
  ];
  for (const [key, oldIcon, illustration] of cases) {
    saveGoalDetailCategoryConfig(key, { displayName: '루틴', summary: '', icon: oldIcon });
    expect(resolveCategoryCatalogIcon(key)).toBe(illustration);
    expect(readEditableCategoryAppearance(key, {}).icon).toBe(illustration);
  }
});
