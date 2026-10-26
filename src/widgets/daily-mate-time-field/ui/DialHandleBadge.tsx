import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DayRhythmSymbol } from '@shared/ui/day-mate-symbol';
import { PaperGrain } from '@shared/ui/paper-grain';

type Props = {
  kind: 'sun' | 'moon'; size: number; left: number; top: number;
  backgroundColor: string; borderColor: string; iconColor: string;
  iconSize: number; active?: boolean;
};

/** Paper handles stay still so the actual drag position remains clear. */
export function DialHandleBadge({ kind, size, left, top, backgroundColor, borderColor, iconColor, iconSize, active = false }: Props) {
  return (
    <View pointerEvents="none" style={[styles.badge, {
      width: size, height: size, borderRadius: size / 2,
      left, top, backgroundColor: active ? '#EAF5F4' : backgroundColor,
    }]}>
      <PaperGrain opacity={0.2} />
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Path
          d="M 51 4 C 75 3 96 25 96 49 C 98 73 76 96 51 96 C 27 97 4 77 4 51 C 3 26 26 5 51 4 Z"
          fill="none"
          stroke={active ? '#477C7E' : borderColor}
          strokeWidth={active ? 1.9 : 1.35}
          opacity={active ? 0.95 : 0.72}
        />
        <Path
          d="M 51 5 C 76 4 95 26 95 50 C 97 74 75 95 50 95 C 26 96 5 76 5 50 C 4 27 27 6 51 5 Z"
          fill="none"
          stroke={active ? '#477C7E' : borderColor}
          strokeWidth="0.8"
          opacity={active ? 0.38 : 0.22}
        />
      </Svg>
      <View style={styles.icon}>
        <DayRhythmSymbol kind={kind} size={iconSize} ink={iconColor} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  badge: { position: 'absolute', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 2 },
  icon: { zIndex: 1 },
});
