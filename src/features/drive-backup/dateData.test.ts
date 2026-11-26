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

it('includes the selected month in the date backup and preserves notes when restoring older backups', () => {
  const key = 'pokit:monthly-album-note:2026-11';
  storage.setItemRaw(key, '이달의 기록');
  const data = collectDate('2026-11-13');
  expect(mergeDate(data)[key]).toBe('이달의 기록');
  expect(mergeDate({ ...data, monthlyNote: undefined })).not.toHaveProperty(key);
  expect(mergeDate({ ...data, monthlyNote: '' })[key]).toBe('');
});

it('ignores retired puzzle data in older backups without reading or overwriting stored puzzle records', () => {
  const stored = { v: 2, state: { histories: [{ id: 'old', imageUri: 'file:///keep.jpg' }] } };
  storage.setJson('pokit:puzzle-history', stored);
  const oldBackup = { ...collectDate('2026-11-06'), contentVersion: undefined, puzzles: [{ id: 'retired' }] };
  const writes = mergeDate(oldBackup);
  expect(writes).not.toHaveProperty('pokit:puzzle-history');
  expect(collectDate('2026-11-06')).not.toHaveProperty('puzzles');
  expect(storage.getJson('pokit:puzzle-history')).toEqual(stored);
});

it('backs up date-independent Notes and to-dos even when there are no dated records', () => {
  const key = 'pokit:independent-notes';
  const notes = [{
    id: 'note', text: 'file:///a literal note', updatedAt: 100,
    inlineDocument: { text: 'file:///a literal note', icons: [] },
    inkHex: '#342211',
    todos: [{ id: 'task', text: 'Pack the blanket', completed: true, inlineDocument: { text: 'Pack the blanket', icons: ['checklist'] } }],
  }];
  storage.setJson(key, notes);
  expect(localDates()).toContain(dateOf(Date.now()));
  const snapshot = JSON.parse(JSON.stringify(collectDate('2026-11-06')));
  expect(snapshot.independentNotes).toEqual(notes);
  storage.removeItem(key);
  const writes = mergeDate(snapshot);
  expect(writes[key]).toEqual(notes);
  storage.setJson(key, writes[key]);
  expect(mergeDate(snapshot)[key]).toEqual(notes);
});

it('keeps newer local notes and unrelated notes when restoring, and accepts older backup formats', () => {
  const key = 'pokit:independent-notes';
  const original = { id: 'note', text: 'Before', updatedAt: 100 };
  const newer = { ...original, text: 'After', updatedAt: 200 };
  const unrelated = { id: 'unrelated', text: 'Keep', updatedAt: 150 };
  storage.setJson(key, [original]);
  const snapshot = collectDate('2026-11-06');
  storage.setJson(key, [newer, unrelated]);
  expect(mergeDate(snapshot)[key]).toEqual([newer, unrelated]);
  expect(mergeDate({ ...snapshot, independentNotes: undefined })).not.toHaveProperty(key);
});

it('rejects invalid note tasks and duplicate note IDs before restoring', () => {
  const note = { id: 'note', text: 'Note', updatedAt: 100 };
  const snapshot = collectDate('2026-11-06');
  expect(() => mergeDate({ ...snapshot, independentNotes: [note, note] })).toThrow('노트 백업 데이터가 손상됐어요.');
  const malformed = { ...note, todos: [{ id: 'task', text: 'Task' }] };
  expect(() => mergeDate({ ...snapshot, independentNotes: [malformed] } as typeof snapshot)).toThrow('노트 백업 데이터가 손상됐어요.');
});

it('restores calendar highlights across months and keeps hidden plans hidden', () => {
  const { readPlans, plansOnDate, rangePlansKey } = require('../../pages/day-plan/model/calendarRangePlans');
  const visible = { id: 'one', name: 'file:///literal', start: '2026-11-29', end: '2026-12-02', color: '#E6E0F6', visibleOnCalendar: true };
  const hidden = { ...visible, id: 'two', color: '#E4B3AD', visibleOnCalendar: false };
  storage.setJson(rangePlansKey, [visible, hidden]);
  expect(localDates()).toContain(visible.start);
  const snapshot = JSON.parse(JSON.stringify(collectDate(visible.start)));
  storage.removeItem(rangePlansKey);
  for (let attempt = 0; attempt < 2; attempt++) {
    storage.setJson(rangePlansKey, mergeDate(snapshot)[rangePlansKey]);
    expect(readPlans()).toEqual([visible, hidden]);
    for (const date of [visible.start, '2026-12-01', visible.end]) expect(plansOnDate(readPlans(), date)).toEqual([visible]);
    expect(plansOnDate(readPlans(), '2026-12-03')).toEqual([]);
  }
  delete snapshot.rangePlans;
  expect(mergeDate(snapshot)[rangePlansKey]).toBeUndefined();
});
