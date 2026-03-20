import { StyleSheet } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 내 리듬 목록·관리 (플레이스홀더) */
export function RoutinesPage() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">내 리듬</ThemedText>
      <ThemedText style={styles.sub}>만든 리듬을 모아 보는 화면입니다. 곧 연결됩니다.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 8,
    justifyContent: 'center',
  },
  sub: {
    opacity: 0.65,
  },
});
