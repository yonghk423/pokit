import { NativeModules, Platform } from 'react-native';

import { buildBookstoreWidgetBundlePayload } from './bookstoreWidgetPayload';

type PokitWidgetSyncNative = {
  syncBookstoreWidgetJson?: (json: string) => void;
};

export function syncBookstoreWidgetToWidget(readingInput?: unknown): void {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.syncBookstoreWidgetJson) return;
  try {
    const payload = buildBookstoreWidgetBundlePayload(readingInput);
    mod.syncBookstoreWidgetJson(JSON.stringify(payload));
  } catch {
    // 위젯 동기화 실패는 앱 동작을 막지 않음
  }
}
