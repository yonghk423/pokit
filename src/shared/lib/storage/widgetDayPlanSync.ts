import { NativeModules, Platform } from 'react-native';

import { loadDayPlanDraft } from './dayPlanDraftStorage';
import type { PersistedDayPlan } from './dayPlanStorage';
import { loadDayPlan } from './dayPlanStorage';

type PokitWidgetSyncNative = {
  syncDayPlanJson: (json: string) => void;
};

export type WidgetDayPlanPayload = PersistedDayPlan & {
  /** 오늘 탭 담기 목록 — `dayPlanDraftStore.priorityCategoryOrder` */
  priorityCategoryKeys: string[];
  /** 우선순위 모드에서 완료한 담기 항목 — `dayPlanDraftStore.completedFocusCategoryKeys` */
  completedFocusCategoryKeys: string[];
  /** 빠른 메모 입력 중 초안 — `dayPlanDraftStore.quickMemoDraft` */
  quickMemoDraft: string;
};

export function buildWidgetDayPlanPayload(snapshot: PersistedDayPlan): WidgetDayPlanPayload {
  const draft = loadDayPlanDraft();
  const priorityCategoryKeys = Array.isArray(draft?.priorityCategoryOrder)
    ? draft.priorityCategoryOrder.filter((k) => typeof k === 'string' && k.trim().length > 0)
    : [];
  const completedFocusCategoryKeys = Array.isArray(draft?.completedFocusCategoryKeys)
    ? draft.completedFocusCategoryKeys.filter((k) => typeof k === 'string' && k.trim().length > 0)
    : [];
  const quickMemoDraft =
    typeof draft?.quickMemoDraft === 'string' ? draft.quickMemoDraft : '';
  return {
    ...snapshot,
    priorityCategoryKeys,
    completedFocusCategoryKeys,
    quickMemoDraft,
  };
}

function pushWidgetPayload(snapshot: PersistedDayPlan): void {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.syncDayPlanJson) return;
  try {
    mod.syncDayPlanJson(JSON.stringify(buildWidgetDayPlanPayload(snapshot)));
  } catch {
    // 위젯 동기화 실패는 앱 동작을 막지 않음
  }
}

export function syncDayPlanToWidget(snapshot: PersistedDayPlan): void {
  pushWidgetPayload(snapshot);
}

/** 담기 목록만 바뀐 경우 등 — 저장소 기준으로 위젯 타임라인 갱신 */
export function syncWidgetTimelineFromStorage(): void {
  const dayPlan = loadDayPlan();
  pushWidgetPayload(
    dayPlan ?? {
      dateKey: '',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    },
  );
}
