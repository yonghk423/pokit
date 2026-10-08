import {
  buildPuzzleHistoryImageDestUri,
  isPersistedPuzzleHistoryImageUri,
  isPuzzleHistoryFilesystemUri,
  puzzleHistoryImageExists,
} from './pickPuzzleHistoryImage';
import { resolveLocalImageExtension } from './pickImageFromLibrary';

describe('pickPuzzleHistoryImage helpers', () => {
  it('stores under puzzle-history-images with full/thumb tags', () => {
    const full = buildPuzzleHistoryImageDestUri(
      'file:///tmp/sample.png',
      1_700_000_000_000,
      'full',
    );
    const thumb = buildPuzzleHistoryImageDestUri(
      'file:///tmp/sample.png',
      1_700_000_000_000,
      'thumb',
    );
    expect(full).toContain('puzzle-history-images/');
    expect(full).toContain('puzzle_full_');
    expect(full.endsWith('.png')).toBe(true);
    expect(thumb).toContain('puzzle_thumb_');
  });

  it('reuses extension resolver', () => {
    expect(resolveLocalImageExtension('file:///a.JPEG')).toBe('jpg');
  });

  it('treats metro/bundled mock asset uris as displayable without filesystem check', async () => {
    expect(isPuzzleHistoryFilesystemUri('http://localhost:8081/assets/bike.webp')).toBe(false);
    expect(isPuzzleHistoryFilesystemUri('asset:/assets/bike.webp')).toBe(false);
    expect(isPuzzleHistoryFilesystemUri('file:///pokit-mock-puzzle/album_21.webp')).toBe(false);
    expect(isPuzzleHistoryFilesystemUri('file:///var/mobile/Containers/Data/puzzle.jpg')).toBe(
      true,
    );

    await expect(
      puzzleHistoryImageExists('http://127.0.0.1:8081/assets/routine/reading.webp?platform=ios'),
    ).resolves.toBe(true);
    await expect(
      puzzleHistoryImageExists('file:///pokit-mock-puzzle/album_21_spring.webp'),
    ).resolves.toBe(true);
    // 앱 복사본이 아닌 file:// 은 존재 검사하지 않음(오탐 방지)
    await expect(
      puzzleHistoryImageExists('file:///var/mobile/Containers/Data/Application/tmp/picker.jpg'),
    ).resolves.toBe(true);
    expect(
      isPersistedPuzzleHistoryImageUri(
        'file:///var/mobile/Containers/Data/Application/tmp/picker.jpg',
      ),
    ).toBe(false);
  });
});
