import { SettingsInkFrame } from '../lib/settingsChrome';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CityPopSpacing,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import {
  APP_FONT_IDS,
  APP_FONT_SIZE_IDS,
  isSingleFaceAppFont,
  resolveAppFontFamily,
  resolveAppFontOpticalScale,
  resolveAppFontSizeScale,
  scaleTypeSize,
  useAppFontSizeScale,
  useAppFontStore,
  type AppFontId,
  type AppFontSizeId,
} from '@shared/lib/ui-font';
import { SettingsPenIcon as IconSymbol } from '../lib/settingsPen';
import { ThemedView } from '@shared/ui/themed-view';

function appFontTextStyle(
  fontId: AppFontId,
  weight: '400' | '500' | '600' | '700' | '800' = '400',
): { fontFamily?: string; fontWeight: '400' | '500' | '600' | '700' | '800' } {
  const family = resolveAppFontFamily(fontId, weight);
  return {
    ...(family ? { fontFamily: family } : {}),
    fontWeight: isSingleFaceAppFont(fontId) ? '400' : weight,
  };
}

const FONT_OPTIONS: {
  key: AppFontId;
  labelKey: I18nKey;
  descKey: I18nKey;
}[] = [
  {
    key: 'corncorn',
    labelKey: 'settings.font.corncorn',
    descKey: 'settings.font.corncornDesc',
  },
  {
    key: 'kimJungWon',
    labelKey: 'settings.font.kimJungWon',
    descKey: 'settings.font.kimJungWonDesc',
  },
  {
    key: 'hiMelody',
    labelKey: 'settings.font.hiMelody',
    descKey: 'settings.font.hiMelodyDesc',
  },
];

const SIZE_OPTIONS: { key: AppFontSizeId; labelKey: I18nKey }[] = [
  { key: 'sm', labelKey: 'settings.font.size.sm' },
  { key: 'smMd', labelKey: 'settings.font.size.smMd' },
  { key: 'md', labelKey: 'settings.font.size.md' },
  { key: 'mdLg', labelKey: 'settings.font.size.mdLg' },
  { key: 'lg', labelKey: 'settings.font.size.lg' },
];

