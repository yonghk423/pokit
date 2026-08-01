import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';

const SHADOW = 3;

export function RoutineDeleteButton({ onDelete }: { onDelete: () => void }) {
  const tone = RetroFlatColors.light;

  return (
    <View style={styles.shell}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: tone.danger,
            borderColor: tone.border,
          },
        ]}
      />
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
            borderColor: tone.border,
            backgroundColor: pressed ? '#F5B8B2' : tone.dangerBg,
          },
          pressed && { opacity: 0.94 },
        ]}>
        <ThemedText style={[styles.deleteLabel, { color: tone.danger }]}>루틴 삭제</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    marginTop: 4,
    marginRight: SHADOW,
    marginBottom: SHADOW,
  },
  shadow: {
    position: 'absolute',
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
  deleteBtn: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
