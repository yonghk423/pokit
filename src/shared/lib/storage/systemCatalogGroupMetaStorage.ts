import { t } from '@shared/lib/i18n';

import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

const SYSTEM_CATALOG_GROUP_KEYS = ['health', 'productivity'] as const;
type SystemCatalogGroupKey = (typeof SYSTEM_CATALOG_GROUP_KEYS)[number];

const SYSTEM_CATALOG_GROUP_LABEL_KO: Record<SystemCatalogGroupKey, string> = {
  health: '건강 루틴',
  productivity: '생산성을 높이는 도구',
};

const SYSTEM_CATALOG_GROUP_SUBTITLE_KO: Record<SystemCatalogGroupKey, string> = {
  health:
    '수분·체중·복약·스트레칭 등 몸 관리 항목을 오늘에 맞게 골라 담아요.',
  productivity:
    '독서·공부·정리·글쓰기·딥워크·일기 등 집중에 쓸 항목을 골라 담아요. 직접 만든 루틴은 아래에서 계속 추가할 수 있어요.',
};

function isSystemCatalogGroupKey(k: string): k is SystemCatalogGroupKey {
  return (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).includes(k);
}

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

function defaultSystemGroupLabel(groupKey: SystemCatalogGroupKey): string {
  return groupKey === 'health' ? t('catalog.groupHealth') : t('catalog.groupProductivity');
}

function defaultSystemGroupSubtitle(groupKey: SystemCatalogGroupKey): string {
  return groupKey === 'health'
    ? t('catalog.groupHealthSubtitle')
    : t('catalog.groupProductivitySubtitle');
}

function isDefaultSystemGroupLabel(groupKey: SystemCatalogGroupKey, label: string): boolean {
  if (label === SYSTEM_CATALOG_GROUP_LABEL_KO[groupKey]) return true;
  const key = groupKey === 'health' ? 'catalog.groupHealth' : 'catalog.groupProductivity';
  return label === t(key, 'ko') || label === t(key, 'en') || label === t(key, 'ja');
}

function isDefaultSystemGroupSubtitle(groupKey: SystemCatalogGroupKey, subtitle: string): boolean {
  if (subtitle === SYSTEM_CATALOG_GROUP_SUBTITLE_KO[groupKey]) return true;
  const key =
    groupKey === 'health' ? 'catalog.groupHealthSubtitle' : 'catalog.groupProductivitySubtitle';
  return subtitle === t(key, 'ko') || subtitle === t(key, 'en') || subtitle === t(key, 'ja');
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
  if (custom && custom.length > 0 && !isDefaultSystemGroupLabel(groupKey, custom)) {
    return custom;
  }
  return defaultSystemGroupLabel(groupKey);
}

export function resolveSystemCatalogGroupSubtitle(groupKey: string): string {
  if (!isSystemCatalogGroupKey(groupKey)) return '';
  const custom = loadSystemCatalogGroupMeta()[groupKey]?.subtitle;
  if (custom && custom.length > 0 && !isDefaultSystemGroupSubtitle(groupKey, custom)) {
    return custom;
  }
  return defaultSystemGroupSubtitle(groupKey);
}

export function updateSystemCatalogGroupMeta(
  groupKey: SystemCatalogGroupKey,
  input: { label: string; subtitle: string },
): void {
  const label = input.label.trim().slice(0, LABEL_MAX);
  const subtitle = input.subtitle.trim().slice(0, SUBTITLE_MAX);
  if (label.length === 0 || subtitle.length === 0) return;

  const cur = loadSystemCatalogGroupMeta();
  const next = { ...cur };

  if (
    isDefaultSystemGroupLabel(groupKey, label) &&
    isDefaultSystemGroupSubtitle(groupKey, subtitle)
  ) {
    delete next[groupKey];
  } else {
    next[groupKey] = { label, subtitle };
  }

  writeRoot(next);
}
