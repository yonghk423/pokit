import { Image } from 'expo-image';
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '@shared/lib/app-alert';
import { PRIVACY_POLICY_URL } from '@shared/config/privacyPolicy';
import { openWebLink } from '@shared/lib/url/openWebLink';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { buildSettingsPalette, SettingsInkFrame, settingsChromeStyles as chrome } from '../lib/settingsChrome';
import { useProSubscription } from '../model/useProSubscription';
import { SettingsPenIcon } from '../lib/settingsPen';
import { CityCalendarPackCover } from '../../day-plan/ui/CityCalendarPackCover';

const PRO_SCREENS = {
  ko: {
    photo: require('../../../../assets/pro-introduction/05-ko.webp'),
    colors: require('../../../../assets/pro-introduction/colors.webp'),
    icons: require('../../../../assets/pro-introduction/icons.webp'),
    cameras: require('../../../../assets/pro-introduction/cameras.webp'),
    trash: require('../../../../assets/pro-introduction/trash.webp'),
    clips: require('../../../../assets/pro-introduction/clips-en.webp'),
  },
  en: {
    photo: require('../../../../assets/pro-introduction/05-en.webp'),
    colors: require('../../../../assets/pro-introduction/colors.webp'),
    icons: require('../../../../assets/pro-introduction/icons.webp'),
    cameras: require('../../../../assets/pro-introduction/cameras-en.webp'),
    trash: require('../../../../assets/pro-introduction/trash-en.webp'),
    clips: require('../../../../assets/pro-introduction/clips-en.webp'),
  },
};
const RevealVisibleContext = createContext(false);
const RevealProgressContext = createContext<Animated.Value | null>(null);

function ProAppScreens({ screens }: { screens: readonly (keyof typeof PRO_SCREENS.ko)[] }) {
  const { locale, t } = useTranslation();
  const sources = PRO_SCREENS[locale === 'ko' ? 'ko' : 'en'];
  return <View style={styles.appScreens}>
    {screens.map((screen, index) => <ProReveal key={screen} delayMs={index * (screens.length === 2 ? 450 : 220)} offsetX={screens.length === 2 ? (index === 0 ? -20 : 20) : 0} style={[styles.appScreen, screens.length === 1 && styles.appScreenSingle, screens.length === 3 && styles.appScreenTrio]}>
      <Image source={sources[screen]} accessibilityLabel={t(`proPreview.screen.${screen}`)} contentFit="contain" transition={0} style={[styles.appScreenImage, { aspectRatio: screen === 'photo' ? 1100 / 2340 : 1206 / 2160 }]} />
    </ProReveal>)}
  </View>;
}

const ProScrollContext = createContext<Animated.Value | null>(null);

/** Play only while the full-screen film preview is visible on the active page. */
function FilmFilterPreview() {
  const { t } = useTranslation();
  const scrollY = useContext(ProScrollContext);
  const { height } = useWindowDimensions();
  const target = useRef<View>(null);
  const image = useRef<Image>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { live = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (!scrollY) return;
    let live = true;
    let measuring = false;
    let frame: number | undefined;
    const check = () => {
      if (!live || measuring || !target.current) return;
      measuring = true;
      target.current.measureInWindow((_x, y, _width, viewHeight) => {
        measuring = false;
        if (!live) return;
        const overlap = Math.min(y + viewHeight, height - 140) - Math.max(y, 80);
        setVisible(viewHeight > 0 && overlap >= Math.min(viewHeight * 0.18, 120));
      });
    };
    const schedule = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => { frame = undefined; check(); });
    };
    const id = scrollY.addListener(schedule);
    schedule();
    return () => { live = false; if (frame !== undefined) cancelAnimationFrame(frame); scrollY.removeListener(id); };
  }, [scrollY, height]);
  const playing = visible && active && focused && !reduceMotion;
  useEffect(() => {
    if (!ready) return;
    const player = image.current;
    if (playing) void player?.startAnimating().catch(() => {});
    else void player?.stopAnimating().catch(() => {});
    return () => { void player?.stopAnimating().catch(() => {}); };
  }, [playing, ready]);
  return <View ref={target} collapsable={false} testID="pro-film-filter-preview">
    <Image ref={image}
      source={reduceMotion ? require('../../../../assets/pro-introduction/film-full-screen-poster.webp') : require('../../../../assets/pro-introduction/film-full-screen-switch.webp')}
      useAppleWebpCodec={false}
      autoplay={playing} onDisplay={() => setReady(true)}
      accessibilityLabel={t('proPreview.screen.photo')}
      contentFit="contain" transition={0}
      style={{ width: '100%', aspectRatio: 600 / 1304 }} />
  </View>;
}

