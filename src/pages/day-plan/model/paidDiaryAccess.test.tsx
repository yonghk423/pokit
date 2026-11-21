import { act, create, type ReactTestRenderer } from 'react-test-renderer';
let mockPro = false;
let mockInstalled = false;
jest.mock('@features/subscriptions', () => ({
  useSubscriptionStore: Object.assign((select: (s: unknown) => unknown) => select({}), {getState: () => ({})}),
  selectCanTestProStoreItems: () => mockPro,
}));
jest.mock('../lib/calendarStoreDownload', () => ({
  diaryImages: (id: string) => mockInstalled ? {image: 'file:///qa/' + id + '.webp'} : undefined,
  installDiaryItem: jest.fn(async () => {}),
}));
import { applyTheme, useDiaryTheme, type ThemeSlot } from './diaryTheme';
import { proDiaryCatalog } from './proDiaryCatalog';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

beforeEach(() => { mockPro = false; mockInstalled = false; localStorageClient.removeItem('pokit:diary-theme-items'); });
it.each(proDiaryCatalog)('gates and restores paid diary item $id in $category', item => {
  applyTheme(item, item.category);
  expect(localStorageClient.getJson('pokit:diary-theme-items')).toBeNull();
  mockPro = true;
  applyTheme(item, item.category);
  expect(localStorageClient.getJson('pokit:diary-theme-items')).toBeNull();
  mockInstalled = true;
  act(() => applyTheme(item, item.category));
  expect(localStorageClient.getJson<Record<string,string>>('pokit:diary-theme-items')?.[item.category]).toBe(item.id);
  let selected: ReturnType<typeof useDiaryTheme>;
  function Probe() { selected = useDiaryTheme(item.category); return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Probe />); });
  expect(selected!.id).toBe(item.id);
  expect(selected!.source).toMatchObject({uri: 'file:///qa/' + item.id + '.webp'});
  mockPro = false;
  act(() => tree.update(<Probe />));
  expect(selected!).toBeUndefined();
  expect(localStorageClient.getJson<Record<string,string>>('pokit:diary-theme-items')?.[item.category]).toBe(item.id);
  mockPro = true;
  act(() => tree.update(<Probe />));
  expect(selected!.id).toBe(item.id);
  act(() => applyTheme(null, item.category as ThemeSlot));
  expect(selected!).toBeUndefined();
  act(() => tree.unmount());
});

import { HERO_CAMERA_STORE_ITEMS, applyHeroCameraStyle, isProCameraStyle, useHeroCameraStyle } from './heroCameraStyle';
import { HERO_TRASH_BIN_ITEMS, applyHeroTrashBinStyle, isProTrashBinStyle, useHeroTrashBinStyle } from './heroTrashBinStyle';

it.each(HERO_CAMERA_STORE_ITEMS)('keeps camera $id selection across expiry and renewal', ({id}) => {
  mockPro = true;
  applyHeroCameraStyle(id);
  let selected: ReturnType<typeof useHeroCameraStyle>;
  function Probe() { selected = useHeroCameraStyle(); return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Probe />); });
  expect(selected!).toBe(id);
  mockPro = false;
  act(() => tree.update(<Probe />));
  expect(selected!).toBe(isProCameraStyle(id) ? 'mini-evo' : id);
  expect(localStorageClient.getJson('yourday:diary-camera-style')).toBe(id);
  mockPro = true;
  act(() => tree.update(<Probe />));
  expect(selected!).toBe(id);
  act(() => tree.unmount());
});

it.each(HERO_TRASH_BIN_ITEMS)('keeps bin $id selection across expiry and renewal', ({id}) => {
  mockPro = true;
  applyHeroTrashBinStyle(id);
  let selected: ReturnType<typeof useHeroTrashBinStyle>;
  function Probe() { selected = useHeroTrashBinStyle(); return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Probe />); });
  expect(selected!).toBe(id);
  mockPro = false;
  act(() => tree.update(<Probe />));
  expect(selected!).toBe(isProTrashBinStyle(id) ? 'mesh' : id);
  expect(localStorageClient.getJson('yourday:diary-trash-bin-style')).toBe(id);
  mockPro = true;
  act(() => tree.update(<Probe />));
  expect(selected!).toBe(id);
  act(() => tree.unmount());
});
