import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { PrimaryColor } from '@shared/config/theme';
import { contrastingForeground } from '@shared/lib/colorMath';
import { useTranslation } from '@shared/lib/i18n';
import {
  CUSTOM_FLOW_ACCENT_COLOR_OPTIONS,
  CUSTOM_FLOW_ICON_OPTIONS,
  type CustomFlowIconOption,
} from '@shared/lib/customFlowAppearanceCatalog';
import { HsvColorPicker } from '@shared/ui/hsv-color-picker';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const CHIP_SHADOW = 2;

export type CustomFlowAppearancePickerProps = {
  icon: CustomFlowIconOption;
  accentColor: string;
  onChangeIcon: (icon: CustomFlowIconOption) => void;
  onChangeAccentColor: (color: string) => void;
  previewLabel?: string;
  isDark: boolean;
  ink: string;
  muted: string;
  line?: string;
  hint?: string;
  /** 목표 상세 등 좁은 화면 — 패딩·여백 축소 */
  compact?: boolean;
};

export function CustomFlowAppearancePicker({
  icon,
  accentColor,
  onChangeIcon,
  onChangeAccentColor,
  previewLabel,
  isDark,
  ink,
  muted,
  line,
  hint,
  compact = false,
}: CustomFlowAppearancePickerProps) {
  const { t } = useTranslation();
  const resolvedPreviewLabel = previewLabel ?? t('common.preview');
  const resolvedHint = hint ?? t('appearance.hint');
  const border = line ?? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)');
  const cardBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const chipIdleBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const shadowInk = isDark ? RetroFlatColors.dark.solidShadow : '#000000';
  const accentOnChip = contrastingForeground(accentColor);

  const iconScrollRef = useRef<ScrollView>(null);
  const ICON_CHIP_STEP = 46;

  const scrollIconIntoView = useCallback((iconName: CustomFlowIconOption) => {
    const index = CUSTOM_FLOW_ICON_OPTIONS.indexOf(iconName);
    if (index < 0) return;
    iconScrollRef.current?.scrollTo({
      x: Math.max(0, index * ICON_CHIP_STEP - 24),
      animated: true,
    });
  }, []);

  useEffect(() => {
    scrollIconIntoView(icon);
  }, [icon, scrollIconIntoView]);

  const handleSelectIcon = useCallback(
    (iconName: CustomFlowIconOption) => {
      void Haptics.selectionAsync();
      onChangeIcon(iconName);
      scrollIconIntoView(iconName);
    },
    [onChangeIcon, scrollIconIntoView],
  );

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <ThemedText style={[styles.fieldLabel, compact && styles.fieldLabelCompact, { color: ink }]}>
        {t('appearance.iconColor')}
      </ThemedText>
      {resolvedHint.length > 0 ? (
        <ThemedText style={[styles.fieldHint, { color: muted }]}>{resolvedHint}</ThemedText>
      ) : null}

      <View
        style={[
          styles.previewShell,
          { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.solidShadow,
            {
              backgroundColor: shadowInk,
              transform: [{ translateX: CHIP_SHADOW }, { translateY: CHIP_SHADOW }],
            },
          ]}
        />
        <View
          style={[
            styles.previewCard,
            compact && styles.previewCardCompact,
            { backgroundColor: cardBg },
          ]}>
          <View
            style={[
              styles.previewIconWrap,
              compact && styles.previewIconWrapCompact,
              { backgroundColor: accentColor },
            ]}>
            <IconSymbol name={icon} size={compact ? 18 : 22} color={accentOnChip} />
          </View>
          <ThemedText
            style={[styles.previewLabel, compact && styles.previewLabelCompact, { color: ink }]}
            numberOfLines={1}>
            {resolvedPreviewLabel}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.editorBody, compact && styles.editorBodyCompact]}>
          <ScrollView
            ref={iconScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconRow}
            keyboardShouldPersistTaps="handled">
            {CUSTOM_FLOW_ICON_OPTIONS.map((iconName) => {
              const selected = icon === iconName;
              const shadow = selected ? 3 : CHIP_SHADOW;
              return (
                <View
                  key={iconName}
                  style={[
                    styles.iconChipShell,
                    { marginRight: shadow, marginBottom: shadow },
                  ]}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.solidShadow,
                      {
                        backgroundColor: shadowInk,
                        transform: [{ translateX: shadow }, { translateY: shadow }],
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t('appearance.pickIconA11y')}
                    onPress={() => handleSelectIcon(iconName)}
                    style={[
                      styles.iconChip,
                      {
                        backgroundColor: selected ? accentColor : chipIdleBg,
                      },
                    ]}>
                    <IconSymbol
                      name={iconName}
                      size={18}
                      color={selected ? accentOnChip : muted}
                    />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.colorSection}>
            <ThemedText style={[styles.presetLabel, { color: muted }]}>{t('common.color')}</ThemedText>
            <View style={styles.colorGrid}>
              {CUSTOM_FLOW_ACCENT_COLOR_OPTIONS.map((color) => {
                const selected = accentColor.toLowerCase() === color;
                const shadow = selected ? 3 : CHIP_SHADOW;
                return (
                  <View
                    key={color}
                    style={[
                      styles.swatchShell,
                      { marginRight: shadow, marginBottom: shadow },
                    ]}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.solidShadow,
                        {
                          backgroundColor: selected ? PrimaryColor.rgb : shadowInk,
                          transform: [{ translateX: shadow }, { translateY: shadow }],
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t('appearance.pickColorA11y')}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        onChangeAccentColor(color);
                      }}
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor: color,
                        },
                      ]}>
                      {selected ? (
                        <IconSymbol
                          name="checkmark"
                          size={12}
                          color={contrastingForeground(color)}
                        />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          <HsvColorPicker
            value={accentColor}
            onChange={onChangeAccentColor}
            ink={ink}
            muted={muted}
            isDark={isDark}
            line={border}
          />
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  rootCompact: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  fieldLabelCompact: {
    fontSize: 12,
    fontWeight: '800',
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: -4,
  },
  previewShell: {
    position: 'relative',
  },
  solidShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1,
  },
  previewCardCompact: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  previewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIconWrapCompact: {
    width: 34,
    height: 34,
  },
  previewLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  previewLabelCompact: {
    fontSize: 14,
  },
  editorBody: {
    gap: 10,
  },
  editorBodyCompact: {
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    paddingRight: 4,
  },
  iconChipShell: {
    position: 'relative',
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  colorSection: {
    gap: 8,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchShell: {
    position: 'relative',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
