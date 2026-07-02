import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  hint = '루틴 목록에서 구분하기 쉽게 골라 주세요',
}: CustomFlowAppearancePickerProps) {
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
  const iconScrollRef = useRef<ScrollView>(null);
  const ICON_CHIP_STEP = 50;

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

      <View
        style={[
          styles.previewBox,
          {
            backgroundColor: inputBg,
            borderColor: inputBorder,
          },
        ]}>
        <View
          style={[
            styles.previewIconWrap,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}>
          <IconSymbol name={icon} size={28} color={accentColor} />
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
                  borderColor: selected ? accentColor : inputBorder,
                  backgroundColor: selected
                    ? isDark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(0,0,0,0.06)'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.02)',
                },
              ]}>
              <IconSymbol
                name={iconName}
                size={20}
                color={selected ? accentColor : muted}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <HsvColorPicker
        value={accentColor}
        onChange={onChangeAccentColor}
        ink={ink}
        muted={muted}
        isDark={isDark}
      />

      <View style={styles.presetSection}>
        <ThemedText style={[styles.presetLabel, { color: muted }]}>추천 색상</ThemedText>
        <View style={styles.colorRow}>
          {CUSTOM_FLOW_ACCENT_COLOR_OPTIONS.map((color) => {
            const selected = accentColor.toLowerCase() === color;
            return (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel="추천 색상 선택"
                onPress={() => {
                  void Haptics.selectionAsync();
                  onChangeAccentColor(color);
                }}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: color,
                    borderColor: selected ? ink : 'transparent',
                  },
                ]}>
                {selected ? <IconSymbol name="checkmark" size={11} color="#FAFAFA" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
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
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
    gap: 8,
    paddingVertical: 2,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSection: {
    gap: 8,
    paddingTop: 2,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
