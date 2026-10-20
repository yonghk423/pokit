import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { PaletteSelectionCheck } from '@shared/ui/palette-selection-check';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import type { DeskChoice } from './choices';
import { StationeryCaptionIcon } from './StationeryCaptionIcon';

export type DeskTool = {
  id: 'face' | 'ink'; label: string; choices?: DeskChoice[]; reset?: () => void; swatch?: string;
};
const BACKGROUND = require('../../../../assets/stationery-desk/desk-diagonal-tips-v12.webp');
// Normalized coordinates on the square artwork. Targets cover exposed paper or
// exposed tool tips without overlapping adjacent colors. Order matches choices.ts.
const TARGETS = {
  face: [
    [3.4, 9.6, 19.9, 18], [26.6, 9.6, 19.9, 18],
    [3.4, 31.9, 19.9, 18], [26.6, 31.9, 19.9, 18],
    [3.4, 54.1, 19.9, 18], [26.6, 54.1, 19.9, 18], [3.4, 76.2, 19.9, 18],
  ],
  ink: [
    [57, 10, 6, 11], [63, 10, 6, 11], [69, 10, 6, 11],
    [75, 10, 6, 11], [81, 10, 6, 11], [87, 10, 6, 11], [93, 10, 6, 11],
  ],
} as const;
function ObjectTarget({ choice, bounds, label, paper }: {
  choice: DeskChoice; bounds: readonly [number, number, number, number]; label: string; paper: boolean;
}) {
  const [left, top, width, height] = bounds;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: choice.selected }}
      accessibilityLabel={label}
      onPress={() => { void Haptics.selectionAsync(); choice.onSelect(); }}
      style={[styles.target, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }]}>
      {choice.selected ? (
        <View pointerEvents="none" style={[styles.selectionMark, paper && styles.paperSelectionMark]}>
          <PaletteSelectionCheck size={22} color="#252525" />
        </View>
      ) : null}
    </Pressable>
  );
}

/** One coherent aerial illustration; each visible object directly applies its color. */
export function StationeryDeskSurface({ tools }: { tools: DeskTool[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.surface}>
      <View style={styles.desk}>
        <Image source={BACKGROUND} contentFit="contain" accessible={false} transition={0} useAppleWebpCodec={false} style={StyleSheet.absoluteFill} />
        {tools.flatMap((tool) => tool.choices?.map((choice, index) => {
          const bounds = TARGETS[tool.id][index];
          return bounds ? <ObjectTarget key={`${tool.id}-${choice.id}`} choice={choice} bounds={bounds} paper={tool.id === 'face'} label={`${tool.label} ${t(choice.labelKey)}`} /> : null;
        }))}
      </View>
      <View style={styles.captions}>
        {tools.map((tool) => (
          <View key={tool.id} style={styles.caption}>
            <StationeryCaptionIcon kind={tool.id} color={tool.swatch ?? '#777777'} />
            <ThemedText style={styles.label} lightColor="#302B25" darkColor="#302B25" numberOfLines={1}>{tool.label}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  surface: { width: '100%', backgroundColor: '#FFFFFF' },
  desk: { width: '100%', aspectRatio: 1 },
  target: { zIndex: 3, position: 'absolute', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  selectionMark: { position: 'absolute', top: -28, alignSelf: 'center', width: 26, height: 26, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] },
  paperSelectionMark: { top: '50%', left: '50%', marginTop: -13, marginLeft: -13 },
  captions: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3 },
  caption: { flex: 1, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, lineHeight: 16, flexShrink: 1 },
});
