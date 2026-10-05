import { NativeModules, Platform } from 'react-native';

import { loadPinnedRoutineCategoryKey } from '@shared/lib/storage';
import { loadDayPlanDraft } from '@shared/lib/storage/dayPlanDraftStorage';

import { listPinnedRoutineWidgetCandidates } from './pinnedRoutineWidgetCatalog';
import {
  buildPinnedRoutineWidgetPayload,
  type PinnedRoutineWidgetPayload,
} from './pinnedRoutineWidgetPayload';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

type PokitWidgetSyncNative = {
  syncPinnedRoutineJson?: (json: string) => void;
};

/** App Group 번들 — 위젯 인스턴스별 루틴 선택용 */
export type PinnedRoutineWidgetBundle = {
  version: 1;
  fallbackCategoryKey: string | null;
  routines: PinnedRoutineWidgetPayload[];
};

function isPinnedRoutineCompleted(categoryKey: string): boolean {
  const draft = loadDayPlanDraft();
  const completed = Array.isArray(draft?.completedFocusCategoryKeys)
    ? draft.completedFocusCategoryKeys
    : [];
  const base = resolvePriorityRoutineCategoryKey(categoryKey);
  return completed.some((key) => {
    if (typeof key !== 'string') return false;
    return key === categoryKey || resolvePriorityRoutineCategoryKey(key) === base;
  });
}

export function buildPinnedRoutineWidgetBundle(
  fallbackCategoryKey: string | null = loadPinnedRoutineCategoryKey(),
): PinnedRoutineWidgetBundle {
  const candidates = listPinnedRoutineWidgetCandidates();
  const routines = candidates.map((row) =>
    buildPinnedRoutineWidgetPayload(row.key, {
      isCompleted: isPinnedRoutineCompleted(row.key),
    }),
  );
  const fallback =
    typeof fallbackCategoryKey === 'string' && fallbackCategoryKey.trim()
      ? resolvePriorityRoutineCategoryKey(fallbackCategoryKey.trim())
      : null;
  return {
    version: 1,
    fallbackCategoryKey: fallback,
    routines,
  };
}

/** 모든 루틴 페이로드를 App Group에 동기화 (위젯마다 다른 루틴 선택) */
export function syncPinnedRoutineToWidget(
  fallbackCategoryKey: string | null = loadPinnedRoutineCategoryKey(),
): void {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.syncPinnedRoutineJson) return;
  try {
    const bundle = buildPinnedRoutineWidgetBundle(fallbackCategoryKey);
    mod.syncPinnedRoutineJson(JSON.stringify(bundle));
  } catch {
    // 위젯 동기화 실패는 앱 동작을 막지 않음
  }
}
