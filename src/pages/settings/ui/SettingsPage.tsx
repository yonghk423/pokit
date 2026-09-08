import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  defaultPriorityWindowFromNow,
  formatHhmmClockKo,
  getLocalDateKey,
  seedPokitWeekTourIntoTodayIfNeeded,
  syncTodayTabWithFixedRoutineApply,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useDayPlanTodoStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  presentCustomerCenter,
  presentPaywall,
  restorePurchases,
  selectIsPro,
  useSubscriptionStore,
} from '@features/subscriptions';
import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { t, useAppLocaleStore } from '@shared/lib/i18n';
import {
  DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY,
  ensureDefaultPriorityCatalog,
  loadFixedFlowSetsState,
  loadPriorityDayStartAlarm,
  resetAppLocalData,
  saveDayPlan,
  saveDayPlanLayoutModeVisibility,
  saveDayPlanTodos,
  saveFixedFlowSetsState,
  saveRoutineCatalogSelectionKeys,
} from '@shared/lib/storage';
import {
  getDisplayedAppVersionLabel,
  openSupportMailComposer,
  SUPPORT_EMAIL,
} from '@shared/lib/support';
import { useAppFontStore, type AppFontId } from '@shared/lib/ui-font';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsRowIcon,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

/** Pro 구독 설정 섹션 — 정식 시행 전까지 숨김 (`true`로 바꾸면 다시 표시) */
const SHOW_POKIT_PRO_SETTINGS = false;

/** 화면 테마(라이트/다크) 설정 — 출시 전까지 숨김 (`true`로 바꾸면 다시 표시) */
const SHOW_APPEARANCE_SETTINGS = false;

/** 설정 → 알림 섹션 — 임시 숨김 (`true`로 바꾸면 다시 표시). 알림 예약 로직은 유지 */
const SHOW_NOTIFICATION_SETTINGS = false;

function fontLabelForId(fontId: AppFontId, locale: 'ko' | 'en' | 'ja'): string {
  if (fontId === 'gaegu') return t('settings.font.gaegu', locale);
  if (fontId === 'songMyung') return t('settings.font.songMyung', locale);
  if (fontId === 'gothicA1') return t('settings.font.gothicA1', locale);
  if (fontId === 'hanken') return t('settings.font.hanken', locale);
  if (fontId === 'dongle') return t('settings.font.dongle', locale);
  return t('settings.font.hiMelody', locale);
}

function fontSizeLabelForId(sizeId: 'sm' | 'md' | 'lg', locale: 'ko' | 'en' | 'ja'): string {
  if (sizeId === 'sm') return t('settings.font.size.sm', locale);
  if (sizeId === 'lg') return t('settings.font.size.lg', locale);
  return t('settings.font.size.md', locale);
}

