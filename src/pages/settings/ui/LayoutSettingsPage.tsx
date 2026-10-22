import { HanddrawnToggle } from '@shared/ui/handdrawn-toggle';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
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
  const hideDailyQuote = useDayPlanChromeSettingsStore((s) => s.settings.hideDailyQuote);
  const setHideDailyQuote = useDayPlanChromeSettingsStore((s) => s.setHideDailyQuote);
  const completeInAccordion = useDayPlanChromeSettingsStore((s) => s.settings.completeInAccordion);
  const setCompleteInAccordion = useDayPlanChromeSettingsStore((s) => s.setCompleteInAccordion);
  const showTopAnnouncementsButton = useDayPlanChromeSettingsStore(
    (s) => s.settings.showTopAnnouncementsButton,
  );
  const setShowTopAnnouncementsButton = useDayPlanChromeSettingsStore(
    (s) => s.setShowTopAnnouncementsButton,
  );
  const showTopContactButton = useDayPlanChromeSettingsStore((s) => s.settings.showTopContactButton);
  const setShowTopContactButton = useDayPlanChromeSettingsStore((s) => s.setShowTopContactButton);
  const hideAppUpdateNudge = useDayPlanChromeSettingsStore((s) => s.settings.hideAppUpdateNudge);
  const setHideAppUpdateNudge = useDayPlanChromeSettingsStore((s) => s.setHideAppUpdateNudge);

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
                  name="megaphone.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.iconBorder}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.showTopAnnouncementsButton')}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                    {t('settings.layout.showTopAnnouncementsButtonDesc')}
                  </ThemedText>
                </View>
              </View>
              <HanddrawnToggle
                isDark={isDark}
                checkedColor="#AADBD5"
                checked={showTopAnnouncementsButton}
                onChange={(next) => {
                  void Haptics.selectionAsync();
                  setShowTopAnnouncementsButton(next);
                }}
                label={t('settings.layout.showTopAnnouncementsButtonA11y', {
                  action: showTopAnnouncementsButton
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
            <View style={[chrome.item, { borderTopColor: p.border }]}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="paperplane.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.iconBorder}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.showTopContactButton')}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                    {t('settings.layout.showTopContactButtonDesc')}
                  </ThemedText>
                </View>
              </View>
              <HanddrawnToggle
                isDark={isDark}
                checkedColor="#AADBD5"
                checked={showTopContactButton}
                onChange={(next) => {
                  void Haptics.selectionAsync();
                  setShowTopContactButton(next);
                }}
                label={t('settings.layout.showTopContactButtonA11y', {
                  action: showTopContactButton
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
            <View style={[chrome.item, { borderTopColor: p.border }]}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="arrow.down.app.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.iconBorder}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]}>
                    {t('settings.layout.hideAppUpdateNudge')}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>
                    {t('settings.layout.hideAppUpdateNudgeDesc')}
                  </ThemedText>
                </View>
              </View>
              <HanddrawnToggle
                isDark={isDark}
                checkedColor="#AADBD5"
                checked={hideAppUpdateNudge}
                onChange={(next) => {
                  void Haptics.selectionAsync();
                  setHideAppUpdateNudge(next);
                }}
                label={t('settings.layout.hideAppUpdateNudgeA11y', {
                  action: hideAppUpdateNudge
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
            {FEATURE_FLAGS.dailyQuote ? (
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
              <HanddrawnToggle
                isDark={isDark}
                checkedColor="#AADBD5"
                checked={hideDailyQuote}
                onChange={(next) => {
                  void Haptics.selectionAsync();
                  setHideDailyQuote(next);
                }}
                label={t('settings.layout.hideDailyQuoteA11y', {
                  action: hideDailyQuote
                    ? t('settings.dayPlanView.toggleOff')
                    : t('settings.dayPlanView.toggleOn'),
                })}
              />
            </View>
            ) : null}
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
              <HanddrawnToggle
                isDark={isDark}
                checkedColor="#AADBD5"
                checked={completeInAccordion}
                onChange={(next) => {
                  void Haptics.selectionAsync();
                  setCompleteInAccordion(next);
                }}
                label={t('settings.layout.completeInAccordionA11y', {
                  action: completeInAccordion
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
