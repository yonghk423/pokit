import { StyleSheet } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 앱 설정 (로그인·Profile 없음) */
export function SettingsPage() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">설정</ThemedText>
      <ThemedText style={styles.sub}>테마, 알림 등 앱 환경을 다루는 화면입니다. 곧 연결됩니다.</ThemedText>
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
