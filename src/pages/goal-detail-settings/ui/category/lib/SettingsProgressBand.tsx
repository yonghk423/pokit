import { StyleSheet, View } from 'react-native';

import { useUiSurfacePresentation } from '@shared/ui/presentation';
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
  const presentation = useUiSurfacePresentation();
  const isNote = presentation === 'note';
  const fill = Math.max(0, Math.min(1, ratio));
  const barColor = accent ?? palette.onSurface;

  return (
    <View
      style={[
        isNote ? styles.wrapNote : styles.wrap,
        !isNote && {
          borderColor: palette.outline,
          backgroundColor: palette.surfaceLowest,
        },
      ]}>
      <ThemedText style={[isNote ? styles.titleNote : styles.title, { color: palette.onVariant }]}>
        {title}
      </ThemedText>
      <ThemedText style={[isNote ? styles.valueNote : styles.value, { color: palette.onSurface }]}>
        {valueLine}
      </ThemedText>
      {subLine ? (
        <ThemedText style={[isNote ? styles.subNote : styles.sub, { color: palette.onVariant }]}>
          {subLine}
        </ThemedText>
      ) : null}
      <View
        style={[
          isNote ? styles.trackNote : styles.track,
          { backgroundColor: isNote ? 'rgba(0,0,0,0.08)' : palette.outlineVariant },
        ]}>
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
  wrapNote: {
    paddingVertical: 2,
    gap: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleNote: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  valueNote: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  subNote: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  track: {
    marginTop: 4,
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  trackNote: {
    marginTop: 6,
    height: 2,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
