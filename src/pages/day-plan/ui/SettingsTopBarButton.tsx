import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fetchAnnouncements, type AnnouncementLocale } from '@entities/announcement';
import { useAnnouncementRefreshWhileVisible } from '@features/announcement-home-nudge';
import { useDayPlanChromeSettingsStore } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { t, useAppLocaleStore } from '@shared/lib/i18n';
import { loadAnnouncementReadIds } from '@shared/lib/storage';
import { openSupportMailComposer } from '@shared/lib/support';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { HeaderIcon } from '@shared/ui/header-icon';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const SHADOW = 1;
const FACE = 34;

type Props = {
  c: DayPlanPalette;
};

type TopBarIconButtonProps = {
  name: string;
  accessibilityLabel: string;
  onPress: () => void;
  showBadge?: boolean;
  isDark: boolean;
  face: string;
  shadow: string;
  iconColor: string;
  border: string;
};

function TopBarIconButton({
  name,
  accessibilityLabel,
  onPress,
  showBadge = false,
  isDark,
  face,
  shadow,
  iconColor,
  border,
}: TopBarIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        { marginRight: SHADOW, marginBottom: SHADOW },
        pressed && styles.pressed,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: shadow,
            transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
          },
        ]}
      />
      <View style={[styles.iconHit, { backgroundColor: face, borderWidth: 0 }]}>
        <PaperGrain opacity={0.25} />
        <HanddrawnFrame color={border} />
        {name === 'gearshape' ? (
          <HeaderIcon name="settings" />
        ) : (
          <IconSymbol name={name} size={18} color={iconColor} />
        )}
      </View>
      {showBadge ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.badge, { borderColor: isDark ? RetroFlatColors.dark.bg : '#FFFFFF' }]}
        />
      ) : null}
    </Pressable>
  );
}

/** 오늘 탭 상단 — 공지 · 문의 · 설정 (공지·문의는 레이아웃 설정으로 숨김 가능) */
export function SettingsTopBarButton({ c: _c }: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const locale = useAppLocaleStore((s) => s.locale);
  const showTopAnnouncementsButton = useDayPlanChromeSettingsStore(
    (s) => s.settings.showTopAnnouncementsButton,
  );
  const showTopContactButton = useDayPlanChromeSettingsStore((s) => s.settings.showTopContactButton);
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(false);

  const shadow = isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(65, 78, 58, 0.07)';
  const iconColor = isDark ? '#FAFAFA' : '#000000';
  const face = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const border = isDark ? '#A3AE9C' : '#929B8B';

  const refreshUnread = useCallback(async () => {
    if (!showTopAnnouncementsButton) {
      setHasUnreadAnnouncements(false);
      return;
    }
    const result = await fetchAnnouncements(locale as AnnouncementLocale);
    if (!result.ok) {
      setHasUnreadAnnouncements(false);
      return;
    }
    const readIds = new Set(loadAnnouncementReadIds());
    setHasUnreadAnnouncements(result.items.some((item) => !readIds.has(item.id)));
  }, [locale, showTopAnnouncementsButton]);

  useAnnouncementRefreshWhileVisible(refreshUnread);

  return (
    <View style={styles.row}>
      {showTopAnnouncementsButton ? (
        <TopBarIconButton
          name="megaphone.fill"
          accessibilityLabel={
            hasUnreadAnnouncements
              ? `${t('settings.a11y.announcements')}, ${t('announcements.unreadHint')}`
              : t('settings.a11y.announcements')
          }
          showBadge={hasUnreadAnnouncements}
          isDark={isDark}
          face={face}
          shadow={shadow}
          iconColor={iconColor}
          border={border}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/announcements');
          }}
        />
      ) : null}
      {showTopContactButton ? (
        <TopBarIconButton
          name="paperplane.fill"
          accessibilityLabel={t('settings.a11y.support')}
          isDark={isDark}
          face={face}
          shadow={shadow}
          iconColor={iconColor}
          border={border}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void openSupportMailComposer();
          }}
        />
      ) : null}
      <TopBarIconButton
        name="gearshape"
        accessibilityLabel={t('settings.title')}
        isDark={isDark}
        face={face}
        shadow={shadow}
        iconColor={iconColor}
        border={border}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/settings');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shell: {
    position: 'relative',
  },
  shadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 0,
  },
  iconHit: {
    width: FACE,
    height: FACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 1,
    zIndex: 1,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  badge: {
    position: 'absolute',
    top: -3,
    left: FACE - 9,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#C45C5C',
    borderWidth: 1.5,
    zIndex: 3,
  },
});
