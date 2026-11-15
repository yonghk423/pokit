let mockPro = false;
jest.mock('@features/subscriptions', () => ({
  useSubscriptionStore: Object.assign((selector: (s: object) => unknown) => selector({customerInfo: null}), {getState: () => ({customerInfo:null})}),
  selectCanTestProStoreItems: () => mockPro,
}));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DiaryThemeGallery } from './DiaryThemeGallery';
import { proDiaryCatalog } from '../model/proDiaryCatalog';
import { proDiaryIds } from '../../../../supabase/functions/calendar-store/proDiaryIds';
import { applyTheme } from '../model/diaryTheme';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

it('keeps the private download allowlist aligned with the individual products', () => {
  expect(proDiaryCatalog.length).toBe(proDiaryIds.size);
  expect(new Set(proDiaryCatalog.map(item => item.id))).toEqual(proDiaryIds);
});
it('routes individual camera selections through Pro download and rejects unpaid local application', () => {
  const choose = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<DiaryThemeGallery category="camera" ko ink="#222" choose={choose} status={() => 'Pro'} />); });
  try {
    act(() => tree.root.findByProps({testID:'diary-item-mini-toast'}).props.onPress());
    expect(choose).toHaveBeenCalledWith('mini-toast',true,expect.any(Function));
    const old = localStorageClient.getJson('pokit:diary-theme-items');
    applyTheme(proDiaryCatalog.find(item => item.id === 'mini-toast')!, 'camera');
    expect(localStorageClient.getJson('pokit:diary-theme-items')).toEqual(old);
  } finally { act(() => tree.unmount()); }
});

it('applies every classic item without a subscription or a download', () => {
  const { classicDiaryCatalog } = require('../model/classicDiaryCatalog');
  const previous = localStorageClient.getJson('pokit:diary-theme-items');
  try {
    for (const item of classicDiaryCatalog) {
      const choose = jest.fn(async (_id: string, pro: boolean, apply: () => void) => {
        expect(pro).toBe(false);
        apply();
      });
      let tree!: ReactTestRenderer;
      act(() => { tree = create(<DiaryThemeGallery category={item.category} ko ink="#222" choose={choose} status={() => 'Pro'} />); });
      act(() => tree.root.findByProps({ testID: 'diary-item-' + item.id }).props.onPress());
      expect(choose).toHaveBeenCalledWith(item.id, false, expect.any(Function));
      expect(localStorageClient.getJson<Record<string, string>>('pokit:diary-theme-items')?.[item.category]).toBe(item.id);
      expect(tree.root.findByProps({ testID: 'diary-item-' + item.id }).props.accessibilityState.selected).toBe(true);
      act(() => tree.unmount());
    }
  } finally { localStorageClient.setJson('pokit:diary-theme-items', previous); }
});


it.each([false, true])('unapplies an active item directly without downloading again (Pro=%s)', pro => {
  const item = pro ? proDiaryCatalog.find(item => item.id === 'mini-toast')! : require('../model/classicDiaryCatalog').classicDiaryCatalog.find((item: { id: string }) => item.id === 'classic-memo');
  const previous = localStorageClient.getJson('pokit:diary-theme-items');
  const cacheKey = 'pokit:calendar-store:v2:' + item.id;
  const previousImages = localStorageClient.getJson(cacheKey);
  mockPro = pro;
  if (pro) localStorageClient.setJson(cacheKey, { image: 'data:image/webp;base64,test' });
  act(() => applyTheme(item, item.category));
  const choose = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<DiaryThemeGallery category={item.category} ko ink="#222" choose={choose} status={() => 'Pro'} />); });
  try {
    const button = () => tree.root.findByProps({ testID: 'diary-item-' + item.id });
    expect(button().props.accessibilityState.selected).toBe(true);
    act(() => button().props.onPress());
    expect(button().props.accessibilityState.selected).toBe(false);
    expect(choose).not.toHaveBeenCalled();
    expect(localStorageClient.getJson<Record<string, string>>('pokit:diary-theme-items')?.[item.category]).toBeUndefined();
  } finally {
    act(() => tree.unmount());
    mockPro = false;
    localStorageClient.setJson('pokit:diary-theme-items', previous);
    localStorageClient.setJson(cacheKey, previousImages);
  }
});

it('renders English names for every diary store product after switching locale', () => {
  const { useAppLocaleStore } = require('@shared/lib/i18n/model/localeStore');
  const { categoryNames } = require('../model/diaryTheme');
  const { classicDiaryCatalog } = require('../model/classicDiaryCatalog');
  const previousLocale = useAppLocaleStore.getState().locale;
  const choose = jest.fn(async () => {});
  const textContent = (value: unknown): string => Array.isArray(value)
    ? value.map(textContent).join(' ')
    : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  try {
    act(() => useAppLocaleStore.getState().setLocale('en'));
    for (const category of Object.keys(categoryNames)) {
      let tree!: ReactTestRenderer;
      act(() => { tree = create(<DiaryThemeGallery category={category as import('../model/diaryTheme').ThemeSlot} ko={false} ink="#222" choose={choose} status={() => 'Pro · Download'} />); });
      try {
        for (const item of [...classicDiaryCatalog, ...proDiaryCatalog].filter(item => item.category === category)) {
          expect(item.titleEn).toBeTruthy();
          expect(tree.root.findByProps({ testID: 'diary-item-' + item.id }).props.accessibilityLabel).toBe(item.titleEn);
        }
        const renderedText = tree.root.findAll(node => typeof node.props.children === 'string' || Array.isArray(node.props.children))
          .map(node => textContent(node.props.children)).join(' ');
        expect(renderedText).not.toMatch(/[가-힣]/);
      } finally { act(() => tree.unmount()); }
    }
  } finally { act(() => useAppLocaleStore.getState().setLocale(previousLocale)); }
});
