import { Share } from 'react-native';

import {
  rewriteLoopbackAssetUri,
  shareableFileUrl,
  shareCompletedPuzzleImage,
  puzzleShareFileBase,
} from './shareCompletedPuzzleImage';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: {
    share: jest.fn(),
    dismissedAction: 'dismissedAction',
    sharedAction: 'sharedAction',
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: '172.30.15.172:8081' } },
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  downloadAsync: jest.fn(async (_from: string, to: string) => ({ uri: to })),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
}));

import { copyAsync, downloadAsync } from 'expo-file-system/legacy';

const mockShare = Share.share as jest.MockedFunction<typeof Share.share>;

describe('puzzleShareFileBase', () => {
  it('keeps a readable title and drops path characters', () => {
    expect(puzzleShareFileBase('  하트/그림자  ')).toBe('하트 그림자');
    expect(puzzleShareFileBase('   ')).toBe('POKIT');
  });
});

describe('shareableFileUrl', () => {
  it('encodes spaces so iOS can open the file url', () => {
    expect(shareableFileUrl('file:///cache/pokit share/a.jpg')).toBe(
      'file:///cache/pokit%20share/a.jpg',
    );
  });
});

describe('rewriteLoopbackAssetUri', () => {
  it('points localhost asset urls at the Metro host', () => {
    expect(
      rewriteLoopbackAssetUri(
        'http://127.0.0.1:8081/assets/puzzle.webp',
        '172.30.15.172:8081',
      ),
    ).toBe('http://172.30.15.172:8081/assets/puzzle.webp');
    expect(rewriteLoopbackAssetUri('file:///docs/a.jpg', '172.30.15.172:8081')).toBe(
      'file:///docs/a.jpg',
    );
  });
});

describe('shareCompletedPuzzleImage', () => {
  beforeEach(() => {
    mockShare.mockReset();
    (copyAsync as jest.Mock).mockClear();
    (downloadAsync as jest.Mock).mockClear();
  });

  it('copies a local photo and opens the iOS share sheet', async () => {
    mockShare.mockResolvedValue({ action: Share.sharedAction, activityType: null });
    const result = await shareCompletedPuzzleImage({
      imageUri: 'file:///docs/puzzle_full.jpg',
      title: '하트',
    });
    expect(result).toBe('shared');
    expect(copyAsync).toHaveBeenCalledWith({
      from: 'file:///docs/puzzle_full.jpg',
      to: 'file:///cache/pokit-share/puzzle.jpg',
    });
    expect(mockShare).toHaveBeenCalledWith({
      url: 'file:///cache/pokit-share/puzzle.jpg',
    });
  });

  it('downloads a remote photo before sharing', async () => {
    mockShare.mockResolvedValue({ action: Share.dismissedAction, activityType: null });
    const result = await shareCompletedPuzzleImage({
      imageUri: 'http://127.0.0.1:8081/assets/puzzle.webp',
      title: 'peace',
    });
    expect(result).toBe('dismissed');
    expect(downloadAsync).toHaveBeenCalledWith(
      'http://172.30.15.172:8081/assets/puzzle.webp',
      'file:///cache/pokit-share/puzzle.webp',
    );
    expect(copyAsync).not.toHaveBeenCalled();
  });

  it('reports failure when there is no image', async () => {
    const result = await shareCompletedPuzzleImage({ imageUri: '  ', title: 'x' });
    expect(result).toBe('failed');
    expect(mockShare).not.toHaveBeenCalled();
  });
});