/** 설정 → 글씨 크기·글씨체 — 사용 설명서 목차와 같은 카드 결 */
export function FontSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const rf = { ...(isDark ? RetroFlatColors.dark : RetroFlatColors.light), text: isDark ? '#F1E7D2' : '#181713', textMuted: isDark ? '#C9C0AC' : '#575044' };
  const insets = useSafeAreaInsets();
  const fontId = useAppFontStore((s) => s.fontId);
  const setFontId = useAppFontStore((s) => s.setFontId);
  const sizeId = useAppFontStore((s) => s.sizeId);
  const setSizeId = useAppFontStore((s) => s.setSizeId);
  const sizeScale = useAppFontSizeScale();
  /** 외곽선 없이 음영만 — 면은 불투명 */
  const cardFace = 'transparent';
  const selectedWash = isDark ? '#306163' : '#C8EBDD';
  const cardFacePressed = isDark ? '#3B7370' : '#B5DFD0';
  const checkOn = rf.text;
  const checkOff = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)';

  /** 선택 중인 글씨체·크기로 미리보기 (크롬과 분리) */
  const previewFamily = resolveAppFontFamily(fontId, '700');
  const previewWeight = isSingleFaceAppFont(fontId) ? ('400' as const) : ('700' as const);
  const previewTextStyle = {
    ...(previewFamily ? { fontFamily: previewFamily } : {}),
    fontWeight: previewWeight,
  };
  /** 크기 카드 라벨은 굵기 완화 */
  const sizeLabelFamily = resolveAppFontFamily(fontId, '500');
  const sizeLabelWeight = isSingleFaceAppFont(fontId) ? ('400' as const) : ('500' as const);
  const sizeLabelStyle = {
    ...(sizeLabelFamily ? { fontFamily: sizeLabelFamily } : {}),
    fontWeight: sizeLabelWeight,
  };
  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: isDark ? '#282724' : '#F8F6F0' }]} darkColor="#282724" lightColor="#F8F6F0">
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}>
            <IconSymbol name="chevron.left" size={20} color={rf.text} />
          </Pressable>
          <View style={styles.topTitles}>
            <Text style={[styles.topLabel, { color: rf.textMuted }, appFontTextStyle(fontId, '700')]}>
              {t('settings.title')}
            </Text>
            <Text style={[styles.topPage, { color: rf.text }, appFontTextStyle(fontId, '600')]}>
              {t('settings.fontTitle')}
            </Text>
          </View>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          style={styles.bodyPad}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 28) }]}
          showsVerticalScrollIndicator={false}>
          <Text
            style={[
              styles.lead,
              {
                color: rf.text,
                fontSize: scaleTypeSize(16, sizeScale),
                lineHeight: scaleTypeSize(24, sizeScale),
              },
              previewTextStyle,
            ]}>
            {t('settings.font.hint')}
          </Text>

          <Text style={[styles.sectionLabel, { color: rf.textMuted }, appFontTextStyle(fontId, '700')]}>
            {t('settings.font.sizeSection')}
          </Text>

          <View style={styles.sizeRow}>
            {SIZE_OPTIONS.filter((opt) => APP_FONT_SIZE_IDS.includes(opt.key)).map((opt) => {
              const active = sizeId === opt.key;
              const optScale =
                resolveAppFontSizeScale(opt.key) * resolveAppFontOpticalScale(fontId);
              const face = active ? selectedWash : cardFace;
              const facePressed = cardFacePressed;
              return (
                <View
                  key={opt.key}
                  style={[
                    styles.sizeCardShell,
                    { marginRight: SOLID_SHADOW_OFFSET, marginBottom: SOLID_SHADOW_OFFSET },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cardShadow,
                      {
                        backgroundColor: 'transparent',
                        transform: [
                          { translateX: SOLID_SHADOW_OFFSET },
                          { translateY: SOLID_SHADOW_OFFSET },
                        ],
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t(opt.labelKey)}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      if (active) return;
                      setSizeId(opt.key);
                      void Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [
                    styles.sizeCard,
                      { backgroundColor: pressed ? facePressed : face },
                    ]}>
                    <SettingsInkFrame color={rf.text} />
                    <Text
                      style={[
                        styles.sizeCardTitle,
                        {
                          color: rf.text,
                          fontSize: scaleTypeSize(16, optScale),
                          lineHeight: scaleTypeSize(22, optScale),
                        },
                        sizeLabelStyle,
                      ]}>
                      {APP_FONT_SIZE_IDS.indexOf(opt.key) + 1}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.sizeScaleLabels}>
            <Text style={[styles.sizeScaleLabel, { color: rf.textMuted }, sizeLabelStyle]}>
              {t('settings.font.size.sm')}
            </Text>
            <Text style={[styles.sizeScaleLabel, { color: rf.textMuted }, sizeLabelStyle]}>
              {t('settings.font.size.md')}
            </Text>
            <Text style={[styles.sizeScaleLabel, { color: rf.textMuted }, sizeLabelStyle]}>
              {t('settings.font.size.lg')}
            </Text>
          </View>
          <Text style={[styles.sizeSelectedLabel, { color: rf.text }, sizeLabelStyle]}>
            {t(SIZE_OPTIONS.find((opt) => opt.key === sizeId)?.labelKey ?? 'settings.font.size.sm')}
          </Text>

          <Text
            style={[
              styles.sectionLabel,
              styles.familySectionLabel,
              { color: rf.textMuted },
              appFontTextStyle(fontId, '700'),
            ]}>
            {t('settings.font.familySection')}
          </Text>

          {FONT_OPTIONS.filter((opt) => APP_FONT_IDS.includes(opt.key)).map((opt) => {
            const active = fontId === opt.key;
            const sampleFamily = resolveAppFontFamily(opt.key, '700');
            const sampleWeight = isSingleFaceAppFont(opt.key) ? ('400' as const) : ('700' as const);
            const previewScale =
              resolveAppFontSizeScale(sizeId) * resolveAppFontOpticalScale(opt.key);
            return (
              <View
                key={opt.key}
                style={[
                  styles.fontCardShell,
                  { marginRight: SOLID_SHADOW_OFFSET, marginBottom: SOLID_SHADOW_OFFSET },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.cardShadow,
                    {
                      backgroundColor: 'transparent',
                      transform: [
                        { translateX: SOLID_SHADOW_OFFSET },
                        { translateY: SOLID_SHADOW_OFFSET },
                      ],
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(opt.labelKey)}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    if (active) return;
                    setFontId(opt.key);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.fontCard,
                    {
                      backgroundColor: pressed ? cardFacePressed : active ? selectedWash : cardFace,
                    },
                  ]}>
                  <SettingsInkFrame color={rf.text} />
                  <View style={styles.fontText}>
                    <Text
                      style={[
                        styles.fontPreview,
                        sampleFamily ? { fontFamily: sampleFamily, fontWeight: sampleWeight } : null,
                        {
                          color: rf.text,
                          fontSize: scaleTypeSize(17, previewScale),
                          lineHeight: scaleTypeSize(23, previewScale),
                        },
                      ]}
                      numberOfLines={1}>
                      {t('settings.font.size.preview')}
                    </Text>
                    <Text
                      style={[
                        styles.fontSub,
                        sampleFamily ? { fontFamily: sampleFamily, fontWeight: sampleWeight } : null,
                        {
                          color: rf.textMuted,
                          fontSize: scaleTypeSize(12, previewScale),
                          lineHeight: scaleTypeSize(17, previewScale),
                        },
                      ]}
                      numberOfLines={2}>
                      {t(opt.labelKey)} · {t(opt.descKey)}
                    </Text>
                  </View>
                  <IconSymbol
                    name={active ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={active ? checkOn : checkOff}
                  />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: CityPopSpacing.gutter,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitles: {
    flex: 1,
    gap: 2,
    paddingTop: 8,
  },
  topLabel: { fontSize: 13, letterSpacing: 0.6 },
  topPage: { fontSize: 13, letterSpacing: -0.1 },
  bodyPad: {
    flex: 1,
    paddingHorizontal: CityPopSpacing.gutter,
  },
  content: {
    paddingTop: 4,
    gap: 10,
  },
  lead: {
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 4,
    marginBottom: -2,
  },
  familySectionLabel: {
    marginTop: 10,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeCardShell: {
    flex: 1,
    position: 'relative',
  },
  cardShadow: {
    ...StyleSheet.absoluteFill,
  },
  sizeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
    zIndex: 1,
  },
  sizeCardTitle: {
    letterSpacing: -0.2,
  },
  sizeScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: -4,
  },
  sizeScaleLabel: {
    fontSize: 10,
  },
  sizeSelectedLabel: {
    fontSize: 12,
    marginTop: -6,
  },
  fontCardShell: {
    position: 'relative',
  },
  fontCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  fontText: { flex: 1, gap: 2, minWidth: 0 },
  fontPreview: {
    letterSpacing: -0.2,
  },
  fontSub: {
    fontSize: 12,
    lineHeight: 17,
  },
});
