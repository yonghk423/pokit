import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  listCustomFlowTemplateCatalogEntries,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';
import {
  headerArtForVariant,
  RoutineAtmosphereFooterStrip,
} from '@shared/ui/routine-atmosphere';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  isDark?: boolean;
  onPressTemplate: (templateKey: CustomFlowTemplateKey) => void;
};

/** 설정 탭 SettingsRowIcon / settingsChrome 과 동일 스펙 */
const SHADOW_SM = 2;
const ICON_FACE = 34;
const ICON_BORDER = 1;

/**
 * 루틴 템플릿 목록 — 설정 탭 리스트와 동일:
 * 카드 셸 + 구분선 행 + 흰 면·검정 테두리·솔리드 음영 아이콘
 */
export function RoutineTemplateListPanel({
  ink,
  muted,
  line: _line,
  cardBg: _cardBg,
  isDark = false,
  onPressTemplate,
}: Props) {
  const { t, locale } = useTranslation();
  const entries = useMemo(() => listCustomFlowTemplateCatalogEntries(), [locale]);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const sectionSurface = tone.bg;
  const sectionShadow = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.10)';
  const rowBorder = isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)';
  const iconColor = isDark ? '#FAFAFA' : '#000000';
  const iconBoxBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const iconBorder = isDark ? 'rgba(255,255,255,0.55)' : '#000000';
  const iconShadow = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)';
  const chevron = muted;

  return (
    <View style={styles.root}>
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.pageTitle, { color: ink }]}>
              {t('fixedRoutine.templatesTitle')}
            </ThemedText>
            <ThemedText style={[styles.lead, { color: muted }]}>
              {t('fixedRoutine.templatesLead')}
            </ThemedText>
          </View>
          <View style={styles.headerArtSlot} pointerEvents="none">
            <Image
              source={headerArtForVariant('templates')}
              style={styles.headerArt}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </View>
        </View>
      </View>

      <CityPopCardShell
        isDark={isDark}
        faceColor={sectionSurface}
        shadowColor={sectionShadow}
        shadowOffset={SHADOW_SM}>
        <View style={styles.sectionInner}>
          {entries.map((entry, index) => (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityLabel={t('fixedRoutine.templateDetailA11y', {
                label: entry.label,
                description: entry.description,
              })}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPressTemplate(entry.key);
              }}
              style={[
                styles.item,
                {
                  borderTopColor: rowBorder,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth * 2,
                },
              ]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconShell, { marginRight: SHADOW_SM, marginBottom: SHADOW_SM }]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.iconShadow,
                      {
                        backgroundColor: iconShadow,
                        transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: iconBoxBg, borderColor: iconBorder },
                    ]}>
                    <IconSymbol name={entry.icon} size={16} color={iconColor} />
                  </View>
                </View>
                <View style={styles.itemTextWrap}>
                  <ThemedText style={[styles.itemTitle, { color: ink }]}>{entry.label}</ThemedText>
                  <ThemedText style={[styles.itemDesc, { color: muted }]} numberOfLines={2}>
                    {entry.description}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={14} color={chevron} />
            </Pressable>
          ))}
        </View>
      </CityPopCardShell>

      <RoutineAtmosphereFooterStrip variant="templates" isDark={isDark} density="rich" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: CityPopSpacing.sm,
  },
  headerBlock: {
    marginBottom: CityPopSpacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  headerArtSlot: {
    width: 72,
    height: 56,
    marginRight: 2,
    marginBottom: -2,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  headerArt: {
    width: 88,
    height: 88,
    marginBottom: -18,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  lead: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  sectionInner: {
    overflow: 'visible',
  },
  item: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconShell: {
    position: 'relative',
    width: ICON_FACE + SHADOW_SM,
    height: ICON_FACE + SHADOW_SM,
    flexShrink: 0,
    overflow: 'visible',
  },
  iconShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ICON_FACE,
    height: ICON_FACE,
    borderRadius: 0,
  },
  iconBox: {
    width: ICON_FACE,
    height: ICON_FACE,
    borderRadius: 0,
    borderWidth: ICON_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  itemDesc: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
});
