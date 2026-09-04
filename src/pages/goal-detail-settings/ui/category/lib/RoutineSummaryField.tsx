import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

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
  const presentation = useUiSurfacePresentation();
  const isNote = presentation === 'note';
  const placeholderText = placeholderProp ?? t('goalDetail.summaryPlaceholder');

  return (
    <View style={styles.wrap}>
      {!isNote ? (
        <ThemedText style={[styles.label, { color: palette.onVariant }]}>
          {t('goalDetail.summaryLabel')}
        </ThemedText>
      ) : null}
      <ThemedTextInput
        value={value}
        onChangeText={onChangeValue}
        placeholder={placeholderText}
        placeholderTextColor={palette.outline}
        style={[
          isNote ? styles.inputNote : styles.input,
          {
            color: palette.onSurface,
            ...(isNote
              ? {}
              : {
                  borderColor: palette.outlineVariant,
                  backgroundColor: palette.surfaceLowest,
                }),
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
  inputNote: {
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 2,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});
