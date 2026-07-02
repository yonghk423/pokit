const CUSTOM_FLOW_CATEGORY_PREFIX = 'customFlow:' as const;
const HEALTH_GROUP_KEYS = new Set<string>([
  'water',
  'medicine',
  'fasting',
  'stretching',
  'straightenBack',
  'neckPosture',
  'meditation',
]);

function isCustomFlowCategoryKey(k: string): k is `customFlow:${string}` {
  return k.startsWith(CUSTOM_FLOW_CATEGORY_PREFIX) && k.length > CUSTOM_FLOW_CATEGORY_PREFIX.length + 4;
}

function defaultSystemGroupForCatalogKey(key: string): 'health' | 'productivity' {
  if (HEALTH_GROUP_KEYS.has(key)) return 'health';
  return 'productivity';
}

import {
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  listCustomFlowCatalogEntries,
  updateCustomFlowCatalogGroup,
} from './customFlowCatalogStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type Shape = { overrides?: Record<string, string> };

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.standardCatalogGroupOverrides) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(overrides: Record<string, string>): void {
  localStorageClient.setJson(StorageKeys.standardCatalogGroupOverrides, { overrides });
}

/** 표준 카탈로그 키의 사용자 지정 상위 묶음(시스템·사용자 그룹) */
export function loadStandardCatalogGroupOverrides(): Record<string, string> {
  const raw = readRoot().overrides;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, groupKey] of Object.entries(raw)) {
    const k = typeof key === 'string' ? key.trim() : '';
    const g = typeof groupKey === 'string' ? groupKey.trim() : '';
    if (!k || !g || isCustomFlowCategoryKey(k)) continue;
    out[k] = g;
  }
  return out;
}

export function updateStandardCatalogGroup(categoryKey: string, groupKey: string): void {
  const key = categoryKey.trim();
  if (!key || isCustomFlowCategoryKey(key)) return;
  const nextGroup = groupKey.trim();
  if (!nextGroup) return;

  const cur = loadStandardCatalogGroupOverrides();
  const defaultGroup = defaultSystemGroupForCatalogKey(key);
  if (nextGroup === defaultGroup) {
    if (!(key in cur)) return;
    const { [key]: _removed, ...rest } = cur;
    writeRoot(rest);
    return;
  }

  if (cur[key] === nextGroup) return;
  writeRoot({ ...cur, [key]: nextGroup });
}

/** 담기 카탈로그 항목(표준·customFlow)의 현재 상위 묶음 */
export function resolveCatalogItemGroupKey(categoryKey: string): string {
  const key = categoryKey.trim();
  if (!key) return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  if (isCustomFlowCategoryKey(key)) {
    const entry = listCustomFlowCatalogEntries().find((e) => e.id === key);
    return entry?.groupKey ?? DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  }
  return loadStandardCatalogGroupOverrides()[key] ?? defaultSystemGroupForCatalogKey(key);
}

export function updateCatalogItemGroup(categoryKey: string, groupKey: string): void {
  if (isCustomFlowCategoryKey(categoryKey)) {
    updateCustomFlowCatalogGroup(categoryKey, groupKey);
    return;
  }
  updateStandardCatalogGroup(categoryKey, groupKey);
}
