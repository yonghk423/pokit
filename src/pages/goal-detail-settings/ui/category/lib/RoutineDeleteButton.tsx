import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

/** 확인 CTA보다 약한 입체감 — 거의 안 보이는 얕은 음영 */
const SHADOW = 1;

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
            backgroundColor: 'rgba(186, 26, 26, 0.12)',
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
        style={[styles.deleteBtn, { backgroundColor: 'rgba(255, 218, 214, 0.35)' }]}>
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
    alignSelf: 'flex-end',
    marginTop: 12,
    marginRight: SHADOW,
    marginBottom: SHADOW,
  },
  shadow: {
    position: 'absolute',
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    borderWidth: 0,
    borderRadius: 0,
  },
  deleteBtn: {
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
    opacity: 0.5,
  },
});
