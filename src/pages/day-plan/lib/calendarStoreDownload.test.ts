jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async () => ({exists: true, size: 20})),
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
import { getHeroAiAccessToken } from '@shared/lib/supabase/heroAiAuth';

it('migrates both bin states offline and coalesces simultaneous installs', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', {value:'ios', configurable:true});
  try {
    localStorageClient.setJson('pokit:calendar-store:v2:mini-bunny-trash', {
      image: 'data:image/webp;base64,ZW1wdHk=', filled:'data:image/webp;base64,ZnVsbA==',
    });
    const first = installDiaryItem('mini-bunny-trash');
    expect(installDiaryItem('mini-bunny-trash')).toBe(first);
    await first;
    expect(fs.writeAsStringAsync).toHaveBeenCalledTimes(2);
    expect(diaryImages('mini-bunny-trash')).toEqual({
      image:'file:///documents/diary-store-v2/mini-bunny-trash/image.webp',
      filled:'file:///documents/diary-store-v2/mini-bunny-trash/filled.webp',
    });
    expect(getHeroAiAccessToken).not.toHaveBeenCalled();
    await installDiaryItem('mini-bunny-trash');
    expect(fs.writeAsStringAsync).toHaveBeenCalledTimes(2);
  } finally { Object.defineProperty(Platform, 'OS', {value:original, configurable:true}); }
});
