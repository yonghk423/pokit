import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Announcement } from '@entities/announcement';
import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  announcement: Announcement;
  onUpdatePress: () => void;
  onDismiss: () => void;
};

/**
 * Supabase 공지(important/force) — 홈 오버레이용 새소식 안내.
 * 변경 항목은 설정 → 새소식에만 두고, 여기에는 제목만 보여 준다.
 */
export function AnnouncementHomeNudge({ announcement, onUpdatePress, onDismiss }: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.headerRow}>
        <ThemedText
          style={[styles.kicker, { color: tone.textMuted }, cityPopFont('700')]}
          lightColor={tone.textMuted}
          darkColor={tone.textMuted}>
          {t('announcements.homeNudge.kicker')}
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.title, { color: tone.text }, cityPopFont('700')]}
        lightColor={tone.text}
        darkColor={tone.text}
        numberOfLines={2}>
        {announcement.title}
      </ThemedText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('announcements.homeNudge.laterA11y')}
          onPress={() => {
            void Haptics.selectionAsync();
            onDismiss();
          }}
          style={({ pressed }) => [
            styles.laterBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
            },
            pressed && styles.pressed,
          ]}>
          <PaperGrain />
          <HanddrawnFrame color={isDark ? '#E8E8E8' : '#303030'} />
          <ThemedText
            style={[styles.laterLabel, { color: tone.textMuted }, cityPopFont('600')]}
            lightColor={tone.textMuted}
            darkColor={tone.textMuted}>
            {t('announcements.homeNudge.laterBtn')}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('announcements.homeNudge.updateA11y')}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onUpdatePress();
          }}
          style={({ pressed }) => [
            styles.openBtn,
            {
              backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
              borderColor: isDark ? tone.primary : '#000000',
            },
            pressed && styles.pressed,
          ]}>
          <PaperGrain />
          <HanddrawnFrame color={isDark ? '#E8E8E8' : '#303030'} />
          <ThemedText
            style={[styles.openLabel, { color: isDark ? '#F5F5F5' : '#202020' }, cityPopFont('700')]}
            lightColor="#202020"
            darkColor="#F5F5F5">
            {t('announcements.homeNudge.updateBtn')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingRight: 2,
    paddingVertical: 4,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  laterBtn: {
    borderWidth: 0,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  laterLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  openBtn: {
    borderWidth: 0,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  openLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
});
