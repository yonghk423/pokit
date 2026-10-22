import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';
import { BUILTIN_DAILY_LIFE_GROUP_KEY, BUILTIN_ABSTAIN_GROUP_KEY } from '@shared/lib/storage/defaultPriorityCatalog';
import { resolveCustomCatalogGroupDisplayLabel, resolveFixedFlowSetDisplayName } from './resolveCatalogGroupDisplayLabel';

afterEach(() => { useAppLocaleStore.setState({ locale: 'ko' }); });

it('shows current Korean names for previously saved built-in labels', () => {
  useAppLocaleStore.setState({ locale: 'ko' });
  expect(resolveFixedFlowSetDisplayName({ id: 'set_daily', name: '데일리 고정 루틴' })).toBe('데일리 리듬');
  expect(resolveFixedFlowSetDisplayName({ id: 'set_daily', name: '매일 만나는 오늘의 주인공' })).toBe('데일리 리듬');
  expect(resolveFixedFlowSetDisplayName({ id: 'set_weekend', name: '주말 고정 루틴' })).toBe('주말 리듬');
  expect(resolveFixedFlowSetDisplayName({ id: 'set_weekend', name: '주말의 오늘의 주인공' })).toBe('주말 리듬');
  expect(resolveCustomCatalogGroupDisplayLabel(BUILTIN_DAILY_LIFE_GROUP_KEY, '일상 루틴')).toBe('일상을 채우는 오늘의 주인공');
  expect(resolveCustomCatalogGroupDisplayLabel(BUILTIN_ABSTAIN_GROUP_KEY, '금지 루틴')).toBe('잠시 멈출 오늘의 주인공');
});

it('preserves user-edited set and group names', () => {
  expect(resolveFixedFlowSetDisplayName({ id: 'set_daily', name: '나의 아침' })).toBe('나의 아침');
  expect(resolveCustomCatalogGroupDisplayLabel(BUILTIN_DAILY_LIFE_GROUP_KEY, '내가 고른 것들')).toBe('내가 고른 것들');
});
