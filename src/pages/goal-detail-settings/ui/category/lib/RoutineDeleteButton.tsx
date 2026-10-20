import { AppAlert as Alert } from '@shared/lib/app-alert';
import { Pressable, StyleSheet } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';

export function RoutineDeleteButton({ onDelete }: { onDelete: () => void }) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const ink = isDark ? '#D8AAA2' : '#A76B63';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('goalDetail.routineDelete')}
      onPress={() => {
        Alert.alert(t('goalDetail.routineDelete'), t('goalDetail.routineDeleteConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: onDelete },
        ]);
      }}
      style={({ pressed }) => [styles.button, { backgroundColor: isDark ? '#382E2D' : '#FBF1EE', opacity: pressed ? 0.7 : 1 }]}>
      <PaperGrain opacity={0.25} />
      <HanddrawnFrame color={ink} />
      <ThemedText style={[styles.label, { color: ink }]}>{t('goalDetail.routineDelete')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '500', letterSpacing: -0.1 },
});
