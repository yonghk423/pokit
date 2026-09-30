import { Pressable, StyleSheet } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  label?: string;
  ink: string;
  /** 호출부 호환용 (미사용) */
  line?: string;
  /** 호출부 호환용 (미사용) */
  isDark?: boolean;
  onPress: () => void;
};

/** 루틴 추가/더 추가 — 아이콘+라벨만 */
export function PriorityMealSlotAddRoutineRow({
  label,
  ink,
  onPress,
}: Props) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('dayPlan.confirmLink');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <IconSymbol name="plus.circle.fill" size={14} color={ink} />
      <ThemedText style={[styles.label, { color: ink }]}>{resolvedLabel}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
