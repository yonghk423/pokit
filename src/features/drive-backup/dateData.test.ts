import { collectDate, dateOf, localDates, mergeDate, validDate } from './dateData';
import { localStorageClient as storage } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const values = new Map();
  return { localStorageClient: { listKeys: (prefix = '') => [...values.keys()].filter(k => k.startsWith(prefix)), getJson: (k: string) => values.get(k) ?? null, setJson: (k: string, v: unknown) => values.set(k, v), getItemRaw: (k: string) => values.get(k) ?? null, setItemRaw: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } };
});
beforeEach(() => { for (const key of storage.listKeys()) storage.removeItem(key); });
it('rejects impossible dates without throwing for invalid month', () => {
  expect(validDate('2026-99-01')).toBe(false);
  expect(validDate('2026-02-30')).toBe(false);
  expect(validDate('2026-11-06')).toBe(true);
});
it('exports image references and only the selected date, merges without losing other dates', () => {
  const createdAt = new Date(2026, 10, 6, 12).getTime();
  const otherAt = new Date(2026, 10, 5, 12).getTime();
  const diary = { id: 'a', createdAt, scenes: [{ artworkUri: 'file:///original.png' }] };
  storage.setJson('pokit:comic-diaries:v1', { diaries: [diary, { id: 'b', createdAt: otherAt }], activeId: 'b' });
  storage.setJson('pokit:horizon-weekly-day-memos', { '2026-11-06': 'hello', '2026-11-05': 'keep' });
  const data = collectDate('2026-11-06');
  expect(data.diaries).toEqual([diary]);
  expect(localDates()).toContain(dateOf(createdAt));
  const writes = mergeDate({ ...data, contentVersion: undefined, memo: 'restored' });
  expect(writes['pokit:horizon-weekly-day-memos']).toEqual({ '2026-11-06': 'restored', '2026-11-05': 'keep' });
  expect((writes['pokit:comic-diaries:v1'] as any).diaries).toHaveLength(2);
  expect((writes['pokit:comic-diaries:v1'] as any).activeId).toBe('b');
});
it('rejects storage keys outside the selected date before changing anything', () => {
  const data = collectDate('2026-11-06');
  expect(() => mergeDate({ ...data, contentVersion: undefined, scenes: { 'pokit:settings': [] } })).toThrow();
  expect(storage.listKeys()).toEqual([]);
});
it('does not replace a different active day plan', () => {
  storage.setJson('pokit:day-plan', { dateKey: '2026-11-07', blocks: ['keep'] });
  const data = collectDate('2026-11-06');
  const writes = mergeDate({ ...data, contentVersion: undefined, plan: { dateKey: '2026-11-06', blocks: [] } });
  expect(writes['pokit:day-plan']).toBeUndefined();
  expect(writes['pokit:drive-restored-plan:2026-11-06']).toBeDefined();
});

it('backs up the record date, story, events and photo captions without global settings', () => {
  const diary = { id: 'selected', date: '2026-11-06', createdAt: new Date(2026, 10, 9, 12).getTime(), scenes: [{ title: 'Title', memo: 'Photo story', artworkUri: 'file:///photo.png' }] };
  storage.setJson('pokit:comic-diaries:v1', { diaries: [diary] });
  storage.setItemRaw('pokit:canvas-note:2026-11-06', 'My story\nSecond line');
  storage.setJson('pokit:canvas-events:2026-11-06', [{ id: 'event', title: 'Birthday' }]);
  storage.setJson('appFontId', 'test-font');
  const data = collectDate('2026-11-06');
  expect(data.diaries).toEqual([diary]);
  expect(data.story).toBe('My story\nSecond line');
  expect(data.events).toEqual([{ id: 'event', title: 'Birthday' }]);
  expect(data.dependencies).toBeUndefined();
  expect(data.puzzles).toEqual([]);
  expect(localDates()).toEqual(['2026-11-06']);
});
it('restores new content only for the selected date and keeps unrelated settings and records', () => {
  storage.setJson('pokit:comic-diaries:v1', { activeId: 'other', diaries: [{ id: 'other', date: '2026-11-05', scenes: [] }] });
  storage.setItemRaw('pokit:canvas-note:2026-11-05', 'Keep');
  const data = { ...collectDate('2026-11-06'), story: 'Restored', events: [{ id: 'a', title: 'Event' }], originals: [{ uri: 'file:///restored.png', title: 'Photo title', memo: 'Photo memo', createdAt: new Date(2026, 10, 6, 12).getTime() }] };
  const writes = mergeDate(data, true);
  expect(writes['pokit:canvas-note:2026-11-06']).toBe('Restored');
  expect(writes['pokit:canvas-note:2026-11-05']).toBeUndefined();
  expect(writes['pokit:drive-original-gallery:v1']).toEqual(data.originals);
  expect(writes.appFontId).toBeUndefined();
  expect(Object.keys(writes)).toHaveLength(4);
  expect((writes['pokit:comic-diaries:v1'] as any).activeId).toBe('other');
});
it('rejects malformed new events and cross-date diary IDs', () => {
  const data = collectDate('2026-11-06');
  expect(() => mergeDate({ ...data, events: [{ id: 'a' }] })).toThrow();
  expect(() => mergeDate({ ...data, diaries: [{ id: 'a', date: '2026-11-05', scenes: [] }] })).toThrow();
});
