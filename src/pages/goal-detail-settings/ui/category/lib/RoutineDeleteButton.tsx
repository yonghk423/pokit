import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

export function RoutineDeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="루틴 삭제"
      onPress={() => {
        Alert.alert(
          '루틴 삭제',
          '이 루틴을 삭제할까요? 담기·나만의 루틴과 설정에서 함께 제거됩니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: onDelete },
          ],
        );
      }}
      style={({ pressed }) => [
        styles.deleteBtn,
        {
          borderColor: 'rgba(239,68,68,0.42)',
          backgroundColor: pressed ? 'rgba(239,68,68,0.08)' : 'transparent',
        },
      ]}>
      <ThemedText style={styles.deleteLabel}>루틴 삭제</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  deleteBtn: {
    borderWidth: 2,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  deleteLabel: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
});
