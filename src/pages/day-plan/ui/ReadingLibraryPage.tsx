import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { palette } from '../lib/dayPlanPalette';
import { ReadingPlanSection } from './ReadingPlanSection';

/** The original reading tab, now opened from the routine catalog. */
export function ReadingLibraryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const c = palette(isDark);
  return <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: c.bg }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.back}>
        <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
      </Pressable>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>{t('category.reading')}</ThemedText>
    </View>
    <ReadingPlanSection c={c} isDark={isDark} />
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 48 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28 },
});
