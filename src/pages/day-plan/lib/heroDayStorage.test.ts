import { loadComicDay, newComicScene, saveComicDay, validComicTime } from './heroDayStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
afterEach(() => { for (const date of ['2026-10-21', '2026-10-22']) localStorageClient.removeItem(`pokit:comic-day:${date}`); });
it('stores independent scenes, memo, tasks and colors separately for each day', () => {
  const scene = { ...newComicScene('My scene'), memo: 'Notes', time: '07:00', paper: '#C8EBDD', todos: [{ id: '1', text: 'Task', completed: true }] };
  saveComicDay('2026-10-21', [scene]);
  expect(loadComicDay('2026-10-21')).toEqual([scene]);
  expect(loadComicDay('2026-10-22')).toEqual([]);
  saveComicDay('2026-10-21', []);
  expect(loadComicDay('2026-10-21')).toEqual([]);
});
it('supports unset times and rejects invalid times and malformed scenes', () => {
  for (const time of ['', '00:00', '23:59']) expect(validComicTime(time)).toBe(true);
  for (const time of ['24:00', '08:60', 'text']) expect(validComicTime(time)).toBe(false);
  localStorageClient.setJson('pokit:comic-day:2026-10-21', [{ id: 'broken' }]);
  expect(loadComicDay('2026-10-21')).toEqual([]);
});

it('keeps existing records in protagonist 1 and isolates future character records', () => {
  const existing = newComicScene('Existing character');
  const other = newComicScene('Another character');
  saveComicDay('2026-10-21', [existing]);
  saveComicDay('2026-10-21', [other], 'protagonist-2');
  expect(loadComicDay('2026-10-21', 'protagonist-1')).toEqual([existing]);
  expect(loadComicDay('2026-10-21', 'protagonist-2')).toEqual([other]);
  localStorageClient.removeItem('pokit:comic-day:protagonist-2:2026-10-21');
});


it('retains locally saved AI artwork when a diary is reloaded', () => {
  const scene = { ...newComicScene('Generated'), artworkUri: 'file:///documents/hero-ai/test.png' };
  saveComicDay('2026-10-21', [scene]);
  expect(loadComicDay('2026-10-21')[0].artworkUri).toBe(scene.artworkUri);
});
