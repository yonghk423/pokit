import { useState } from 'react';
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
export function ProPreviewPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const [plan, setPlan] = useState<'monthly' | 'yearly' | null>(null);
  const subscription = useProSubscription();
  const preferredPlan = plan ?? subscription.currentPlan ?? 'yearly';
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
    AppAlert.alert(t('alert.pro.title'), result === 'active' ? t('alert.pro.activated') : result === 'none' ? t(restore ? 'alert.restore.none' : 'proPreview.pending') : t(result === 'unavailable' ? 'alert.subscription.unavailable' : 'proPreview.failed'));
  };
  const text = { color: p.title };
  const muted = { color: p.desc };

  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top + 8 }]}>
      <View style={chrome.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('settings.back')} style={chrome.headerBtn}>
          <SettingsPenIcon name="chevron.left" size={20} color={p.title} />
        </Pressable>
        <ThemedText style={[chrome.headerTitle, text]}>Pro</ThemedText>
        <View style={chrome.headerBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.hero}>
          <View style={[styles.emblem, { backgroundColor: accent }]}>
            <SettingsPenIcon name="pro.crown" size={62} color={p.title} />
          </View>
          <ThemedText style={[styles.eyebrow, muted]}>{subscription.isPro ? t('settings.pro.active') : 'Pro'}</ThemedText>
          <ThemedText style={[styles.title, text]}>{t('proPreview.title')}</ThemedText>
          <ThemedText style={[styles.subtitle, muted]}>{t('proPreview.subtitle')}</ThemedText>
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
        <View style={styles.benefits}>
          <ThemedText style={[styles.sectionTitle, text]}>{t('proPreview.benefits')}</ThemedText>
          {(['ai', 'decorate', 'insights'] as const).map((key, index) => (
            <View key={key} style={styles.benefit}>
              <SettingsPenIcon name={['pencil', 'paintbrush.fill', 'book.fill'][index]} size={28} color={p.title} />
              <View style={styles.copy}>
                <ThemedText style={[styles.benefitTitle, text]}>{t(`proPreview.${key}`)}</ThemedText>
                <ThemedText style={[styles.description, muted]}>{t(`proPreview.${key}Desc`)}</ThemedText>
              </View>
            </View>
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
        <Pressable onPress={() => void (subscription.isPro ? manage() : submit())} disabled={!canSubmit} accessibilityRole="button" style={[styles.cta, { backgroundColor: p.title, opacity: canSubmit ? 1 : 0.45 }]}>
          <ThemedText style={[styles.benefitTitle, { color: p.bg }]}>{t(subscription.busy ? 'proPreview.processing' : subscription.isPro ? (subscription.currentPlan && subscription.currentPlan !== selectedPlan ? selectedPlan === 'yearly' ? 'proPreview.switchYearly' : 'proPreview.switchMonthly' : 'proPreview.manage') : 'proPreview.subscribe')}</ThemedText>
        </Pressable>
        <ThemedText style={[styles.note, muted]}>{t('proPreview.billingNotice')}</ThemedText>
        {(subscription.status === 'error' || subscription.status === 'unavailable') ? (
          <Pressable onPress={() => void subscription.reload()} accessibilityRole="button" style={styles.restore}>
            <ThemedText style={[styles.note, muted]}>{t('proPreview.loadError')}</ThemedText>
            <ThemedText style={[styles.description, text]}>{t('proPreview.retry')}</ThemedText>
          </Pressable>
        ) : null}
        <Pressable disabled={subscription.busy || subscription.status === 'loading'} onPress={() => void submit(true)} accessibilityRole="button" style={styles.restore}>
          <ThemedText style={[styles.description, text]}>{t('settings.restore.title')}</ThemedText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 18, width: '100%', maxWidth: 600, alignSelf: 'center' },
  hero: { alignItems: 'center', paddingTop: 18, gap: 12, paddingBottom: 12 },
  emblem: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { fontSize: 14 },
  title: { fontSize: 28, lineHeight: 39, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 25, textAlign: 'center' },
  sectionTitle: { fontSize: 19, lineHeight: 28 },
  account: { padding: 20, gap: 10 },
  benefits: { gap: 20, paddingVertical: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  copy: { flex: 1, gap: 4 },
  benefitTitle: { fontSize: 18, lineHeight: 27 },
  description: { fontSize: 14, lineHeight: 22 },
  plans: { flexDirection: 'row', gap: 12 },
  plan: { flex: 1, padding: 17, gap: 10 },
  planHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  price: { fontSize: 18, lineHeight: 28 },
  cta: { paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  note: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
  restore: { padding: 10, alignItems: 'center' },
});
