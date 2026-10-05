import { NativeModules, Platform } from 'react-native';

import { buildNoteWidgetBundlePayload } from './noteWidgetPayload';

type PokitWidgetSyncNative = {
  syncNoteWidgetJson?: (json: string) => void;
};

export function syncNoteWidgetToWidget(): void {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.syncNoteWidgetJson) return;
  try {
    const payload = buildNoteWidgetBundlePayload();
    mod.syncNoteWidgetJson(JSON.stringify(payload));
  } catch {
    // 위젯 동기화 실패는 앱 동작을 막지 않음
  }
}
