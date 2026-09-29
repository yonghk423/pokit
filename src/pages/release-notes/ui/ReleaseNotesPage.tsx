import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listRecentReleaseNotes } from '@features/app-update-notice';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useAppLocaleStore, useTranslation } from '@shared/lib/i18n';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 설정 → 앱 버전 — 최근 버전별 업데이트 하이라이트 */
export function ReleaseNotesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAppLocaleStore((s) => s.locale);
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const insets = useSafeAreaInsets();

  const items = useMemo(() => listRecentReleaseNotes(locale), [locale]);

  const pageBg = rf.bg;
  const cardFace = isDark ? rf.surfaceAlt : pageBg;
  const rowBorder = isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)';
  const cardShadow = isDark ? '#5A5C72' : '#707979';

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 0)
        : 0;

  return (
    <ThemedView style={[styles.root, { backgroundColor: pageBg }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}>
          <IconSymbol name="chevron.left" size={20} color={rf.text} />
        </Pressable>
        <View style={styles.topTitles}>
          <ThemedText style={[styles.topLabel, { color: rf.textMuted }]}>{t('settings.title')}</ThemedText>
          <ThemedText style={[styles.topPage, { color: rf.text }]}>{t('releaseNotes.title')}</ThemedText>
        </View>
        <View style={styles.headerBtn} pointerEvents="none" />
      </View>

      <ScrollView
        style={styles.bodyPad}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 28) }]}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.helper, { color: rf.textMuted }]}>{t('releaseNotes.subtitle')}</ThemedText>

        <CityPopCardShell isDark={isDark} faceColor={cardFace} shadowColor={cardShadow} shadowOffset={2}>
          {items.map((item, index) => (
            <View
              key={item.version}
              style={[
                styles.versionBlock,
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: rowBorder }
                  : null,
              ]}
              accessibilityRole="summary"
              accessibilityLabel={`POKIT ${item.version}`}>
              <ThemedText style={[styles.versionTitle, { color: rf.text }]}>
                {`POKIT ${item.version}`}
              </ThemedText>
              <View style={styles.bulletList}>
                {item.highlights.map((line) => (
                  <View key={`${item.version}:${line}`} style={styles.bulletRow}>
                    <ThemedText style={[styles.bulletMark, { color: rf.textMuted }]}>•</ThemedText>
                    <ThemedText style={[styles.bulletText, { color: rf.text }]}>{line}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </CityPopCardShell>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CityPopSpacing.gutter,
    paddingBottom: 10,
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitles: {
    flex: 1,
    gap: 2,
  },
  topLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  topPage: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  bodyPad: {
    flex: 1,
    paddingHorizontal: CityPopSpacing.marginMobile,
  },
  content: {
    gap: 14,
    paddingTop: 4,
  },
  helper: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: -0.1,
    paddingHorizontal: 4,
  },
  versionBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletMark: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.15,
  },
});
