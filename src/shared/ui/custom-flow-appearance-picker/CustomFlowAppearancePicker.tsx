import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryColor } from '@shared/config/theme';
import { useTranslation } from '@shared/lib/i18n';
import {
  CUSTOM_FLOW_ACCENT_COLOR_OPTIONS,
  CUSTOM_FLOW_ICON_OPTIONS,
  type CustomFlowIconOption,
} from '@shared/lib/customFlowAppearanceCatalog';
import { HsvColorPicker } from '@shared/ui/hsv-color-picker';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

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
  /** true면 아이콘·색상 편집 영역을 처음부터 펼친다 */
  defaultExpanded?: boolean;
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
  defaultExpanded = true,
  compact = false,
}: CustomFlowAppearancePickerProps) {
  const { t } = useTranslation();
  const resolvedPreviewLabel = previewLabel ?? t('common.preview');
  const resolvedHint = hint ?? t('appearance.hint');
  const border = line ?? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)');
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';
  const chipIdleBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';

  const iconScrollRef = useRef<ScrollView>(null);
  const ICON_CHIP_STEP = 46;

  const [showAppearanceEditor, setShowAppearanceEditor] = useState(defaultExpanded);

  const toggleAppearanceEditor = useCallback(() => {
    void Haptics.selectionAsync();
    setShowAppearanceEditor((prev) => !prev);
  }, []);

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
          styles.previewCard,
          compact && styles.previewCardCompact,
          { borderColor: border, backgroundColor: cardBg },
        ]}>
        <View
          style={[
            styles.previewIconWrap,
            compact && styles.previewIconWrapCompact,
            { borderColor: accentColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
          ]}>
          <IconSymbol name={icon} size={compact ? 18 : 22} color={accentColor} />
        </View>
        <ThemedText
          style={[styles.previewLabel, compact && styles.previewLabelCompact, { color: ink }]}
          numberOfLines={1}>
          {resolvedPreviewLabel}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showAppearanceEditor }}
          accessibilityLabel={
            showAppearanceEditor ? t('appearance.collapseA11y') : t('appearance.expandA11y')
          }
          onPress={toggleAppearanceEditor}
          hitSlop={8}
          style={[
            styles.expandButton,
            compact && styles.expandButtonCompact,
            {
              borderColor: border,
              backgroundColor: showAppearanceEditor
                ? isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.06)'
                : chipIdleBg,
            },
          ]}>
          <IconSymbol
            name={showAppearanceEditor ? 'minus' : 'plus'}
            size={16}
            color={showAppearanceEditor ? ink : muted}
            weight="semibold"
            style={styles.expandButtonIcon}
          />
        </Pressable>
      </View>

      {showAppearanceEditor ? (
        <View style={[styles.editorBody, compact && styles.editorBodyCompact]}>
          <ScrollView
            ref={iconScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconRow}
            keyboardShouldPersistTaps="handled">
            {CUSTOM_FLOW_ICON_OPTIONS.map((iconName) => {
              const selected = icon === iconName;
              return (
                <Pressable
                  key={iconName}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t('appearance.pickIconA11y')}
                  onPress={() => handleSelectIcon(iconName)}
                  style={[
                    styles.iconChip,
                    {
                      borderColor: selected ? accentColor : border,
                      backgroundColor: selected
                        ? isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.06)'
                        : chipIdleBg,
                    },
                  ]}>
                  <IconSymbol name={iconName} size={18} color={selected ? accentColor : muted} />
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.colorSection}>
            <ThemedText style={[styles.presetLabel, { color: muted }]}>{t('common.color')}</ThemedText>
            <View style={styles.colorGrid}>
              {CUSTOM_FLOW_ACCENT_COLOR_OPTIONS.map((color) => {
                const selected = accentColor.toLowerCase() === color;
                return (
                  <Pressable
                    key={color}
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
                        borderColor: selected ? PrimaryColor.rgb : border,
                      },
                    ]}>
                    {selected ? <IconSymbol name="checkmark" size={12} color="#FAFAFA" /> : null}
                  </Pressable>
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
      ) : null}
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
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderWidth: 2,
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
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonCompact: {
    width: 32,
    height: 32,
  },
  expandButtonIcon: {
    marginTop: 1,
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
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