/** 앱 설정 (로그인·Profile 없음). 문의하기 탭 시 네이티브 메일 작성을 바로 엽니다. */
export function SettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const pageBg = p.bg;
  const appVersionLabel = getDisplayedAppVersionLabel();
  const [isResettingData, setIsResettingData] = useState(false);
  const [isSubscriptionBusy, setIsSubscriptionBusy] = useState(false);
  const locale = useAppLocaleStore((s) => s.locale);
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const appearanceLabel =
    appearanceMode === 'dark' ? t('settings.appearance.dark', locale) : t('settings.appearance.light', locale);
  const appFontId = useAppFontStore((s) => s.fontId);
  const appFontSizeId = useAppFontStore((s) => s.sizeId);
  const fontLabel = `${fontLabelForId(appFontId, locale)} · ${fontSizeLabelForId(appFontSizeId, locale)}`;
  const isPro = useSubscriptionStore(selectIsPro);
  const subscriptionConfigured = useSubscriptionStore((s) => s.isConfigured);
  const { priorityStart, priorityEnd } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
    })),
  );
  const [dayStartAlarmOn, setDayStartAlarmOn] = useState(() => loadPriorityDayStartAlarm().enabled);

  useFocusEffect(
    useCallback(() => {
      setDayStartAlarmOn(loadPriorityDayStartAlarm().enabled);
      if (SHOW_POKIT_PRO_SETTINGS) {
        void useSubscriptionStore.getState().refreshCustomerInfo();
      }
    }, []),
  );

  const runPresentPaywall = async () => {
    if (isSubscriptionBusy) return;
    setIsSubscriptionBusy(true);
    try {
      const outcome = await presentPaywall();
      await useSubscriptionStore.getState().refreshCustomerInfo();
      if (outcome === 'purchased' || outcome === 'restored') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('alert.pro.title', locale), t('alert.pro.activated', locale));
      } else if (outcome === 'error') {
        Alert.alert(
          t('alert.paywall.title', locale),
          t('alert.paywall.error', locale),
        );
      } else if (outcome === 'skipped') {
        Alert.alert(t('alert.subscription.title', locale), t('alert.subscription.unavailable', locale));
      }
    } finally {
      setIsSubscriptionBusy(false);
    }
  };

  const runRestorePurchases = async () => {
    if (isSubscriptionBusy) return;
    setIsSubscriptionBusy(true);
    try {
      const result = await restorePurchases();
      if (result.ok) {
        useSubscriptionStore.getState().applyCustomerInfo(result.customerInfo);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const entitled = selectIsPro(useSubscriptionStore.getState());
        Alert.alert(
          t('alert.restore.title', locale),
          entitled ? t('alert.restore.success', locale) : t('alert.restore.none', locale),
        );
      } else if (result.reason === 'skipped') {
        Alert.alert(t('alert.restore.title', locale), t('alert.restore.unavailable', locale));
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('alert.restore.failed', locale), result.message ?? t('alert.retry', locale));
      }
    } finally {
      setIsSubscriptionBusy(false);
    }
  };

  const runCustomerCenter = async () => {
    if (isSubscriptionBusy) return;
    setIsSubscriptionBusy(true);
    try {
      const outcome = await presentCustomerCenter();
      await useSubscriptionStore.getState().refreshCustomerInfo();
      if (outcome === 'error') {
        Alert.alert(
          t('alert.manage.title', locale),
          t('alert.manage.error', locale),
        );
      } else if (outcome === 'skipped') {
        Alert.alert(t('alert.manage.title', locale), t('alert.manage.unavailable', locale));
      }
    } finally {
      setIsSubscriptionBusy(false);
    }
  };

  const runResetData = async () => {
    if (isResettingData) return;
    setIsResettingData(true);
    try {
      await resetAppLocalData();
      ensureDefaultPriorityCatalog();
      const today = getLocalDateKey();
      const defaultWindow = defaultPriorityWindowFromNow();
      saveRoutineCatalogSelectionKeys([]);
      saveDayPlanLayoutModeVisibility({ ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY });
      saveDayPlanTodos({ todosByDate: {} });

      useDayPlanStore.setState({
        dateKey: today,
        blocks: [],
        completedBlockIds: [],
        skippedBlockIds: [],
        liveActivityChecklistFocusBlockId: null,
        quickMemos: [],
        isHydrated: true,
      });
      saveDayPlan({
        dateKey: today,
        blocks: [],
        completedBlockIds: [],
        skippedBlockIds: [],
        quickMemos: [],
        liveActivityChecklistFocusBlockId: null,
      });

      useDayPlanDraftStore.setState({
        planMode: 'priority',
        isFocusStarted: false,
        completedFocusCategoryKeys: [],
        planCompletionDismissedKeys: [],
        priorityPlanDateKey: today,
        priorityPlanDateKeyEnd: today,
        priorityPlanExplicitMultiDay: false,
        priorityOvernightEndAuto: false,
        priorityStart: defaultWindow.startTime,
        priorityEnd: defaultWindow.endTime,
        priorityCategoryOrder: [],
        priorityCategoryImportance: {},
        routineHistoryPendingByDate: {},
        routineHistoryPlannedKeysByDate: {},
        quickMemoDraft: '',
        priorityMealSlotLayoutEnabled: false,
        prioritySpineLayoutEnabled: false,
        priorityMealSlotOverrides: {},
        prioritySectionsMealSlots: {},
        prioritySectionsLinkMode: 'independent',
        prioritySpineLinkMode: 'independent',
        priorityBagLinkMode: 'independent',
        prioritySectionsCategoryOrder: [],
        waterReminderSyncEpoch: 0,
        isHydrated: true,
      });
      useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
      registerOtherCategoryResolverFromStorage();

      useDayPlanRuntimeStore.getState().stopTicker();
      useDayPlanRuntimeStore.getState().clearRuntime();

      useDayPlanTodoStore.setState({
        todosByDate: {},
        activeDateKey: today,
        isHydrated: true,
      });

      useDayPlanLayoutModeVisibilityStore.setState({
        visibility: { ...DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY },
      });

      // 디스크에 기본 고정 루틴을 먼저 저장한 뒤, 메모리(모드별 적용 포함)를 통째로 다시 맞춤
      const defaultFixedSets = loadFixedFlowSetsState();
      saveFixedFlowSetsState(defaultFixedSets);
      useFixedFlowSetsStore.getState().reloadFromStorage();
      syncTodayTabWithFixedRoutineApply();
      seedPokitWeekTourIntoTodayIfNeeded();

      useHistoryStore.getState().reloadFromStorage();
      useHorizonCompletionStore.getState().reloadFromStorage();
      await useLocalNotificationsStore.getState().refreshPermission();

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('alert.reset.success.title', locale), t('alert.reset.success.message', locale));
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('alert.reset.failed.title', locale), t('alert.reset.failed.message', locale));
    } finally {
      setIsResettingData(false);
    }
  };

  const confirmResetData = () => {
    if (isResettingData) return;
    Alert.alert(
      t('settings.confirmReset.title', locale),
      t('settings.confirmReset.message', locale),
      [
        { text: t('common.cancel', locale), style: 'cancel' },
        { text: t('common.reset', locale), style: 'destructive', onPress: () => void runResetData() },
      ],
    );
  };

  return (
    <ThemedView style={styles.root} lightColor={pageBg} darkColor={pageBg}>
      <View style={styles.foreground}>
        <View
          style={[
            chrome.header,
            {
              paddingTop: insets.top + 8,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.back', locale)}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={chrome.headerBtn}>
            <IconSymbol name="chevron.left" size={20} color={p.title} />
          </Pressable>
          <ThemedText
            style={[chrome.headerTitle, { color: p.title }]}
            lightColor={p.title}
            darkColor={p.title}>
            {t('settings.title', locale)}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            chrome.container,
            {
              paddingTop: 12,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
            <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
              {t('settings.section.dayPlan', locale)}
            </ThemedText>

          <Pressable
            style={[chrome.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/daily-rhythm-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.a11y.dayWindow', locale)}>
            <View style={chrome.itemLeft}>
              <SettingsRowIcon
                name="clock"
                color={p.icon}
                boxBg={p.iconBoxBg}
                border={p.border}
                shadow={p.shadow}
              />
              <View style={chrome.itemTextWrap}>
                <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  {t('settings.dayPlanWindow', locale)}
                </ThemedText>
                <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {formatHhmmClockKo(priorityStart)} – {formatHhmmClockKo(priorityEnd)}
                  {dayStartAlarmOn ? t('settings.dayPlanStartAlarmOn', locale) : ''}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={14} color={p.chevron} />
          </Pressable>

          <Pressable
            style={[chrome.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/guide-book');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.a11y.guide', locale)}>
            <View style={chrome.itemLeft}>
              <SettingsRowIcon
                name="book.fill"
                color={p.icon}
                boxBg={p.iconBoxBg}
                border={p.border}
                shadow={p.shadow}
              />
              <View style={chrome.itemTextWrap}>
                <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  {t('settings.guideBookTitle', locale)}
                </ThemedText>
                <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {t('settings.guideBookDesc', locale)}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={14} color={p.chevron} />
          </Pressable>
        </SettingsSection>

        {SHOW_NOTIFICATION_SETTINGS ? (
          <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
            <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
              {t('settings.section.notification', locale)}
            </ThemedText>

            <Pressable
              style={[chrome.item, { borderTopColor: p.border }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/notification-settings');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('settings.a11y.notification', locale)}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="bell.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.border}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                    {t('settings.notificationTitle', locale)}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                    {t('settings.notificationDesc', locale)}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={14} color={p.chevron} />
            </Pressable>
          </SettingsSection>
        ) : null}

        {SHOW_APPEARANCE_SETTINGS ? (
          <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
            <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
              {t('settings.section.appearance', locale)}
            </ThemedText>

            <Pressable
              style={[chrome.item, { borderTopColor: p.border }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/appearance-settings');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('settings.a11y.appearance', locale)}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="paintbrush.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.border}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                    {t('settings.appearanceTitle', locale)}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                    {appearanceLabel}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={14} color={p.chevron} />
            </Pressable>
          </SettingsSection>
        ) : null}

        <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
          <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
            {t('settings.section.font', locale)}
          </ThemedText>

          <Pressable
            style={[chrome.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/font-settings');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.a11y.font', locale)}>
            <View style={chrome.itemLeft}>
              <SettingsRowIcon
                name="textformat"
                color={p.icon}
                boxBg={p.iconBoxBg}
                border={p.border}
                shadow={p.shadow}
              />
              <View style={chrome.itemTextWrap}>
                <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  {t('settings.fontTitle', locale)}
                </ThemedText>
                <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {fontLabel}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={14} color={p.chevron} />
          </Pressable>
        </SettingsSection>

        {SHOW_POKIT_PRO_SETTINGS ? (
          <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
            <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
              {t('settings.section.pro', locale)}
            </ThemedText>

            <Pressable
              style={[chrome.item, { borderTopColor: p.border }, isSubscriptionBusy && styles.disabledItem]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isPro) {
                  void runCustomerCenter();
                } else {
                  void runPresentPaywall();
                }
              }}
              disabled={isSubscriptionBusy}
              accessibilityRole="button"
              accessibilityLabel={
                isPro ? t('settings.a11y.pro.manage', locale) : t('settings.a11y.pro.subscribe', locale)
              }>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="star.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.border}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                    {isPro ? t('settings.pro.active', locale) : t('settings.pro.start', locale)}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                    {!subscriptionConfigured
                      ? t('settings.pro.moduleMissing', locale)
                      : isPro
                        ? t('settings.pro.manageDesc', locale)
                        : t('settings.pro.featuresDesc', locale)}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={14} color={p.chevron} />
            </Pressable>

            <Pressable
              style={[chrome.item, { borderTopColor: p.border }, isSubscriptionBusy && styles.disabledItem]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void runRestorePurchases();
              }}
              disabled={isSubscriptionBusy}
              accessibilityRole="button"
              accessibilityLabel={t('settings.a11y.restore', locale)}>
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="arrow.clockwise"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.border}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                    {t('settings.restore.title', locale)}
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                    {t('settings.restore.desc', locale)}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={14} color={p.chevron} />
            </Pressable>
          </SettingsSection>
        ) : null}

        <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
          <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
            {t('settings.section.support', locale)}
          </ThemedText>

          <Pressable
            style={[chrome.item, { borderTopColor: p.border }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void openSupportMailComposer();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.a11y.support', locale)}>
            <View style={chrome.itemLeft}>
              <SettingsRowIcon
                name="paperplane.fill"
                color={p.icon}
                boxBg={p.iconBoxBg}
                border={p.border}
                shadow={p.shadow}
              />
              <View style={chrome.itemTextWrap}>
                <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  {t('settings.supportContact', locale)}
                </ThemedText>
                <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {SUPPORT_EMAIL}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={14} color={p.chevron} />
          </Pressable>

          <View style={[chrome.item, styles.infoItem, { borderTopColor: p.border }]}>
            <View style={chrome.itemLeft}>
              <SettingsRowIcon
                name="info.circle"
                color={p.icon}
                boxBg={p.iconBoxBg}
                border={p.border}
                shadow={p.shadow}
              />
              <View style={chrome.itemTextWrap}>
                <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                  {t('settings.appVersion', locale)}
                </ThemedText>
                <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                  {appVersionLabel}
                </ThemedText>
              </View>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
          <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]}>
            {t('settings.section.data', locale)}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              chrome.item,
              { borderTopColor: p.border, backgroundColor: p.dangerBg },
              pressed && { opacity: 0.9 },
              isResettingData && styles.disabledItem,
            ]}
            onPress={confirmResetData}
            disabled={isResettingData}
            accessibilityRole="button"
            accessibilityLabel={t('settings.a11y.reset', locale)}>
            <View style={chrome.itemLeft}>
              <SettingsRowIcon
                name="trash.fill"
                color={p.dangerIcon}
                boxBg={p.dangerBg}
                border={p.border}
                shadow={p.shadow}
              />
              <View style={chrome.itemTextWrap}>
                <ThemedText
                  style={[chrome.itemTitle, { color: p.dangerTitle }]}
                  lightColor={p.dangerTitle}
                  darkColor={p.dangerTitle}>
                  {isResettingData ? t('settings.resetData.loading', locale) : t('settings.resetData', locale)}
                </ThemedText>
                <ThemedText
                  style={[chrome.itemDesc, { color: p.dangerDesc }]}
                  lightColor={p.dangerDesc}
                  darkColor={p.dangerDesc}>
                  {t('settings.resetData.desc', locale)}
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={14} color={p.dangerChevron} />
          </Pressable>
        </SettingsSection>
      </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  foreground: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  infoItem: {
    borderBottomWidth: 0,
  },
  disabledItem: {
    opacity: 0.7,
  },
});
