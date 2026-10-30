import * as fs from 'expo-file-system/legacy';
import { loadHeroAiLibrary } from './heroAiLibrary';
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///new-container/Documents/', getInfoAsync: jest.fn(), readDirectoryAsync: jest.fn() }));
it('recovers older finished photos independently of diary records and ignores inputs and incomplete files', async () => {
  jest.mocked(fs.readDirectoryAsync).mockResolvedValue(['hero-old-0.png', 'hero-new-1.png', 'hero-new-inputs.json', 'hero-new-2.png.download', 'hero-empty-0.png']);
  jest.mocked(fs.getInfoAsync).mockImplementation(async uri => ({ exists: true, isDirectory: uri.endsWith('/'), uri, size: uri.includes('empty') ? 0 : 100, modificationTime: uri.includes('new-1') ? 20 : 10 }));
  expect(await loadHeroAiLibrary()).toEqual([{ uri: 'file:///new-container/Documents/hero-ai/hero-new-1.png' }, { uri: 'file:///new-container/Documents/hero-ai/hero-old-0.png' }]);
});
it('returns an empty library before the first generation', async () => {
  jest.mocked(fs.getInfoAsync).mockResolvedValue({ exists: false, uri: '', isDirectory: false });
  expect(await loadHeroAiLibrary()).toEqual([]);
});
