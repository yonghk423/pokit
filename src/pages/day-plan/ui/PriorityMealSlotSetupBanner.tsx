import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  onPressSetup: () => void;
};

/** 오늘 탭 — 구간 미설정 시 안내 */
export function PriorityMealSlotSetupBanner({
  ink,
  muted,
  line,
  cardBg,
  onPressSetup,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="나만의 루틴에서 구간 설정하기"
      onPress={onPressSetup}
      style={({ pressed }) => [
        styles.root,
        { backgroundColor: cardBg, borderColor: line },
        pressed && { opacity: 0.88 },
      ]}>
      <View style={styles.iconWrap}>
        <IconSymbol name="sun.horizon.fill" size={16} color={ink} />
      </View>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>
          구간별로 보려면 설정이 필요해요
        </ThemedText>
        <ThemedText style={[styles.body, { color: muted }]}>
          나만의 루틴에서 구간을 설정한 뒤 적용을 켜면, 여기서 구간별로 볼 수 있어요.
        </ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={14} color={muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
});
