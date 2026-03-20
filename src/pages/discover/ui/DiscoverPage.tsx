import { StyleSheet } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 둘러보기 — 추천 리듬 탐색 (플레이스홀더) */
export function DiscoverPage() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">둘러보기</ThemedText>
      <ThemedText style={styles.sub}>추천 리듬을 찾는 화면입니다. 곧 연결됩니다.</ThemedText>
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
