import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDayPlanChromeSettingsStore } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsRowIcon,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

/** 설정 → 레이아웃 설정 (오늘 탭 헤더 아이콘 등) */
export function LayoutSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const hideLayoutIcons = useDayPlanChromeSettingsStore((s) => s.settings.hideLayoutIcons);
  const setHideLayoutIcons = useDayPlanChromeSettingsStore((s) => s.setHideLayoutIcons);

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
            {t('settings.layoutTitle')}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]}>
            {t('settings.layout.hint')}
          </ThemedText>

          <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
            <View style={[chrome.item, styles.firstItem, { borderTopColor: p.border }]}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="list.bullet.rectangle"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.border}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.hideIcons')}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                    {t('settings.layout.hideIconsDesc')}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={hideLayoutIcons}
                onValueChange={(next) => {
                  void Haptics.selectionAsync();
                  setHideLayoutIcons(next);
                }}
                trackColor={{
                  false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                  true: '#000000',
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                accessibilityLabel={t('settings.layout.hideIconsA11y', {
                  action: hideLayoutIcons
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
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
