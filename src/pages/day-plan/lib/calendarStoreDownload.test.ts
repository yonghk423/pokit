jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async () => ({exists: true, size: 20})),
  deleteAsync: jest.fn(async () => {}),
  EncodingType: {Base64: 'base64'},
}));
jest.mock('@shared/lib/supabase/heroAiAuth', () => ({
  getHeroAiAccessToken: jest.fn(),
  getHeroAiAuthClient: jest.fn(),
}));
import { Platform } from 'react-native';
import * as fs from 'expo-file-system/legacy';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { diaryImages, installDiaryItem } from './calendarStoreDownload';
import { getHeroAiAccessToken, getHeroAiAuthClient } from '@shared/lib/supabase/heroAiAuth';

it('migrates both bin states offline and coalesces simultaneous installs', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', {value:'ios', configurable:true});
  try {
    localStorageClient.setJson('pokit:calendar-store:v4:mini-bunny-trash', {
      image: 'data:image/webp;base64,ZW1wdHk=', filled:'data:image/webp;base64,ZnVsbA==',
    });
    const first = installDiaryItem('mini-bunny-trash');
    expect(installDiaryItem('mini-bunny-trash')).toBe(first);
    await first;
    expect(fs.writeAsStringAsync).toHaveBeenCalledTimes(2);
    expect(diaryImages('mini-bunny-trash')).toEqual({
      image:'file:///documents/diary-store-v4/mini-bunny-trash/image.webp',
      filled:'file:///documents/diary-store-v4/mini-bunny-trash/filled.webp',
    });
    expect(getHeroAiAccessToken).not.toHaveBeenCalled();
    await installDiaryItem('mini-bunny-trash');
    expect(fs.writeAsStringAsync).toHaveBeenCalledTimes(2);
  } finally { Object.defineProperty(Platform, 'OS', {value:original, configurable:true}); }
});


it('replaces an old camera cache with the new remote icon revision', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  try {
    localStorageClient.setJson('pokit:calendar-store:v2:decor-ribbon-camera', { image: 'data:image/webp;base64,b2xk' });
    jest.mocked(getHeroAiAccessToken).mockResolvedValue('token');
    const invoke = jest.fn(async () => ({ data: { id: 'decor-ribbon-camera', revision: 1, images: { image: 'data:image/webp;base64,bmV3' } }, error: null }));
    jest.mocked(getHeroAiAuthClient).mockReturnValue({ functions: { invoke } } as unknown as ReturnType<typeof getHeroAiAuthClient>);
    await installDiaryItem('decor-ribbon-camera');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(diaryImages('decor-ribbon-camera')).toEqual({ image: 'data:image/webp;base64,bmV3' });
    expect(localStorageClient.getJson('pokit:calendar-store:v2:decor-ribbon-camera')).toBeNull();
    expect(fs.deleteAsync).toHaveBeenCalledWith('file:///documents/diary-store-v2/decor-ribbon-camera/', { idempotent: true });
  } finally { Object.defineProperty(Platform, 'OS', { value: original, configurable: true }); }
});

it('refreshes a previously installed photo wall and removes its old files only after installation', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  try {
    localStorageClient.setJson('pokit:calendar-store:v3:wall-mail', { image: 'file:///documents/diary-store-v3/wall-mail/image.webp' });
    jest.mocked(getHeroAiAccessToken).mockResolvedValue('token');
    const invoke = jest.fn(async () => ({ data: { id: 'wall-mail', revision: 1, images: { image: 'data:image/webp;base64,bmV3' } }, error: null }));
    jest.mocked(getHeroAiAuthClient).mockReturnValue({ functions: { invoke } } as unknown as ReturnType<typeof getHeroAiAuthClient>);
    expect(diaryImages('wall-mail')).toBeNull();
    await installDiaryItem('wall-mail');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(localStorageClient.getJson('pokit:calendar-store:v5:wall-mail')).toEqual({ image: 'data:image/webp;base64,bmV3' });
    expect(localStorageClient.getJson('pokit:calendar-store:v3:wall-mail')).toBeNull();
    expect(fs.deleteAsync).toHaveBeenCalledWith('file:///documents/diary-store-v3/wall-mail/', { idempotent: true });
  } finally { Object.defineProperty(Platform, 'OS', { value: original, configurable: true }); }
});

it('refreshes restored small artwork into a new cache instead of reusing its old v2 original', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  try {
    localStorageClient.setJson('pokit:calendar-store:v2:date-label-mail', { image: 'file:///documents/diary-store-v2/date-label-mail/image.webp' });
    jest.mocked(getHeroAiAccessToken).mockResolvedValue('token');
    const invoke = jest.fn(async () => ({ data: { id: 'date-label-mail', revision: 1, images: { image: 'data:image/webp;base64,cmVzdG9yZWQ=' } }, error: null }));
    jest.mocked(getHeroAiAuthClient).mockReturnValue({ functions: { invoke } } as unknown as ReturnType<typeof getHeroAiAuthClient>);
    await installDiaryItem('date-label-mail');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(localStorageClient.getJson('pokit:calendar-store:v6-release:date-label-mail')).toEqual({ image: 'data:image/webp;base64,cmVzdG9yZWQ=' });
    expect(localStorageClient.getJson('pokit:calendar-store:v2:date-label-mail')).toBeNull();
  } finally { Object.defineProperty(Platform, 'OS', { value: original, configurable: true }); }
});

it('recovers a missing frame edge even when the cached representative still exists', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  try {
    const roles = ['image','tl','tr','bl','br','top','bottom','left','right'];
    localStorageClient.setJson('pokit:calendar-store:v6-release:print-border-berry', Object.fromEntries(roles.map(role => [role, `file:///documents/diary-store-v6-release/print-border-berry/${role}.webp`])));
    jest.mocked(fs.getInfoAsync).mockImplementation(async uri => ({ exists: !String(uri).endsWith('/right.webp'), size: 20 }) as never);
    const invoke = jest.fn(async () => ({ data: { id: 'print-border-berry', revision: 1, images: Object.fromEntries(roles.map(role => [role, 'data:image/webp;base64,cmVzdG9yZWQ='])) }, error: null }));
    jest.mocked(getHeroAiAuthClient).mockReturnValue({ functions: { invoke } } as unknown as ReturnType<typeof getHeroAiAuthClient>);
    await installDiaryItem('print-border-berry');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(diaryImages('print-border-berry')?.right).toBe('data:image/webp;base64,cmVzdG9yZWQ=');
  } finally { Object.defineProperty(Platform, 'OS', { value: original, configurable: true }); }
});
