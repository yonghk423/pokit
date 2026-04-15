import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type GoalDetailSettingsStorageShape = {
  byCategory?: Record<string, unknown>;
  byBlockId?: Record<string, unknown>;
  /** 「설정 완료」로 확정된 카테고리 — 도구 카탈로그 부제 표시 */
  committedCategoryKeys?: string[];
  /** 구 저장분을 committed로 한 번 옮김 */
  committedCategoryKeysMigrated?: boolean;
};

function readRoot(): GoalDetailSettingsStorageShape {
  const raw =
    localStorageClient.getJson<GoalDetailSettingsStorageShape>(
      StorageKeys.goalDetailSettings,
    ) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

/**
 * 최초 1회 마이그레이션: 예전 저장(JSON에 committed 필드 없음)만 byCategory 키를 committed로 옮김.
 * 이후에는 「설정 완료」로만 committed에 추가(자동 저장만으로는 부제 표시 안 함).
 */
function ensureCommittedCategoryMigration(): void {
  const root = readRoot();
  if (root.committedCategoryKeysMigrated === true) return;

  const hadCommittedField = 'committedCategoryKeys' in root;
  const fromSaved = Object.keys(root.byCategory ?? {});
  const nextCommitted =
    !hadCommittedField && fromSaved.length > 0
      ? [...new Set(fromSaved)]
      : [...(root.committedCategoryKeys ?? [])];

  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    ...root,
    committedCategoryKeys: nextCommitted,
    committedCategoryKeysMigrated: true,
  });
}

export function loadGoalDetailCategoryConfig(categoryKey: string): unknown | null {
  if (!categoryKey) return null;
  const root = readRoot();
  const byCategory = root.byCategory ?? {};
  return Object.prototype.hasOwnProperty.call(byCategory, categoryKey)
    ? byCategory[categoryKey]
    : null;
}

/** 도구 카탈로그 부제: 목표 상세에서 「설정 완료」를 누른 카테고리만 */
export function hasGoalDetailCommittedCategory(categoryKey: string): boolean {
  ensureCommittedCategoryMigration();
  const root = readRoot();
  return (root.committedCategoryKeys ?? []).includes(categoryKey);
}

export function appendGoalDetailCommittedCategoryKeys(keys: string[]): void {
  const trimmed = keys.map((k) => k.trim()).filter(Boolean);
  if (trimmed.length === 0) return;
  ensureCommittedCategoryMigration();
  const root = readRoot();
  const set = new Set(root.committedCategoryKeys ?? []);
  trimmed.forEach((k) => set.add(k));
  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    ...root,
    committedCategoryKeys: [...set],
  });
}

export function saveGoalDetailCategoryConfig(
  categoryKey: string,
  config: unknown,
): void {
  if (!categoryKey) return;
  const root = readRoot();
  const byCategory = { ...(root.byCategory ?? {}) };
  byCategory[categoryKey] = config;
  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    ...root,
    byCategory,
    byBlockId: root.byBlockId ?? {},
  });
}

export function loadGoalDetailBlockConfig(blockId: string): unknown | null {
  if (!blockId) return null;
  const root = readRoot();
  const byBlockId = root.byBlockId ?? {};
  return Object.prototype.hasOwnProperty.call(byBlockId, blockId)
    ? byBlockId[blockId]
    : null;
}

export function saveGoalDetailBlockConfig(blockId: string, config: unknown): void {
  if (!blockId) return;
  const root = readRoot();
  const byBlockId = { ...(root.byBlockId ?? {}) };
  byBlockId[blockId] = config;
  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    ...root,
    byCategory: root.byCategory ?? {},
    byBlockId,
  });
}
