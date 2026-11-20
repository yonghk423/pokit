import { ensureMockNoteArchive } from './mockNoteArchive';
import { loadNoteArchive } from '@pages/day-plan/lib/heroNoteArchive';
import { localStorageClient, setDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';

afterEach(() => setDevelopmentStorageProfile(null));
it('seeds two complete years only in mock storage and preserves edited or cleared documents', () => {
  setDevelopmentStorageProfile(null);
  const key = 'pokit:canvas-note:2026-01-01';
  localStorageClient.setItemRaw(key, 'Personal writing');
  expect(ensureMockNoteArchive('2026-11-20')).toBe(false);
  setDevelopmentStorageProfile('en');
  localStorageClient.setItemRaw(key, 'Edited mock writing');
  localStorageClient.setJson('pokit:canvas-note:2026-02-01:inline', { text: '', icons: [] });
  expect(ensureMockNoteArchive('2026-11-20')).toBe(true);
  const groups = loadNoteArchive();
  expect(groups.filter(group => group.month.startsWith('2026'))).toHaveLength(12);
  expect(groups.filter(group => group.month.startsWith('2025'))).toHaveLength(12);
  expect(groups.find(group => group.month === '2026-03')?.entries).toHaveLength(13);
  expect(localStorageClient.getItemRaw('pokit:canvas-note:2026-03-01')!.length).toBeGreaterThan(1500);
  expect(localStorageClient.getItemRaw(key)).toBe('Edited mock writing');
  expect(localStorageClient.getItemRaw('pokit:canvas-note:2026-02-01')).toBeNull();
  localStorageClient.setItemRaw('pokit:canvas-note:2026-03-01', '');
  expect(ensureMockNoteArchive('2026-11-20')).toBe(false);
  expect(localStorageClient.getItemRaw('pokit:canvas-note:2026-03-01')).toBe('');
  setDevelopmentStorageProfile(null);
  expect(localStorageClient.getItemRaw(key)).toBe('Personal writing');
  expect(localStorageClient.getItemRaw('pokit:canvas-note:2026-03-01')).toBeNull();
});
