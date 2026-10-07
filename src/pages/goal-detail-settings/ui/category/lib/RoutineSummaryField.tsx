import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import {
  RowColorPaletteActivePanel,
  RowColorPaletteTabStrip,
  useRowColorPaletteBridge,
} from '@shared/ui/color-palette-tabs';
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
  underline = true,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  palette: Palette;
  placeholder?: string;
  maxLength?: number;
  /** false면 노트 입력 밑줄 생략 — 바로 아래 섹션 실선과 겹칠 때 */
  underline?: boolean;
}) {
  const { t } = useTranslation();
  const presentation = useUiSurfacePresentation();
  const colorBridge = useRowColorPaletteBridge();
  const isNote = presentation === 'note';
  const placeholderText = placeholderProp ?? t('goalDetail.summaryPlaceholder');
  const showColorTabs = Boolean(isNote && colorBridge && colorBridge.tabs.length > 0);

  const claimSummaryHost = colorBridge?.claimSummaryHost;
  const releaseSummaryHost = colorBridge?.releaseSummaryHost;
  useLayoutEffect(() => {
    if (!showColorTabs || !claimSummaryHost || !releaseSummaryHost) return;
    claimSummaryHost();
    return () => {
      releaseSummaryHost();
    };
  }, [showColorTabs, claimSummaryHost, releaseSummaryHost]);

  return (
    <View style={[styles.wrap, isNote && styles.wrapNote]}>
      <View style={styles.labelBlock}>
        {showColorTabs ? <RowColorPaletteTabStrip /> : null}
        <ThemedText style={[styles.label, { color: palette.onVariant }]}>
          {t('goalDetail.summaryLabel')}
        </ThemedText>
      </View>
      <ThemedTextInput
        value={value}
        onChangeText={onChangeValue}
        placeholder={placeholderText}
        placeholderTextColor={
          isNote
            ? palette.usesLightInk
              ? 'rgba(255,255,255,0.38)'
              : 'rgba(0,0,0,0.32)'
            : palette.outline
        }
        accessibilityLabel={t('goalDetail.summaryLabel')}
        style={[
          isNote ? styles.inputNote : styles.input,
          isNote && !underline ? styles.inputNoteNoLine : null,
          {
            color: palette.onSurface,
            ...(isNote
              ? underline
                ? { borderBottomColor: palette.outlineVariant }
                : null
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
      {showColorTabs ? <RowColorPaletteActivePanel /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapNote: { gap: 2 },
  labelBlock: { gap: 10, alignSelf: 'stretch' },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, flexShrink: 0 },
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
    minHeight: 48,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 10,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.1,
    borderBottomWidth: 1,
  },
  inputNoteNoLine: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
});