/** Replay on re-entry, resetting only after the stable view leaves the viewport. */
function ProReveal({ children, style, delayMs = 0, offsetX = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delayMs?: number; offsetX?: number }) {
  const scrollY = useContext(ProScrollContext);
  const { height } = useWindowDimensions();
  const target = useRef<View>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { live = false; listener.remove(); };
  }, []);
  const [entrance] = useState(() => new Animated.Value(1));
  const shown = useRef(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!scrollY || reduceMotion) return;
    let active = true;
    let measuring = false;
    let frame: number | undefined;
    if (!shown.current) entrance.setValue(0);
    const checkVisibility = () => {
      if (!active || measuring || !target.current) return;
      measuring = true;
      // Measure the stable outer view in screen coordinates. The animated inner
      // view must not move the trigger, and nested sections have local offsets.
      target.current?.measureInWindow((_x, y, _width, viewHeight) => {
        measuring = false;
        if (!active || viewHeight <= 0) return;
        // Keep a small gap between exit and entry thresholds so slow scrolling
        // near the edge cannot repeatedly restart a running animation.
        const outside = y >= height - 100 || y + viewHeight <= 80;
        if (outside) {
          if (shown.current) {
            shown.current = false;
            entrance.stopAnimation();
            entrance.setValue(0);
            setVisible(false);
          }
          return;
        }
        if (shown.current || y >= height - 160 || y + viewHeight <= 100) return;
        shown.current = true;
        setVisible(true);
        Animated.timing(entrance, { toValue: 1, duration: 950, delay: delayMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    };
    const scheduleCheck = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => { frame = undefined; checkVisibility(); });
    };
    const id = scrollY.addListener(scheduleCheck);
    scheduleCheck();
    return () => {
      active = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
      scrollY.removeListener(id);
      entrance.stopAnimation();
    };
  }, [scrollY, height, reduceMotion, entrance, delayMs]);
  return <View ref={target} collapsable={false} style={style}>
    <Animated.View style={reduceMotion ? undefined : { opacity: entrance, transform: [{ translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [offsetX, 0] }) }, { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
      <RevealVisibleContext.Provider value={visible}><RevealProgressContext.Provider value={reduceMotion ? null : entrance}>{children}</RevealProgressContext.Provider></RevealVisibleContext.Provider>
    </Animated.View>
  </View>;
}

const CALENDAR_ATTACH_INTERVAL = 520;
const CALENDAR_ATTACH_DURATION = 850;

function CalendarWallEntry({ children, label, width, index, delayMs = index * CALENDAR_ATTACH_INTERVAL, shadow = true }: {
  children: ReactNode; label: string; width: number; index: number; delayMs?: number; shadow?: boolean;
}) {
  const progress = useContext(RevealProgressContext);
  const visible = useContext(RevealVisibleContext);
  const [attachment] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!progress) return;
    attachment.setValue(0);
    if (!visible) return;
    const animation = Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(attachment, { toValue: 1, duration: CALENDAR_ATTACH_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [attachment, progress, visible, delayMs]);
  return <Animated.View accessible accessibilityLabel={label} style={[shadow && styles.calendarWallCard, { width }, progress ? {
    opacity: attachment.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: attachment.interpolate({ inputRange: [0, 0.76, 1], outputRange: [-18, 1, 0] }) },
      { scale: attachment.interpolate({ inputRange: [0, 0.76, 1], outputRange: [1.07, 0.997, 1] }) },
    ],
  } : undefined]}>
    {children}
  </Animated.View>;
}

function CalendarWallCard({ pack, label, width, index, month }: {
  pack: 'everyday' | 'warm-sepia' | 'season-winter' | 'citypop-retro' | 'textured-watercolor';
  label: string; width: number; index: number; month: Date;
}) {
  return <CalendarWallEntry label={label} width={width} index={index}>
    <CityCalendarPackCover width={width} month={month} pack={pack} borderRadius={0} cropToGrid={false} />
  </CalendarWallEntry>;
}

