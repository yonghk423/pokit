import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';

import {
  resolveStandardCatalogDisplayLabel,
} from './priorityCatalogPickerLabels';

describe('resolveStandardCatalogDisplayLabel', () => {
  it('maps stored Korean health/fasting names to English', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(resolveStandardCatalogDisplayLabel('healthIntake', '건강을 위한 섭취')).toBe(
      'Health intake',
    );
    expect(resolveStandardCatalogDisplayLabel('fasting', '체중조절')).toBe('Weight management');
  });

  it('maps stored Korean names to Japanese', () => {
    useAppLocaleStore.setState({ locale: 'ja' });
    expect(resolveStandardCatalogDisplayLabel('healthIntake', '건강을 위한 섭취')).toBe(
      '健康のための摂取',
    );
    expect(resolveStandardCatalogDisplayLabel('fasting', '체중조절')).toBe('体重管理');
  });

  it('keeps a user-renamed title', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(resolveStandardCatalogDisplayLabel('fasting', 'My cut')).toBe('My cut');
  });
});
