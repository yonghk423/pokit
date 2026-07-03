import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  visible: boolean;
  latestVersion: string;
  highlights: string[];
  onUpdatePress: () => void;
  onLaterPress: () => void;
};

export function AppUpdateAvailableModal({
  visible,
  latestVersion,
  highlights,
  onUpdatePress,
  onLaterPress,
}: Props) {
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
      onRequestClose={onLaterPress}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: bg,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <ThemedText style={[styles.title, { color: ink }]}>새 버전이 나왔어요</ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            POKIT v{latestVersion}이 스토어에 배포됐어요
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
            accessibilityLabel="업데이트"
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: ink, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onUpdatePress}>
            <ThemedText style={[styles.primaryBtnText, { color: bg }]}>업데이트</ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="나중에"
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onLaterPress}>
            <ThemedText style={[styles.secondaryBtnText, { color: muted }]}>나중에</ThemedText>
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
    paddingBottom: 16,
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
  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
