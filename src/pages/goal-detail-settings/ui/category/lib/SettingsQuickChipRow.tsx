import { Pressable, StyleSheet, View } from 'react-native';

import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from './settingsPalette';

type SettingsPalette = ReturnType<typeof goalDetailSettingsPalette>;

type Props = {
  label?: string;
  values: number[];
  formatLabel?: (v: number) => string;
  selected: number;
  onSelect: (v: number) => void;
  palette: SettingsPalette;
};

export function SettingsQuickChipRow({
  label,
  values,
  formatLabel = (v) => String(v),
  selected,
  onSelect,
  palette,
}: Props) {
  const isNote = useUiSurfacePresentation() === 'note';

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText style={[styles.label, { color: palette.onSurface }]}>{label}</ThemedText>
      ) : null}
      <View style={styles.row}>
        {values.map((v) => {
          const active = selected === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              onPress={() => onSelect(v)}
              style={[
                styles.chip,
                isNote && styles.chipNote,
                isNote
                  ? undefined
                  : {
                      borderColor: active ? palette.onSurface : palette.outline,
                      backgroundColor: active ? 'rgba(0,0,0,0.06)' : palette.surfaceLowest,
                    },
              ]}>
              <ThemedText
                style={{
                  color: active ? palette.onSurface : palette.onVariant,
                  fontWeight: active ? '800' : '600',
                  fontSize: 13,
                  textDecorationLine: isNote && active ? 'underline' : 'none',
                }}>
                {formatLabel(v)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipNote: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingRight: 14,
    paddingVertical: 2,
    minHeight: 0,
  },
});
