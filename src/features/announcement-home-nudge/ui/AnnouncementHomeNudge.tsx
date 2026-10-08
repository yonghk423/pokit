import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Announcement } from '@entities/announcement';
import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import { announcementBodyPreview } from '../lib/pickHomeNudgeAnnouncement';

type Props = {
  announcement: Announcement;
  onUpdatePress: () => void;
  onDismiss: () => void;
};

/**
 * Supabase 공지(important/force) — 「오늘의 한 줄」 슬롯용 새소식 안내.
 */
export function AnnouncementHomeNudge({ announcement, onUpdatePress, onDismiss }: Props) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const preview = announcementBodyPreview(announcement.body);

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
      {preview ? (
        <ThemedText
          style={[styles.body, { color: tone.textMuted }, cityPopFont('600')]}
          lightColor={tone.textMuted}
          darkColor={tone.textMuted}
          numberOfLines={2}>
          {preview}
        </ThemedText>
      ) : null}
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
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
            pressed && styles.pressed,
          ]}>
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
              backgroundColor: tone.bgMint,
              borderColor: isDark ? tone.primary : '#000000',
            },
            pressed && styles.pressed,
          ]}>
          <ThemedText
            style={[styles.openLabel, { color: tone.primary }, cityPopFont('700')]}
            lightColor={tone.primary}
            darkColor={tone.primary}>
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
  body: {
    fontSize: 12,
    lineHeight: 17,
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
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  laterLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  openBtn: {
    borderWidth: 1,
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
