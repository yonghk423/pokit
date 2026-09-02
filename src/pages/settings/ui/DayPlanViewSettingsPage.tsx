import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDayPlanLayoutModeVisibilityStore } from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import type { DayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsRowIcon,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

const MODE_OPTIONS: {
  key: DayPlanLayoutMode;
  labelKey: 'layoutMode.bag';
  descKey: 'settings.dayPlanView.bagDesc';
  icon: 'list.bullet.rectangle' | 'sun.horizon.fill';
}[] = [
  {
    key: 'bag',
    labelKey: 'layoutMode.bag',
    descKey: 'settings.dayPlanView.bagDesc',
    icon: 'list.bullet.rectangle',
  },
  // 시간대(sections) 모드는 잠정 유보 — UI에서만 숨김, 로직은 보존
  // {
  //   key: 'sections',
  //   label: '시간대',
  //   desc: '새벽·아침·점심·저녁·밤 구간으로 나눠 봐요.',
  //   icon: 'sun.horizon.fill',
  // },
];

/** 설정 → 오늘 탭에서 쓸 보기 방식 on/off */
export function DayPlanViewSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const setModeVisible = useDayPlanLayoutModeVisibilityStore((s) => s.setModeVisible);
  const visibleCount = MODE_OPTIONS.filter((opt) => visibility[opt.key]).length;

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: p.bg }]} darkColor={p.bg} lightColor={p.bg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[chrome.header, { backgroundColor: p.bg, borderBottomColor: p.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={chrome.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}>
            <IconSymbol name="chevron.left" size={20} color={p.title} />
          </Pressable>
          <ThemedText style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}>
            {t('settings.dayPlanViewTitle')}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]}>
            {t('settings.dayPlanView.hint')}
          </ThemedText>

          <SettingsSection border={p.border} surface={p.surface}>
            {MODE_OPTIONS.map((opt, index) => {
              const enabled = visibility[opt.key];
              const disableOff = enabled && visibleCount <= 1;
              return (
                <View
                  key={opt.key}
                  style={[
                    chrome.item,
                    { borderTopColor: p.border },
                    index === 0 && styles.firstItem,
                  ]}>
                  <View style={chrome.itemLeft}>
                    <SettingsRowIcon
                      name={opt.icon}
                      color={p.icon}
                      boxBg={p.iconBoxBg}
                      border={p.border}
                      shadow={p.shadow}
                    />
                    <View style={chrome.itemTextWrap}>
                      <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{t(opt.labelKey)}</ThemedText>
                      <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>{t(opt.descKey)}</ThemedText>
                    </View>
                  </View>
                  <Switch
                    value={enabled}
                    disabled={disableOff}
                    onValueChange={(next) => {
                      void Haptics.selectionAsync();
                      setModeVisible(opt.key, next);
                    }}
                    trackColor={{
                      false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                      true: '#000000',
                    }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                    accessibilityLabel={t('settings.dayPlanView.a11yToggle', {
                      label: t(opt.labelKey),
                      action: enabled ? t('settings.dayPlanView.toggleOff') : t('settings.dayPlanView.toggleOn'),
                    })}
                  />
                </View>
              );
            })}
          </SettingsSection>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
  },
  firstItem: {
    borderTopWidth: 0,
  },
});
