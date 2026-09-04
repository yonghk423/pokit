import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import {
  APP_FONT_IDS,
  APP_FONT_SIZE_IDS,
  isSingleFaceAppFont,
  resolveAppFontFamily,
  resolveAppFontSizeScale,
  scaleTypeSize,
  useAppFontSizeScale,
  useAppFontStore,
  type AppFontId,
  type AppFontSizeId,
} from '@shared/lib/ui-font';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

const CHECK_BLACK = '#000000';
const CHECK_MUTED = 'rgba(0,0,0,0.28)';

const FONT_OPTIONS: {
  key: AppFontId;
  labelKey: I18nKey;
  descKey: I18nKey;
  previewKey: I18nKey;
}[] = [
  {
    key: 'dongle',
    labelKey: 'settings.font.dongle',
    descKey: 'settings.font.dongleDesc',
    previewKey: 'settings.font.donglePreview',
  },
  {
    key: 'gaegu',
    labelKey: 'settings.font.gaegu',
    descKey: 'settings.font.gaeguDesc',
    previewKey: 'settings.font.gaeguPreview',
  },
  {
    key: 'songMyung',
    labelKey: 'settings.font.songMyung',
    descKey: 'settings.font.songMyungDesc',
    previewKey: 'settings.font.songMyungPreview',
  },
  {
    key: 'gothicA1',
    labelKey: 'settings.font.gothicA1',
    descKey: 'settings.font.gothicA1Desc',
    previewKey: 'settings.font.gothicA1Preview',
  },
  {
    key: 'hiMelody',
    labelKey: 'settings.font.hiMelody',
    descKey: 'settings.font.hiMelodyDesc',
    previewKey: 'settings.font.hiMelodyPreview',
  },
  {
    key: 'hanken',
    labelKey: 'settings.font.hanken',
    descKey: 'settings.font.hankenDesc',
    previewKey: 'settings.font.hankenPreview',
  },
];

const SIZE_OPTIONS: { key: AppFontSizeId; labelKey: I18nKey }[] = [
  { key: 'sm', labelKey: 'settings.font.size.sm' },
  { key: 'md', labelKey: 'settings.font.size.md' },
  { key: 'lg', labelKey: 'settings.font.size.lg' },
];

/** 설정 → 글씨 크기·글씨체 (ko/en/ja) */
export function FontSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const fontId = useAppFontStore((s) => s.fontId);
  const setFontId = useAppFontStore((s) => s.setFontId);
  const sizeId = useAppFontStore((s) => s.sizeId);
  const setSizeId = useAppFontStore((s) => s.setSizeId);
  const sizeScale = useAppFontSizeScale();
  const segmentFontFamily = resolveAppFontFamily(fontId, '700');
  const segmentFontWeight = isSingleFaceAppFont(fontId) ? ('400' as const) : ('700' as const);
  const checkOn = isDark ? '#FAFAFA' : CHECK_BLACK;
  const checkOff = isDark ? 'rgba(255,255,255,0.35)' : CHECK_MUTED;
  const segmentIdleBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const segmentActiveBg = isDark ? '#FAFAFA' : '#000000';
  const segmentActiveFg = isDark ? '#111111' : '#FFFFFF';
  const segmentIdleFg = p.title;

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
          <ThemedText
            style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}
            lightColor={p.title}
            darkColor={p.title}>
            {t('settings.fontTitle')}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <SettingsSection border={p.border} surface={p.surface} isDark={isDark}>
            <View style={styles.sizeBlock}>
              <View
                style={[
                  styles.sizeSegmentRow,
                  {
                    borderColor: p.border,
                    backgroundColor: segmentIdleBg,
                  },
                ]}>
                {SIZE_OPTIONS.filter((opt) => APP_FONT_SIZE_IDS.includes(opt.key)).map((opt) => {
                  const active = sizeId === opt.key;
                  const optScale = resolveAppFontSizeScale(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      accessibilityRole="button"
                      accessibilityLabel={t(opt.labelKey)}
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        if (active) return;
                        setSizeId(opt.key);
                        void Haptics.selectionAsync();
                      }}
                      style={[
                        styles.sizeSegment,
                        active && {
                          backgroundColor: segmentActiveBg,
                          borderColor: p.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.sizeSegmentLabel,
                          segmentFontFamily ? { fontFamily: segmentFontFamily } : null,
                          {
                            color: active ? segmentActiveFg : segmentIdleFg,
                            fontSize: scaleTypeSize(13, optScale),
                            fontWeight: segmentFontWeight,
                          },
                        ]}>
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.familyDivider, { backgroundColor: p.border }]} />

            <ThemedText style={[styles.blockLabel, styles.familyLabel, { color: p.sectionTitle }]}>
              {t('settings.font.familySection')}
            </ThemedText>

            {FONT_OPTIONS.filter((opt) => APP_FONT_IDS.includes(opt.key)).map((opt, index) => {
              const active = fontId === opt.key;
              const sampleFamily = resolveAppFontFamily(opt.key, '700');
              const labelFamily = resolveAppFontFamily(opt.key, '600');
              const descFamily = resolveAppFontFamily(opt.key, '400');
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    chrome.item,
                    styles.fontItem,
                    { borderTopColor: p.border },
                    index === 0 && styles.firstFamilyItem,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    if (active) return;
                    setFontId(opt.key);
                    void Haptics.selectionAsync();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(opt.labelKey)}
                  accessibilityState={{ selected: active }}>
                  <View style={[chrome.itemLeft, styles.fontItemLeft]}>
                    <View style={chrome.itemTextWrap}>
                      <Text
                        style={[
                          styles.previewSample,
                          sampleFamily ? { fontFamily: sampleFamily } : null,
                          {
                            color: p.title,
                            fontSize: scaleTypeSize(22, sizeScale),
                            lineHeight: scaleTypeSize(28, sizeScale),
                          },
                        ]}
                        numberOfLines={1}>
                        {t(opt.previewKey)}
                      </Text>
                      <Text
                        style={[
                          chrome.itemTitle,
                          labelFamily ? { fontFamily: labelFamily } : null,
                          {
                            color: p.title,
                            fontSize: scaleTypeSize(16, sizeScale),
                            lineHeight: scaleTypeSize(22, sizeScale),
                          },
                        ]}
                        numberOfLines={1}>
                        {t(opt.labelKey)}
                      </Text>
                      <Text
                        style={[
                          chrome.itemDesc,
                          descFamily ? { fontFamily: descFamily } : null,
                          {
                            color: p.desc,
                            fontSize: scaleTypeSize(13, sizeScale),
                            lineHeight: scaleTypeSize(18, sizeScale),
                          },
                        ]}
                        numberOfLines={2}>
                        {t(opt.descKey)}
                      </Text>
                    </View>
                  </View>
                  <IconSymbol
                    name={active ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={active ? checkOn : checkOff}
                  />
                </Pressable>
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
  sizeBlock: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  familyLabel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sizeSegmentRow: {
    flexDirection: 'row',
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    gap: 0,
  },
  sizeSegment: {
    flex: 1,
    minHeight: 32,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  sizeSegmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  familyDivider: {
    height: RETRO_BORDER_WIDTH,
    width: '100%',
  },
  firstFamilyItem: {
    borderTopWidth: 0,
  },
  fontItem: {
    minHeight: 88,
    alignItems: 'center',
  },
  fontItemLeft: {
    gap: 0,
  },
  previewSample: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
});
