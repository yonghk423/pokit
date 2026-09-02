import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

const SHADOW = 3;

export function RoutineDeleteButton({ onDelete }: { onDelete: () => void }) {
  const { t } = useTranslation();
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
        accessibilityLabel={t('goalDetail.routineDelete')}
        onPress={() => {
          Alert.alert(t('goalDetail.routineDelete'), t('goalDetail.routineDeleteConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: onDelete },
          ]);
        }}
        style={({ pressed }) => [
          styles.deleteBtn,
          {
            borderColor: tone.border,
            backgroundColor: pressed ? '#F5B8B2' : tone.dangerBg,
          },
          pressed && { opacity: 0.94 },
        ]}>
        <ThemedText style={[styles.deleteLabel, { color: tone.danger }]}>
          {t('goalDetail.routineDelete')}
        </ThemedText>
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