function IllustratedCalendarShowcase({ titleColor, detailColor }: { titleColor: string; detailColor: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const month = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  const wallWidth = Math.max(1, Math.min(screenWidth, 600) - 40);
  const cardWidth = Math.floor((wallWidth - 28) / 3);
  const items = [
    ['everyday', 'proPreview.calendarEveryday'],
    ['warm-sepia', 'proPreview.calendarSepia'],
    ['season-winter', 'proPreview.calendarWinter'],
    ['citypop-retro', 'proPreview.calendarRetro'],
    ['textured-watercolor', 'proPreview.calendarWatercolor'],
  ] as const;
  return <View style={styles.showcase}>
    <ThemedText style={[styles.showcaseKicker, { color: detailColor }]}>01 / {t('proPreview.calendarShowcaseKicker')}</ThemedText>
    <ThemedText style={[styles.showcaseTitle, { color: titleColor }]}>{t('proPreview.calendarShowcaseTitle')}</ThemedText>
    <ThemedText style={[styles.showcaseCopy, { color: detailColor }]}>{t('proPreview.calendarShowcaseDesc')}</ThemedText>
    <View testID="pro-calendar-photo-wall" style={styles.showcaseCovers}>
      {items.map(([pack, label], index) => <CalendarWallCard key={pack} pack={pack} label={t(label)} width={cardWidth} index={index} month={month} />)}
      <CalendarWallEntry width={cardWidth} index={items.length}
        label={`${t('proPreview.futureCalendarsTitle')} ${t('proPreview.futureCalendarsDetail')}`}
        delayMs={(items.length - 1) * CALENDAR_ATTACH_INTERVAL + CALENDAR_ATTACH_DURATION + 120} shadow={false}>
        <View style={[styles.futureCalendar, { height: cardWidth * 1896 / 830, borderColor: detailColor }]}>
          <ThemedText accessible={false} style={{ color: detailColor, fontSize: 26, lineHeight: 32 }}>+</ThemedText>
          <ThemedText style={[styles.futureCalendarTitle, { color: titleColor }]}>{t('proPreview.futureCalendarsTitle')}</ThemedText>
          <ThemedText style={[styles.futureCalendarDetail, { color: detailColor }]}>{t('proPreview.futureCalendarsDetail')}</ThemedText>
        </View>
      </CalendarWallEntry>
    </View>
  </View>;
}

/** Custom paywall backed by the current RevenueCat Offering. */
export function ProPreviewPage({ onClose, onActivated, onBusyChange, storeItems }: { storeItems?: boolean; onBusyChange?: (busy: boolean) => void; onClose?: () => void; onActivated?: (result: 'purchased' | 'restored') => void } = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const p = { ...buildSettingsPalette(isDark), bg: isDark ? '#1C1C1E' : '#F7F6F4' };
  const [scrollY] = useState(() => new Animated.Value(0));
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true });
  const [plan, setPlan] = useState<'monthly' | 'yearly' | null>(null);
  const subscription = useProSubscription(storeItems);
  const openLegalLink = async (url: string) => {
    if (!await openWebLink(url)) {
      AppAlert.alert(t('settings.privacyPolicy.openFailedTitle'), t('settings.privacyPolicy.openFailedBody'));
    }
  };
  useEffect(() => { onBusyChange?.(subscription.busy); }, [subscription.busy, onBusyChange]);
  const monthly = subscription.packages.monthly?.product;
  const yearly = subscription.packages.yearly?.product;
  const annualSavings = monthly && yearly && monthly.currencyCode === yearly.currencyCode && monthly.price > 0 && yearly.price > 0
    ? Math.round(100 * (1 - yearly.price / (12 * monthly.price)))
    : 0;
  const preferredPlan = plan ?? subscription.currentPlan ?? 'monthly';
  const selectedPlan = subscription.packages[preferredPlan] ? preferredPlan : subscription.packages.yearly ? 'yearly' : 'monthly';
  const expiry = subscription.entitlement?.expirationDate;
  const expiryDate = expiry ? new Date(expiry) : null;
  const expiryLabel = expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate.toLocaleString(locale) : null;
  const manage = async () => {
    const result = await subscription.manage();
    if (result !== 'opened') AppAlert.alert(t('proPreview.manage'), t(result === 'test_store' ? 'proPreview.testManage' : result === 'error' ? 'proPreview.failed' : 'alert.manage.unavailable'));
  };
  const canSubmit = !subscription.busy && (subscription.isPro || (subscription.status === 'ready' && !!subscription.packages[selectedPlan]));
  const accent = isDark ? '#394B40' : '#E4EBDD';
  const submit = async (restore = false) => {
    const result = await subscription.transact(restore ? undefined : selectedPlan);
    if (result === 'cancelled') return;
    if (result === 'active' && onActivated) { onActivated(restore ? 'restored' : 'purchased'); return; }
    AppAlert.alert(t('alert.pro.title'), result === 'active' ? t('alert.pro.activated') : result === 'none' ? t(restore ? 'alert.restore.none' : 'proPreview.pending') : t(result === 'unavailable' ? 'alert.subscription.unavailable' : 'proPreview.failed'));
  };
  const text = { color: p.title };
  const muted = { color: p.desc };

  const benefits = <>
    {([
      ['proPreview.filterTitle', 'proPreview.filterDetail', ['photo']],
      ['proPreview.customizationTitle', 'proPreview.customizationDetail', ['colors', 'icons']],
      ['proPreview.proToolsTitle', 'proPreview.proToolsDetail', ['cameras', 'trash', 'clips']],
    ] as const).map(([title, detail, screens], index) => <View key={title} style={[styles.benefitSection, { borderBottomColor: p.border }]}>
      <ProReveal>
        <View style={{ gap: 14 }}>
        <ThemedText style={[styles.showcaseKicker, muted]}>{String(index + 2).padStart(2, '0')} / PRO</ThemedText>
        <ThemedText style={[styles.showcaseTitle, text]}>{t(title)}</ThemedText>
        <ThemedText style={[styles.showcaseCopy, muted]}>{t(detail)}</ThemedText>
        </View>
      </ProReveal>
      {screens[0] === 'photo' ? <ProReveal style={{ width: '100%', maxWidth: 300, alignSelf: 'center' }}><FilmFilterPreview /></ProReveal> : <ProAppScreens screens={screens} />}
    </View>)}
    <ProReveal>
      <View style={[styles.benefitSection, { borderBottomColor: p.border }]}>
        <ThemedText style={[styles.showcaseKicker, muted]}>05 / PRO</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <SettingsPenIcon name="calendar" size={36} color={p.title} />
          <ThemedText style={[styles.showcaseTitle, text, { flex: 1 }]}>{t('proPreview.calendarIntegration')}</ThemedText>
        </View>
        <ThemedText style={[styles.showcaseCopy, muted]}>{t('proPreview.calendarIntegrationDetail')}</ThemedText>
      </View>
    </ProReveal>
    <View style={styles.benefitFootnote}>
      <ThemedText style={[styles.storeBenefit, muted]}>{t('proPreview.futureFeatures')}</ThemedText>
      <ThemedText style={[styles.description, muted]}>{t('proPreview.freeCalendars')}</ThemedText>
    </View>
  </>;

  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={chrome.header}>
        <Pressable disabled={subscription.busy} onPress={() => { if (onClose) onClose(); else router.back(); }} accessibilityRole="button" accessibilityLabel={t('settings.back')} style={chrome.headerBtn}>
          <SettingsPenIcon name="chevron.left" size={20} color={p.title} />
        </Pressable>
        <ThemedText style={[chrome.headerTitle, text]}>Pro</ThemedText>
        <View style={chrome.headerBtn} />
      </View>
      <ProScrollContext.Provider value={scrollY}><Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 16 }]}>
        <View style={styles.hero}>
          <View style={[styles.emblem, { backgroundColor: accent }]}><SettingsPenIcon name="pro.crown" size={38} color={p.title} /></View>
          <View style={styles.heroCopy}>
            <ThemedText style={[styles.title, text]}>{t('proPreview.title')}</ThemedText>
            <ThemedText style={[styles.subtitle, muted]}>{t('proPreview.subtitle')}</ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.choose')}</ThemedText>
        {subscription.isPro ? (
          <View style={[styles.account, { backgroundColor: accent }]}>
            <SettingsInkFrame color={p.title} />
            <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.currentPlan')}</ThemedText>
            <ThemedText style={[styles.benefitTitle, text]}>{subscription.currentPlan ? t(`proPreview.${subscription.currentPlan}`) : subscription.entitlement?.productIdentifier}</ThemedText>
            {expiryLabel ? <ThemedText style={[styles.description, muted]}>{t(subscription.entitlement?.willRenew ? 'proPreview.renewalDate' : 'proPreview.expiryDate')}: {expiryLabel}</ThemedText> : null}
            <ThemedText style={[styles.description, muted]}>{t(subscription.entitlement?.store === 'TEST_STORE' ? 'proPreview.testManage' : 'proPreview.changeNotice')}</ThemedText>
          </View>
        ) : null}
        <View style={styles.plans}>
          {(['yearly', 'monthly'] as const).map((value) => (
            <Pressable key={value} disabled={subscription.busy || !subscription.packages[value]} onPress={() => setPlan(value)} accessibilityRole="radio" accessibilityState={{ checked: selectedPlan === value }} accessibilityLabel={t(`proPreview.${value}`)} style={[styles.plan, selectedPlan === value && { backgroundColor: accent }]}>
              <SettingsInkFrame color={p.title} />
              <View style={styles.planHeading}>
                <ThemedText style={[styles.benefitTitle, text]}>{t(`proPreview.${value}`)}</ThemedText>
                <View style={[styles.radio, { borderColor: p.title }]}>{selectedPlan === value ? <View style={[styles.radioDot, { backgroundColor: p.title }]} /> : null}</View>
              </View>
              <ThemedText style={[styles.price, text]}>{subscription.packages[value]?.product.priceString ?? t(subscription.status === 'loading' ? 'proPreview.loading' : 'proPreview.unavailable')}</ThemedText>
              {value === 'yearly' && yearly?.pricePerMonthString && annualSavings > 0 && (
                <ThemedText style={[styles.description, text]}>{t('proPreview.annualSavings', { price: yearly.pricePerMonthString, percent: annualSavings })}</ThemedText>
              )}
              <ThemedText style={[styles.description, muted]}>{t(subscription.currentPlan === value ? 'proPreview.currentPlan' : `proPreview.${value}Desc`)}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText style={[styles.note, muted]}>{t('proPreview.billingNotice')}</ThemedText>
        {(subscription.status === 'error' || subscription.status === 'unavailable') ? (
          <Pressable onPress={() => void subscription.reload()} accessibilityRole="button" style={styles.restore}>
            <ThemedText style={[styles.note, muted]}>{t('proPreview.loadError')}</ThemedText>
            <ThemedText style={[styles.description, text]}>{t('proPreview.retry')}</ThemedText>
          </Pressable>
        ) : null}
        <View style={styles.benefitTableSection}>
          <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.table.title')}</ThemedText>
          <ThemedText style={[styles.description, muted]}>{t('proPreview.table.note')}</ThemedText>
          <View style={[styles.benefitTable, { borderColor: p.border }]}>
            <View style={[styles.benefitTableRow, { backgroundColor: accent }]}>
              <ThemedText style={[styles.benefitTableName, styles.description, text]}>{t('proPreview.table.feature')}</ThemedText>
              <ThemedText style={[styles.benefitTableValue, styles.description, text]}>Pro</ThemedText>
            </View>
            {(['calendars', 'films', 'writing', 'tools', 'calendarSync', 'future'] as const).map(key => (
              <View key={key} accessible accessibilityLabel={`${t(`proPreview.table.${key}`)}, ${t('proPreview.table.included')}`} style={[styles.benefitTableRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border }]}>
                <ThemedText style={[styles.benefitTableName, styles.description, text]}>{t(`proPreview.table.${key}`)}</ThemedText>
                <ThemedText style={[styles.benefitTableValue, styles.description, text]}>{t('proPreview.table.included')}</ThemedText>
              </View>
            ))}
          </View>
        </View>
        <ProReveal><IllustratedCalendarShowcase titleColor={p.title} detailColor={p.desc} /></ProReveal>

        {benefits}
      </Animated.ScrollView></ProScrollContext.Provider>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: p.bg, borderTopColor: p.border }]}>
        {!subscription.isPro && subscription.packages[selectedPlan] ? <ThemedText style={[styles.note, muted]}>{t(`proPreview.${selectedPlan}`)} · {subscription.packages[selectedPlan]?.product.priceString}</ThemedText> : null}
        <Pressable onPress={() => void (subscription.isPro ? manage() : submit())} disabled={!canSubmit} accessibilityRole="button" style={[styles.cta, { backgroundColor: p.title, opacity: canSubmit ? 1 : 0.45 }]}>
          <ThemedText style={[styles.benefitTitle, { color: p.bg }]}>{t(subscription.busy ? 'proPreview.processing' : subscription.isPro ? (subscription.currentPlan && subscription.currentPlan !== selectedPlan ? selectedPlan === 'yearly' ? 'proPreview.switchYearly' : 'proPreview.switchMonthly' : 'proPreview.manage') : 'proPreview.subscribe')}</ThemedText>
        </Pressable>
        <Pressable disabled={subscription.busy || subscription.status === 'loading'} onPress={() => void submit(true)} accessibilityRole="button" style={styles.restore}>
          <ThemedText style={[styles.description, text]}>{t('settings.restore.title')}</ThemedText>
        </Pressable>
        <View style={styles.legalLinks}>
          <Pressable accessibilityRole="link" onPress={() => void openLegalLink('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} style={styles.legalLink}>
            <ThemedText style={[styles.note, muted]}>{t('proPreview.termsOfUse')}</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => void openLegalLink(PRIVACY_POLICY_URL)} style={styles.legalLink}>
            <ThemedText style={[styles.note, muted]}>{t('settings.privacyPolicy.title')}</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitTableSection: { gap: 12, paddingVertical: 20 },
  benefitTable: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  benefitTableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  benefitTableName: { flex: 1, flexShrink: 1 },
  benefitTableValue: { width: 76, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16 },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  root: { flex: 1 },
  appScreens: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 16, paddingBottom: 8 },
  appScreen: { flex: 1, maxWidth: 240 },
  appScreenSingle: { maxWidth: 260 },
  appScreenTrio: { flex: 1, minWidth: 0, maxWidth: '33.333%' },
  appScreenImage: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  benefitFootnote: { gap: 12, paddingVertical: 28 },
  benefitSection: { gap: 14, paddingVertical: 36, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { paddingHorizontal: 20, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  hero: { alignItems: 'center', paddingTop: 8, gap: 18, paddingBottom: 36 },
  showcase: { width: '100%', paddingVertical: 32, gap: 14, borderRadius: 2 },
  showcaseKicker: { fontSize: 10, lineHeight: 14, letterSpacing: 1.2, fontWeight: '700' },
  showcaseTitle: { fontSize: 21, lineHeight: 29, letterSpacing: -0.4, fontWeight: '600' },
  showcaseCopy: { fontSize: 13, lineHeight: 21 },
  showcaseCovers: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', columnGap: 14, rowGap: 22, paddingTop: 16, paddingBottom: 10 },
  calendarWallCard: { shadowColor: '#30291F', shadowOffset: { width: 1, height: 5 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 3 },
  futureCalendar: { borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', padding: 8, gap: 10, alignItems: 'center', justifyContent: 'center' },
  futureCalendarTitle: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  futureCalendarDetail: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  showcaseLabel: { maxWidth: '100%', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  heroCopy: { width: '100%', gap: 14, alignItems: 'center' },
  emblem: { alignSelf: 'center', width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { fontSize: 14 },
  title: { fontSize: 25, lineHeight: 34, letterSpacing: -0.6, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
  sectionTitle: { fontSize: 18, lineHeight: 26, letterSpacing: -0.3 },
  account: { padding: 20, gap: 10 },
  benefitTitle: { fontSize: 14, lineHeight: 21 },
  storeBenefit: { fontSize: 13, lineHeight: 20 },
  description: { fontSize: 12, lineHeight: 18 },
  plans: { flexDirection: 'row', gap: 12 },
  plan: { flex: 1, padding: 13, gap: 5 },
  planHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  price: { fontSize: 18, lineHeight: 28 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 3, borderTopWidth: 0.5 },
  cta: { borderRadius: 26, minHeight: 52, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
  restore: { minHeight: 36, padding: 6, alignItems: 'center', justifyContent: 'center' },
});
