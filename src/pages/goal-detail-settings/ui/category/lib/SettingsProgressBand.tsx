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
  const noteTrackBg = palette.usesLightInk
    ? 'rgba(255,255,255,0.18)'
    : 'rgba(0,0,0,0.08)';

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
          { backgroundColor: isNote ? noteTrackBg : palette.outlineVariant },
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
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  titleNote: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  valueNote: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  sub: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  subNote: {
    fontSize: 12,
    fontWeight: '400',
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
