import {
  isSystemCatalogGroupKey,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
  SYSTEM_CATALOG_GROUP_SUBTITLE_KO,
  type SystemCatalogGroupKey,
} from '@entities/day-plan';

import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

const LABEL_MAX = 24;
const SUBTITLE_MAX = 120;

type GroupMeta = {
  label?: string;
  subtitle?: string;
};

type Shape = {
  groups?: Partial<Record<SystemCatalogGroupKey, GroupMeta>>;
};

function readRoot(): Shape {
  const raw = localStorageClient.getJson<Shape>(StorageKeys.systemCatalogGroupMeta) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

function writeRoot(groups: Partial<Record<SystemCatalogGroupKey, GroupMeta>>): void {
  localStorageClient.setJson(StorageKeys.systemCatalogGroupMeta, { groups });
}

function normalizeMeta(raw: GroupMeta | undefined): GroupMeta {
  if (!raw || typeof raw !== 'object') return {};
  const label =
    typeof raw.label === 'string' ? raw.label.trim().slice(0, LABEL_MAX) : undefined;
  const subtitle =
    typeof raw.subtitle === 'string' ? raw.subtitle.trim().slice(0, SUBTITLE_MAX) : undefined;
  return {
    ...(label ? { label } : {}),
    ...(subtitle ? { subtitle } : {}),
  };
}

export function loadSystemCatalogGroupMeta(): Partial<Record<SystemCatalogGroupKey, GroupMeta>> {
  const raw = readRoot().groups;
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<SystemCatalogGroupKey, GroupMeta>> = {};
  for (const key of ['health', 'productivity'] as const) {
    const meta = normalizeMeta(raw[key]);
    if (meta.label || meta.subtitle) out[key] = meta;
  }
  return out;
}

export function resolveSystemCatalogGroupLabel(groupKey: string): string {
  if (!isSystemCatalogGroupKey(groupKey)) return groupKey;
  const custom = loadSystemCatalogGroupMeta()[groupKey]?.label;
  return custom && custom.length > 0 ? custom : SYSTEM_CATALOG_GROUP_LABEL_KO[groupKey];
}

export function resolveSystemCatalogGroupSubtitle(groupKey: string): string {
  if (!isSystemCatalogGroupKey(groupKey)) return '';
  const custom = loadSystemCatalogGroupMeta()[groupKey]?.subtitle;
  return custom && custom.length > 0
    ? custom
    : SYSTEM_CATALOG_GROUP_SUBTITLE_KO[groupKey];
}

export function updateSystemCatalogGroupMeta(
  groupKey: SystemCatalogGroupKey,
  input: { label: string; subtitle: string },
): void {
  const label = input.label.trim().slice(0, LABEL_MAX);
  const subtitle = input.subtitle.trim().slice(0, SUBTITLE_MAX);
  if (label.length === 0 || subtitle.length === 0) return;

  const cur = loadSystemCatalogGroupMeta();
  const defaultLabel = SYSTEM_CATALOG_GROUP_LABEL_KO[groupKey];
  const defaultSubtitle = SYSTEM_CATALOG_GROUP_SUBTITLE_KO[groupKey];
  const next = { ...cur };

  if (label === defaultLabel && subtitle === defaultSubtitle) {
    delete next[groupKey];
  } else {
    next[groupKey] = { label, subtitle };
  }

  writeRoot(next);
}
