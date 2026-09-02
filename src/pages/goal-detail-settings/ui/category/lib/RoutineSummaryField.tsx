import { StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from './settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

export function RoutineSummaryField({
  value,
  onChangeValue,
  palette,
  placeholder: placeholderProp,
  maxLength = 240,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  palette: Palette;
  placeholder?: string;
  maxLength?: number;
}) {
  const { t } = useTranslation();
  const placeholderText = placeholderProp ?? t('goalDetail.summaryPlaceholder');

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.label, { color: palette.onVariant }]}>
        {t('goalDetail.summaryLabel')}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeValue}
        placeholder={placeholderText}
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
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
