import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CityPopSpacing, RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  visible: boolean;
  version: string;
  highlights: string[];
  onDismiss: () => void;
};

export function AppUpdateNoticeModal({ visible, version, highlights, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              marginBottom: Math.max(insets.bottom, CityPopSpacing.gutter),
            },
          ]}>
          <ThemedText style={[styles.title, { color: c.text }]}>업데이트 안내</ThemedText>
          <ThemedText style={[styles.subtitle, { color: c.textMuted }]}>
            POKIT v{version}이 설치됐어요
          </ThemedText>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {highlights.map((line) => (
              <View
                key={line}
                style={[styles.bulletRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <ThemedText style={[styles.bulletDot, { color: c.text }]}>·</ThemedText>
                <ThemedText style={[styles.bulletText, { color: c.text }]}>{line}</ThemedText>
              </View>
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="확인"
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: c.primary,
                borderColor: c.border,
                opacity: pressed ? 0.88 : 1,
                transform: pressed
                  ? [{ translateX: 4 }, { translateY: 4 }]
                  : [{ translateX: 0 }, { translateY: 0 }],
              },
            ]}
            onPress={onDismiss}>
            <ThemedText style={[styles.primaryBtnText, { color: c.primaryOn }]}>확인</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: CityPopSpacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: CityPopSpacing.md,
    paddingTop: CityPopSpacing.lg / 2,
    paddingBottom: CityPopSpacing.md,
    maxHeight: '72%',
    gap: CityPopSpacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  subtitle: {
    marginTop: CityPopSpacing.xs,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  listScroll: {
    marginTop: CityPopSpacing.md,
    flexGrow: 0,
  },
  listContent: {
    gap: CityPopSpacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: CityPopSpacing.gutter,
    paddingVertical: CityPopSpacing.sm,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: CityPopSpacing.xs,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: CityPopSpacing.md,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
