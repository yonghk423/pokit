import { useIsFocused } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Announcement } from '@entities/announcement';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { AnnouncementHomeNudge } from './AnnouncementHomeNudge';

type Props = {
  announcement: Announcement | null;
  onDismiss: () => void;
  onUpdatePress: () => void;
};

/** Floats above either home layout without reserving space in the routine list. */
export function AnnouncementHomeOverlay({ announcement, onDismiss, onUpdatePress }: Props) {
  const focused = useIsFocused();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <AppModal visible={focused && announcement != null} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[styles.root, { paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(24, insets.bottom) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        {announcement ? (
          <View style={[styles.card, { backgroundColor: isDark ? '#262B28' : '#FCFBF7' }]} accessibilityViewIsModal>
            <PaperGrain />
            <HanddrawnFrame color={isDark ? '#A3AE9C' : '#929B8B'} />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
              <AnnouncementHomeNudge announcement={announcement} onDismiss={onDismiss} onUpdatePress={onUpdatePress} />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </AppModal>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.22)' },
  card: { width: '100%', maxWidth: 400, maxHeight: '85%', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  content: { padding: 22 },
});
