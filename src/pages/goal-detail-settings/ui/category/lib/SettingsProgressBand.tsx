import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from './settingsPalette';

type SettingsPalette = ReturnType<typeof goalDetailSettingsPalette>;

type Props = {
  title: string;
  valueLine: string;
  subLine?: string;
  ratio: number;
  palette: SettingsPalette;
  accent?: string;
};

export function SettingsProgressBand({
  title,
  valueLine,
  subLine,
  ratio,
  palette,
  accent,
}: Props) {
  const fill = Math.max(0, Math.min(1, ratio));
  const barColor = accent ?? palette.onSurface;

  return (
    <View style={[styles.wrap, { borderColor: palette.outline, backgroundColor: palette.surfaceLowest }]}>
      <ThemedText style={[styles.title, { color: palette.onVariant }]}>{title}</ThemedText>
      <ThemedText style={[styles.value, { color: palette.onSurface }]}>{valueLine}</ThemedText>
      {subLine ? (
        <ThemedText style={[styles.sub, { color: palette.onVariant }]}>{subLine}</ThemedText>
      ) : null}
      <View style={[styles.track, { backgroundColor: palette.outlineVariant }]}>
        <View style={[styles.fill, { width: `${Math.round(fill * 100)}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  track: {
    marginTop: 4,
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
