import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from './settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

export function RoutineSummaryField({
  value,
  onChangeValue,
  palette,
  placeholder = '이 항목에 대한 짧은 설명을 적어 주세요',
  maxLength = 240,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  palette: Palette;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: palette.onVariant }]}>요약</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeValue}
        placeholder={placeholder}
        placeholderTextColor={palette.outline}
        style={[
          styles.input,
          {
            color: palette.onSurface,
            borderColor: palette.outlineVariant,
            backgroundColor: palette.surfaceLowest,
          },
        ]}
        maxLength={maxLength}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
