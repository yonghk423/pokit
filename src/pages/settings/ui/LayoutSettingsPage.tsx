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
  const hideDailyQuote = useDayPlanChromeSettingsStore((s) => s.settings.hideDailyQuote);
  const setHideDailyQuote = useDayPlanChromeSettingsStore((s) => s.setHideDailyQuote);
  const completeInAccordion = useDayPlanChromeSettingsStore((s) => s.settings.completeInAccordion);
  const setCompleteInAccordion = useDayPlanChromeSettingsStore((s) => s.setCompleteInAccordion);
  const hideCompleteTape = useDayPlanChromeSettingsStore((s) => s.settings.hideCompleteTape);
  const setHideCompleteTape = useDayPlanChromeSettingsStore((s) => s.setHideCompleteTape);

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
                  border={p.iconBorder}
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
            <View style={[chrome.item, { borderTopColor: p.border }]}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="text.quote"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.iconBorder}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.hideDailyQuote')}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                    {t('settings.layout.hideDailyQuoteDesc')}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={hideDailyQuote}
                onValueChange={(next) => {
                  void Haptics.selectionAsync();
                  setHideDailyQuote(next);
                }}
                trackColor={{
                  false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                  true: '#000000',
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                accessibilityLabel={t('settings.layout.hideDailyQuoteA11y', {
                  action: hideDailyQuote
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
            <View style={[chrome.item, { borderTopColor: p.border }]}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="checkmark.circle"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.iconBorder}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.completeInAccordion')}
                  </ThemedText>
                  <View
                    style={styles.descWithIcon}
                    accessibilityLabel={`${t('settings.layout.completeInAccordionDescBefore')}${t('settings.layout.completeInAccordionDescAfter')}`}>
                    <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                      {t('settings.layout.completeInAccordionDescBefore')}
                    </ThemedText>
                    <View
                      style={[
                        styles.expandHintChip,
                        {
                          borderColor: p.border,
                          backgroundColor: isDark ? p.surface : '#FFFFFF',
                        },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no">
                      <IconSymbol name="chevron.down" size={9} color={p.title} />
                    </View>
                    <ThemedText style={[chrome.itemDesc, { color: p.desc, flexShrink: 1 }]}>
                      {t('settings.layout.completeInAccordionDescAfter')}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <Switch
                value={completeInAccordion}
                onValueChange={(next) => {
                  void Haptics.selectionAsync();
                  setCompleteInAccordion(next);
                }}
                trackColor={{
                  false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                  true: '#000000',
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                accessibilityLabel={t('settings.layout.completeInAccordionA11y', {
                  action: completeInAccordion
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
            <View style={[chrome.item, { borderTopColor: p.border }]}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="tag"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.iconBorder}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.hideCompleteTape')}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                    {t('settings.layout.hideCompleteTapeDesc')}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={hideCompleteTape}
                onValueChange={(next) => {
                  void Haptics.selectionAsync();
                  setHideCompleteTape(next);
                }}
                trackColor={{
                  false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                  true: '#000000',
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                accessibilityLabel={t('settings.layout.hideCompleteTapeA11y', {
                  action: hideCompleteTape
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
  descWithIcon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 3,
  },
  /** 오늘 탭 행의 펼침(chevron) 버튼과 같은 톤의 미니 칩 */
  expandHintChip: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
