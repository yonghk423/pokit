import { collectDate, dateOf, localDates, mergeDate, validDate } from './dateData';
import { localStorageClient as storage } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const values = new Map();
  return { localStorageClient: { listKeys: (prefix = '') => [...values.keys()].filter(k => k.startsWith(prefix)), getJson: (k: string) => values.get(k) ?? null, setJson: (k: string, v: unknown) => values.set(k, v), removeItem: (k: string) => values.delete(k) } };
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
  const writes = mergeDate({ ...data, memo: 'restored' });
  expect(writes['pokit:horizon-weekly-day-memos']).toEqual({ '2026-11-06': 'restored', '2026-11-05': 'keep' });
  expect((writes['pokit:comic-diaries:v1'] as any).diaries).toHaveLength(2);
  expect((writes['pokit:comic-diaries:v1'] as any).activeId).toBe('b');
});
it('rejects storage keys outside the selected date before changing anything', () => {
  const data = collectDate('2026-11-06');
  expect(() => mergeDate({ ...data, scenes: { 'pokit:settings': [] } })).toThrow();
  expect(storage.listKeys()).toEqual([]);
});
it('does not replace a different active day plan', () => {
  storage.setJson('pokit:day-plan', { dateKey: '2026-11-07', blocks: ['keep'] });
  const data = collectDate('2026-11-06');
  const writes = mergeDate({ ...data, plan: { dateKey: '2026-11-06', blocks: [] } });
  expect(writes['pokit:day-plan']).toBeUndefined();
  expect(writes['pokit:drive-restored-plan:2026-11-06']).toBeDefined();
});
