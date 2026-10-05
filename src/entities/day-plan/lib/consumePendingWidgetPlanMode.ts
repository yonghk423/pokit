import { NativeModules, Platform } from 'react-native';

type PokitWidgetSyncNative = {
  consumePendingPlanMode?: () => Promise<string | null>;
};

/**
 * 위젯 탭(Open Intent)이 App Group에 남겨 둔 planMode를 읽고 지운다.
 */
export async function consumePendingWidgetPlanMode(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  const mod = NativeModules.PokitWidgetSync as PokitWidgetSyncNative | undefined;
  if (!mod?.consumePendingPlanMode) return null;
  try {
    const value = await mod.consumePendingPlanMode();
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
