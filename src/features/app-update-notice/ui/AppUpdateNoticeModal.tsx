import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
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
              marginBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: c.text }]}>업데이트 안내</ThemedText>
            <ThemedText style={[styles.subtitle, { color: c.textMuted }]}>
              POKIT v{version}이 설치됐어요
            </ThemedText>
          </View>

          <View style={[styles.listBox, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              bounces={false}>
              {highlights.map((line) => (
                <View key={line} style={styles.bulletRow}>
                  <ThemedText style={[styles.bulletDot, { color: c.textMuted }]}>·</ThemedText>
                  <ThemedText style={[styles.bulletText, { color: c.text }]}>{line}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="확인"
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: c.primary,
                borderColor: c.border,
                opacity: pressed ? 0.88 : 1,
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
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    maxWidth: 360,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '68%',
  },
  header: {
    gap: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  listBox: {
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 220,
  },
  listScroll: {
    flexGrow: 0,
  },
  listContent: {
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: 12,
    lineHeight: 17,
    marginRight: 4,
    width: 10,
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  primaryBtn: {
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
