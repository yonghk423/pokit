import { collectDependencies, mergeDependencies, replaceReferences } from './dependencies';
import { localStorageClient as storage } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const values = new Map();
  return { localStorageClient: { listKeys: () => [...values.keys()], getJson: (k: string) => values.get(k) ?? null, setJson: (k: string, v: unknown) => values.set(k, v), removeItem: (k: string) => values.delete(k) } };
});
beforeEach(() => { for (const key of storage.listKeys()) storage.removeItem(key); });
it('includes routine definitions and preferences but excludes OS notification IDs', () => {
  storage.setJson('pokit:settings', { appFontId: 'hiMelody', dayPlanScheduledNotifications: [{ notificationId: 'device-specific' }], categoryReminderScheduled: ['not-portable'] });
  storage.setJson('pokit:goal-detail-settings', { byCategory: { 'customFlow:a': { title: 'Read' } }, byBlockId: { b: { title: 'Read' } } });
  expect(collectDependencies().preferences).toEqual({ appFontId: 'hiMelody' });
  expect(collectDependencies().categories['customFlow:a']).toEqual({ title: 'Read' });
});
it('restores missing definitions without changing an existing routine used by another date', () => {
  storage.setJson('pokit:custom-flow-catalog', { items: [{ id: 'customFlow:a', groupKey: 'productivity' }] });
  storage.setJson('pokit:goal-detail-settings', { byCategory: { 'customFlow:a': { title: 'Original' } } });
  const backup = JSON.parse(JSON.stringify(collectDependencies())); backup.categories['customFlow:a'] = { title: 'Backup' };
  const result = mergeDependencies(backup, false);
  const remapped = result.mapping.get('customFlow:a')!;
  expect(remapped).toMatch(/^customFlow:a:backup-/);
  const definitions = result.writes['pokit:goal-detail-settings'] as any;
  expect(definitions.byCategory['customFlow:a']).toEqual({ title: 'Original' });
  expect(definitions.byCategory[remapped]).toEqual({ title: 'Backup' });
  expect(replaceReferences({ categoryKey: 'customFlow:a', categoryMinutes: { 'customFlow:a': 4 } }, result.mapping)).toEqual({ categoryKey: remapped, categoryMinutes: { [remapped]: 4 } });
  expect(mergeDependencies(backup, false).mapping.get('customFlow:a')).toBe(remapped);
});
it('changes only supported display preferences when the user opts in', () => {
  storage.setJson('pokit:settings', { appFontId: 'corncorn', routineStartNotifyScheduled: ['keep'] });
  const backup = collectDependencies(); backup.preferences = { appFontId: 'hiMelody', injectedAuthToken: 'blocked' };
  expect(mergeDependencies(backup, false).writes['pokit:settings']).toBeUndefined();
  expect(mergeDependencies(backup, true).writes['pokit:settings']).toEqual({ appFontId: 'hiMelody', routineStartNotifyScheduled: ['keep'] });
});
it('accepts old date backups without dependency snapshots', () => {
  expect(mergeDependencies(undefined, true).writes).toEqual({});
});
it('rejects invalid shared definitions', () => {
  const backup = collectDependencies(); backup.catalog = [{ id: 'pokit:hero-ai-auth-v1', groupKey: 'productivity' }];
  expect(() => mergeDependencies(backup, true)).toThrow();
});

it('remaps the routine too when a shared group was changed on this device', () => {
  storage.setJson('pokit:custom-catalog-groups', { groups: [{ key: 'customGroup:a', label: 'Local' }] });
  storage.setJson('pokit:custom-flow-catalog', { items: [{ id: 'customFlow:a', groupKey: 'customGroup:a' }] });
  const backup = JSON.parse(JSON.stringify(collectDependencies()));
  backup.groups[0].label = 'Backup';
  const result = mergeDependencies(backup, false);
  expect(result.mapping.has('customGroup:a')).toBe(true);
  expect(result.mapping.has('customFlow:a')).toBe(true);
  const items = (result.writes['pokit:custom-flow-catalog'] as any).items;
  expect(items).toContainEqual({ id: result.mapping.get('customFlow:a'), groupKey: result.mapping.get('customGroup:a') });
});
