import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryColor } from '@shared/config/theme';
import {
  CUSTOM_FLOW_ACCENT_COLOR_OPTIONS,
  CUSTOM_FLOW_ICON_OPTIONS,
  isPresetCustomFlowAccentColor,
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
};

export function CustomFlowAppearancePicker({
  icon,
  accentColor,
  onChangeIcon,
  onChangeAccentColor,
  previewLabel = '미리보기',
  isDark,
  ink,
  muted,
  line,
  hint = '루틴 목록에서 구분하기 쉽게 골라 주세요',
}: CustomFlowAppearancePickerProps) {
  const border = line ?? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)');
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';
  const chipIdleBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';

  const iconScrollRef = useRef<ScrollView>(null);
  const ICON_CHIP_STEP = 46;

  const [showCustomColor, setShowCustomColor] = useState(
    () => !isPresetCustomFlowAccentColor(accentColor),
  );

  useEffect(() => {
    if (!isPresetCustomFlowAccentColor(accentColor)) {
      setShowCustomColor(true);
    }
  }, [accentColor]);

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
    <View style={styles.root}>
      <ThemedText style={[styles.fieldLabel, { color: ink }]}>아이콘·색상</ThemedText>
      {hint.length > 0 ? (
        <ThemedText style={[styles.fieldHint, { color: muted }]}>{hint}</ThemedText>
      ) : null}

      <View style={[styles.previewCard, { borderColor: border, backgroundColor: cardBg }]}>
        <View
          style={[
            styles.previewIconWrap,
            { borderColor: accentColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
          ]}>
          <IconSymbol name={icon} size={22} color={accentColor} />
        </View>
        <ThemedText style={[styles.previewLabel, { color: ink }]} numberOfLines={1}>
          {previewLabel}
        </ThemedText>
      </View>

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
              accessibilityLabel="아이콘 선택"
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
        <ThemedText style={[styles.presetLabel, { color: muted }]}>색상</ThemedText>
        <View style={styles.colorGrid}>
          {CUSTOM_FLOW_ACCENT_COLOR_OPTIONS.map((color) => {
            const selected = accentColor.toLowerCase() === color;
            return (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel="색상 선택"
                onPress={() => {
                  void Haptics.selectionAsync();
                  onChangeAccentColor(color);
                  setShowCustomColor(false);
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

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showCustomColor }}
        accessibilityLabel={showCustomColor ? '색상 직접 고르기 접기' : '색상 직접 고르기 펼치기'}
        onPress={() => {
          void Haptics.selectionAsync();
          setShowCustomColor((prev) => !prev);
        }}
        style={[styles.customToggle, { borderColor: border, backgroundColor: chipIdleBg }]}>
        <ThemedText style={[styles.customToggleLabel, { color: ink }]}>
          {showCustomColor ? '색상 직접 고르기 접기' : '색상 직접 고르기'}
        </ThemedText>
        <IconSymbol name={showCustomColor ? 'chevron.up' : 'chevron.down'} size={14} color={muted} />
      </Pressable>

      {showCustomColor ? (
        <HsvColorPicker
          value={accentColor}
          onChange={onChangeAccentColor}
          ink={ink}
          muted={muted}
          isDark={isDark}
          line={border}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
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
  previewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
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
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
  },
  customToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
});
