import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '@shared/lib/app-alert';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { buildSettingsPalette, SettingsInkFrame, settingsChromeStyles as chrome } from '../lib/settingsChrome';
import { useProSubscription } from '../model/useProSubscription';
import { SettingsPenIcon } from '../lib/settingsPen';

/** Custom paywall backed by the current RevenueCat Offering. */
export function ProPreviewPage({ onClose, onActivated, onBusyChange }: { onBusyChange?: (busy: boolean) => void; onClose?: () => void; onActivated?: (result: 'purchased' | 'restored') => void } = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const [plan, setPlan] = useState<'monthly' | 'yearly' | null>(null);
  const subscription = useProSubscription();
  useEffect(() => { onBusyChange?.(subscription.busy); }, [subscription.busy, onBusyChange]);
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

  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={chrome.header}>
        <Pressable disabled={subscription.busy} onPress={() => { if (onClose) onClose(); else router.back(); }} accessibilityRole="button" accessibilityLabel={t('settings.back')} style={chrome.headerBtn}>
          <SettingsPenIcon name="chevron.left" size={20} color={p.title} />
        </Pressable>
        <ThemedText style={[chrome.headerTitle, text]}>Pro</ThemedText>
        <View style={chrome.headerBtn} />
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 16 }]}>
        <View style={styles.hero}>
          <View style={[styles.emblem, { backgroundColor: accent }]}>
            <SettingsPenIcon name="pro.crown" size={38} color={p.title} />
          </View>
          <View style={styles.heroCopy}>
            <ThemedText style={[styles.title, text]}>{t('proPreview.title')}</ThemedText>
            <ThemedText style={[styles.subtitle, muted]}>{t('proPreview.subtitle')}</ThemedText>
          </View>
        </View>

        {subscription.isPro ? (
          <View style={[styles.account, { backgroundColor: accent }]}>
            <SettingsInkFrame color={p.title} />
            <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.currentPlan')}</ThemedText>
            <ThemedText style={[styles.benefitTitle, text]}>{subscription.currentPlan ? t(`proPreview.${subscription.currentPlan}`) : subscription.entitlement?.productIdentifier}</ThemedText>
            {expiryLabel ? <ThemedText style={[styles.description, muted]}>{t(subscription.entitlement?.willRenew ? 'proPreview.renewalDate' : 'proPreview.expiryDate')}: {expiryLabel}</ThemedText> : null}
            <ThemedText style={[styles.description, muted]}>{t(subscription.entitlement?.store === 'TEST_STORE' ? 'proPreview.testManage' : 'proPreview.changeNotice')}</ThemedText>
          </View>
        ) : null}
        <View style={{ gap: 12, paddingVertical: 12 }}>
          <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.benefits')}</ThemedText>
          {(['illustratedCalendars', 'unlimitedCalendars', 'calendarIntegration', 'unlimitedDecorations'] as const).map(key => (
            <ThemedText key={key} style={[styles.benefitTitle, text]}>{'· '}{t(`proPreview.${key}`)}</ThemedText>
          ))}
        </View>
        <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.choose')}</ThemedText>
        <View style={styles.plans}>
          {(['monthly', 'yearly'] as const).map((value) => (
            <Pressable key={value} disabled={subscription.busy || !subscription.packages[value]} onPress={() => setPlan(value)} accessibilityRole="radio" accessibilityState={{ checked: selectedPlan === value }} accessibilityLabel={t(`proPreview.${value}`)} style={[styles.plan, selectedPlan === value && { backgroundColor: accent }]}>
              <SettingsInkFrame color={p.title} />
              <View style={styles.planHeading}>
                <ThemedText style={[styles.benefitTitle, text]}>{t(`proPreview.${value}`)}</ThemedText>
                <View style={[styles.radio, { borderColor: p.title }]}>{selectedPlan === value ? <View style={[styles.radioDot, { backgroundColor: p.title }]} /> : null}</View>
              </View>
              <ThemedText style={[styles.price, text]}>{subscription.packages[value]?.product.priceString ?? t(subscription.status === 'loading' ? 'proPreview.loading' : 'proPreview.unavailable')}</ThemedText>
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
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: p.bg, borderTopColor: p.border }]}>
        {!subscription.isPro && subscription.packages[selectedPlan] ? <ThemedText style={[styles.note, muted]}>{t(`proPreview.${selectedPlan}`)} · {subscription.packages[selectedPlan]?.product.priceString}</ThemedText> : null}
        <Pressable onPress={() => void (subscription.isPro ? manage() : submit())} disabled={!canSubmit} accessibilityRole="button" style={[styles.cta, { backgroundColor: p.title, opacity: canSubmit ? 1 : 0.45 }]}>
          <ThemedText style={[styles.benefitTitle, { color: p.bg }]}>{t(subscription.busy ? 'proPreview.processing' : subscription.isPro ? (subscription.currentPlan && subscription.currentPlan !== selectedPlan ? selectedPlan === 'yearly' ? 'proPreview.switchYearly' : 'proPreview.switchMonthly' : 'proPreview.manage') : 'proPreview.subscribe')}</ThemedText>
        </Pressable>
        <Pressable disabled={subscription.busy || subscription.status === 'loading'} onPress={() => void submit(true)} accessibilityRole="button" style={styles.restore}>
          <ThemedText style={[styles.description, text]}>{t('settings.restore.title')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, gap: 14, paddingBottom: 4 },
  heroCopy: { flex: 1, gap: 6 },
  emblem: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { fontSize: 14 },
  title: { fontSize: 22, lineHeight: 30 },
  subtitle: { fontSize: 13, lineHeight: 20 },
  sectionTitle: { fontSize: 16, lineHeight: 24 },
  account: { padding: 20, gap: 10 },
  benefitTitle: { fontSize: 16, lineHeight: 23 },
  description: { fontSize: 12, lineHeight: 18 },
  plans: { flexDirection: 'row', gap: 12 },
  plan: { flex: 1, padding: 13, gap: 5 },
  planHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  price: { fontSize: 18, lineHeight: 28 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 3, borderTopWidth: 0.5 },
  cta: { minHeight: 48, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
  restore: { minHeight: 36, padding: 6, alignItems: 'center', justifyContent: 'center' },
});
