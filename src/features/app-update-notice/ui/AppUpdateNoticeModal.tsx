import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const ink = isDark ? '#FAFAFA' : '#1A1A1A';
  const muted = isDark ? '#8E8E93' : '#666666';
  const bulletBg = isDark ? '#2C2C2E' : '#F5F5F5';

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
              backgroundColor: bg,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <ThemedText style={[styles.title, { color: ink }]}>업데이트 안내</ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            POKIT v{version}이 설치됐어요
          </ThemedText>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {highlights.map((line) => (
              <View key={line} style={[styles.bulletRow, { backgroundColor: bulletBg }]}>
                <ThemedText style={[styles.bulletDot, { color: ink }]}>·</ThemedText>
                <ThemedText style={[styles.bulletText, { color: ink }]}>{line}</ThemedText>
              </View>
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="확인"
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: ink, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onDismiss}>
            <ThemedText style={[styles.primaryBtnText, { color: bg }]}>확인</ThemedText>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    maxHeight: '72%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  listScroll: {
    marginTop: 20,
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
