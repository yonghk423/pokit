import { localStorageClient as storage } from '@shared/lib/storage/localStorageClient';
type ObjectValue = Record<string, any>;
export type BackupDependencies = {
  categories: ObjectValue; blocks: ObjectValue; committed: string[];
  catalog: { id: string; groupKey: string }[];
  groups: { key: string; label: string; subtitle?: string }[];
  times: ObjectValue;
  preferences: ObjectValue;
};
const preferenceKeys = ['appearanceMode', 'appFontId', 'appFontSizeId', 'priorityDayRollMode', 'dayPlanChromeSettings', 'dayPlanLayoutModeVisibility'] as const;
const read = (key: string): ObjectValue => storage.getJson<ObjectValue>(key) ?? {};
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
export function collectDependencies(): BackupDependencies {
  const detail = read('pokit:goal-detail-settings');
  const catalog = read('pokit:custom-flow-catalog');
  const settings = read('pokit:settings');
  return {
    categories: detail.byCategory ?? {}, blocks: detail.byBlockId ?? {}, committed: detail.committedCategoryKeys ?? [],
    catalog: catalog.items ?? (catalog.ids ?? []).map((id: string) => ({ id, groupKey: 'productivity' })),
    groups: read('pokit:custom-catalog-groups').groups ?? [],
    times: read('pokit:routine-start-times').byCategoryKey ?? {},
    preferences: Object.fromEntries(preferenceKeys.filter(key => settings[key] !== undefined).map(key => [key, settings[key]])),
  };
}
export function replaceReferences<T>(value: T, mapping: Map<string, string>): T {
  if (typeof value === 'string') return (mapping.get(value) ?? value) as T;
  if (Array.isArray(value)) return value.map(v => replaceReferences(v, mapping)) as T;
  if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, v]) => [mapping.get(key) ?? key, replaceReferences(v, mapping)])) as T;
  return value;
}
const canonical = (value: unknown): string => JSON.stringify(value, (_key, v) => object(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
function hash(value: unknown) { let n = 2166136261; for (const c of canonical(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0).toString(36); }
/** Import shared definitions without changing definitions used by other dates. */
export function mergeDependencies(snapshot: BackupDependencies | undefined, restorePreferences: boolean) {
  const writes: Record<string, unknown> = {}; const mapping = new Map<string, string>();
  if (!snapshot) return { writes, mapping }; // Existing v1 date backups remain readable.
  if (!object(snapshot.categories) || !object(snapshot.blocks) || !object(snapshot.times) || !object(snapshot.preferences) || !Array.isArray(snapshot.catalog) || !Array.isArray(snapshot.groups) || !Array.isArray(snapshot.committed) || snapshot.committed.some(k => typeof k !== 'string')) throw new Error('루틴 연결 정보가 손상됐어요.');
  const local = collectDependencies();
  for (const group of snapshot.groups) {
    if (!group || typeof group.key !== 'string' || !group.key.startsWith('customGroup:') || typeof group.label !== 'string') throw new Error('잘못된 루틴 그룹이에요.');
    const existing = local.groups.find(g => g.key === group.key);
    if (existing && canonical(existing) !== canonical(group)) mapping.set(group.key, `${group.key}:backup-${hash(group)}`);
  }
  for (const item of snapshot.catalog) {
    if (!item || typeof item.id !== 'string' || !item.id.startsWith('customFlow:') || typeof item.groupKey !== 'string') throw new Error('잘못된 사용자 루틴이에요.');
    const existing = local.catalog.find(c => c.id === item.id);
    if ((existing && canonical(existing) !== canonical(replaceReferences(item, mapping))) || (local.categories[item.id] && canonical(local.categories[item.id]) !== canonical(snapshot.categories[item.id]))) mapping.set(item.id, `${item.id}:backup-${hash([item, snapshot.categories[item.id]])}`);
  }
  const restored = replaceReferences(snapshot, mapping);
  const categories = { ...restored.categories, ...local.categories };
  const blocks = { ...restored.blocks, ...local.blocks };
  writes['pokit:goal-detail-settings'] = { ...read('pokit:goal-detail-settings'), byCategory: categories, byBlockId: blocks, committedCategoryKeys: [...new Set([...local.committed, ...restored.committed])], committedCategoryKeysMigrated: true };
  const mergeBy = <T,>(existing: T[], incoming: T[], key: (v: T) => string): T[] => [...existing, ...incoming.filter(v => !existing.some(e => key(e) === key(v)))];
  writes['pokit:custom-flow-catalog'] = { items: mergeBy(local.catalog, restored.catalog, x => x.id) };
  writes['pokit:custom-catalog-groups'] = { groups: mergeBy(local.groups, restored.groups, x => x.key) };
  writes['pokit:routine-start-times'] = { byCategoryKey: { ...restored.times, ...local.times } };
  if (restorePreferences) writes['pokit:settings'] = { ...read('pokit:settings'), ...Object.fromEntries(preferenceKeys.filter(key => restored.preferences[key] !== undefined).map(key => [key, restored.preferences[key]])) };
  return { writes, mapping };
}
