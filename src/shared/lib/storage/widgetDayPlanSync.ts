import { NativeModules, Platform } from 'react-native';

import type { PersistedDayPlan } from './dayPlanStorage';

type PokitWidgetSyncNative = {
  syncDayPlanJson: (json: string) => void;
};

export function syncDayPlanToWidget(snapshot: PersistedDayPlan): void {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.syncDayPlanJson) return;
  try {
    mod.syncDayPlanJson(JSON.stringify(snapshot));
  } catch {
    // 위젯 동기화 실패는 앱 동작을 막지 않음
  }
}
