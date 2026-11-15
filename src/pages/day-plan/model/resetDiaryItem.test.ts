jest.mock('@features/subscriptions', () => ({
  useSubscriptionStore: Object.assign(jest.fn(), { getState: () => ({}) }),
  selectCanTestProStoreItems: () => false,
}));
import { resetDiaryItem } from './resetDiaryItem';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import type { ThemeSlot } from './diaryTheme';

it.each([
  ['clip', 'yourday:diary-clip', 'red', 'blue'],
  ['trash', 'yourday:diary-trash-bin-style', 'ivory', 'mesh'],
  ['camera', 'yourday:diary-camera-style', 'polaroid-now', 'mini-evo'],
  ['photoWall', 'pokit:photo-wall:v1', 'black', 'none'],
] as const)('resets %s to its original control even when a previous non-default style was saved', (slot, key, oldStyle, expected) => {
  const previous = localStorageClient.getJson(key);
  const previousSelection = localStorageClient.getJson('pokit:diary-theme-items');
  try {
    localStorageClient.setJson(key, oldStyle);
    localStorageClient.setJson('pokit:diary-theme-items', { [slot]: 'some-decoration', memo: 'classic-memo' });
    resetDiaryItem(slot);
    expect(localStorageClient.getJson(key)).toBe(expected);
    expect(localStorageClient.getJson('pokit:diary-theme-items')).toEqual({ memo: 'classic-memo' });
  } finally {
    localStorageClient.setJson(key, previous);
    localStorageClient.setJson('pokit:diary-theme-items', previousSelection);
  }
});

it.each(['frame', 'tab', 'date', 'mark', 'memo', 'corner', 'pin', 'charm', 'pocket'] as ThemeSlot[])('removes optional %s decoration without selecting a replacement', slot => {
  const previous = localStorageClient.getJson('pokit:diary-theme-items');
  try {
    localStorageClient.setJson('pokit:diary-theme-items', { [slot]: 'classic-' + slot });
    resetDiaryItem(slot);
    expect(localStorageClient.getJson('pokit:diary-theme-items')).toEqual({});
  } finally { localStorageClient.setJson('pokit:diary-theme-items', previous); }
});
