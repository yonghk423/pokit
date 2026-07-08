import { NativeModules, Platform } from 'react-native';

import { loadDayPlan } from '@shared/lib/storage/dayPlanStorage';
import type { DayPlanBlock } from '../model/types';

import { buildWidgetDayPlanPayload } from './widgetDayPlanPayload';

type PokitWidgetSyncNative = {
  syncDayPlanJson: (json: string) => void;
};

function pushWidgetPayload(snapshot: Parameters<typeof buildWidgetDayPlanPayload>[0]): void {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.syncDayPlanJson) return;
  try {
    mod.syncDayPlanJson(JSON.stringify(buildWidgetDayPlanPayload(snapshot)));
  } catch {
    // 위젯 동기화 실패는 앱 동작을 막지 않음
  }
}

export function syncDayPlanToWidget(snapshot: Parameters<typeof buildWidgetDayPlanPayload>[0]): void {
  pushWidgetPayload(snapshot);
}

/** 담기 목록만 바뀐 경우 등 — 저장소 기준으로 위젯 타임라인 갱신 */
export function syncWidgetTimelineFromStorage(): void {
  const dayPlan = loadDayPlan<DayPlanBlock>();
  pushWidgetPayload(
    dayPlan ?? {
      dateKey: '',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    },
  );
}
