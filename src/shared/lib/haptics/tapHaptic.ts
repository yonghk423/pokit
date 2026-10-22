import * as Haptics from 'expo-haptics';

export type TapHapticKind = 'press' | 'select' | 'confirm' | 'warn';

/** Button feedback used across the app: light press, selection tick, save, or a firmer warning. */
export function tapHaptic(kind: TapHapticKind = 'press') {
  if (kind === 'select') {
    void Haptics.selectionAsync();
    return;
  }
  if (kind === 'confirm') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  void Haptics.impactAsync(
    kind === 'warn' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
  );
}
