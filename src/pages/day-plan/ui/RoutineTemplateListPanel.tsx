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
import { IconSymbol } from '@shared/ui/icon-symbol';
import { POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';
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

const BRUTAL_SHADOW_SM = 3;

/** 루틴 템플릿 목록 — 솔리드 음영만 (테두리 없음) */
export function RoutineTemplateListPanel({
  ink,
  muted,
  line: _line,
  cardBg,
  isDark = false,
  onPressTemplate,
}: Props) {
  const { t, locale } = useTranslation();
  const entries = useMemo(() => listCustomFlowTemplateCatalogEntries(), [locale]);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowColor = POST_IT_SOLID_SHADOW;
  const rowFace = isDark ? tone.surfaceAlt : cardBg || '#FFFFFF';
  const iconBoxBg = isDark ? tone.primaryContainer : tone.primaryContainer;

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

      <View style={styles.list}>
        {entries.map((entry) => (
          <View
            key={entry.key}
            style={[
              styles.rowShell,
              { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.rowShadow,
                {
                  backgroundColor: shadowColor,
                  transform: [
                    { translateX: BRUTAL_SHADOW_SM },
                    { translateY: BRUTAL_SHADOW_SM },
                  ],
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('fixedRoutine.templateDetailA11y', {
                label: entry.label,
                description: entry.description,
              })}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPressTemplate(entry.key);
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: rowFace,
                },
                pressed && { opacity: 0.92 },
              ]}>
              <View
                style={[
                  styles.iconBoxShell,
                  { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.iconBoxShadow,
                    {
                      backgroundColor: shadowColor,
                      transform: [
                        { translateX: BRUTAL_SHADOW_SM },
                        { translateY: BRUTAL_SHADOW_SM },
                      ],
                    },
                  ]}
                />
                <View style={[styles.iconBox, { backgroundColor: iconBoxBg }]}>
                  <IconSymbol name={entry.icon} size={16} color={ink} />
                </View>
              </View>

              <View style={styles.cardText}>
                <ThemedText style={[styles.title, { color: ink }]}>{entry.label}</ThemedText>
                <ThemedText style={[styles.desc, { color: muted }]} numberOfLines={2}>
                  {entry.description}
                </ThemedText>
              </View>

              <IconSymbol name="chevron.right" size={13} color={muted} />
            </Pressable>
          </View>
        ))}
      </View>

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
  list: {
    width: '100%',
    gap: 10,
  },
  rowShell: {
    position: 'relative',
  },
  rowShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    borderRadius: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 0,
    borderRadius: 0,
    zIndex: 1,
  },
  iconBoxShell: {
    position: 'relative',
    flexShrink: 0,
  },
  iconBoxShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    borderRadius: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  desc: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 15,
  },
});
