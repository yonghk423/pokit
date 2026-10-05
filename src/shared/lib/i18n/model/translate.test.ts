import { useAppLocaleStore } from './localeStore';
import { t } from './translate';

describe('t (i18next)', () => {
  afterEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
  });

  it('returns Korean / English / Japanese by locale store', () => {
    useAppLocaleStore.setState({ locale: 'ko' });
    expect(t('tabs.dayPlan')).toBe('오늘');

    useAppLocaleStore.setState({ locale: 'en' });
    expect(t('tabs.dayPlan')).toBe('Today');

    useAppLocaleStore.setState({ locale: 'ja' });
    expect(t('tabs.dayPlan')).toBe('今日');
  });

  it('interpolates {param} without treating count as plural forms', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(t('common.minutesUnit', { count: 1 })).toBe('1 min');
    expect(t('common.minutesUnit', { count: 5 })).toBe('5 min');
    expect(t('common.hoursMinutesUnit', { hours: 1, minutes: 30 })).toBe('1 hr 30 min');
  });

  it('accepts explicit locale override', () => {
    useAppLocaleStore.setState({ locale: 'ko' });
    expect(t('tabs.routines', 'en')).toBe('Routines');
  });

  it('keeps intentional empty English suffixes', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(t('notify.incomplete.countSuffix')).toBe('');
    expect(t('widget.countSuffix')).toBe('');
    expect(t('goalDetail.reading.emptyAddHint2')).toBe('');
  });
});
