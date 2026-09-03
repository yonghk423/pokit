import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  listCustomFlowTemplateCatalogEntries,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { CityPopSpacing, RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  isDark?: boolean;
  onPressTemplate: (templateKey: CustomFlowTemplateKey) => void;
};

const BRUTAL_SHADOW_SM = 2;

/** 루틴 템플릿 — Brutalism 리스트 (아이콘은 기존 잉크 톤) */
export function RoutineTemplateListPanel({
  ink,
  muted,
  line,
  cardBg,
  isDark = false,
  onPressTemplate,
}: Props) {
  const { t, locale } = useTranslation();
  const entries = useMemo(() => listCustomFlowTemplateCatalogEntries(), [locale]);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowColor = isDark ? tone.solidShadow : tone.text;
  const rowFace = isDark ? tone.surfaceAlt : cardBg || '#FFFFFF';
  const iconBoxBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const pressedBg = isDark ? 'rgba(158, 207, 209, 0.18)' : 'rgba(168, 218, 220, 0.22)';

  return (
    <View style={styles.root}>
      <View style={styles.headerBlock}>
        <ThemedText style={[styles.pageTitle, { color: ink }]}>{t('fixedRoutine.templatesTitle')}</ThemedText>
        <ThemedText style={[styles.lead, { color: muted }]}>
          {t('fixedRoutine.templatesLead')}
        </ThemedText>
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
                  borderColor: line,
                  transform: [
                    { translateX: BRUTAL_SHADOW_SM },
                    { translateY: BRUTAL_SHADOW_SM },
                  ],
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('fixedRoutine.templateDetailA11y', { label: entry.label, description: entry.description })}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPressTemplate(entry.key);
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: line,
                  backgroundColor: pressed ? pressedBg : rowFace,
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
                      borderColor: line,
                      transform: [
                        { translateX: BRUTAL_SHADOW_SM },
                        { translateY: BRUTAL_SHADOW_SM },
                      ],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.iconBox,
                    { borderColor: line, backgroundColor: iconBoxBg },
                  ]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: CityPopSpacing.sm,
  },
  headerBlock: {
    gap: 4,
    marginBottom: CityPopSpacing.base,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  lead: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
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
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    zIndex: 1,
  },
  iconBoxShell: {
    position: 'relative',
    flexShrink: 0,
  },
  iconBoxShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1,
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
