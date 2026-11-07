import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

/** Font-independent thin close glyph; the parent retains the full touch target. */
export function CloseIcon({ color = '#292E28', size = 20 }: { color?: ColorValue; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} pointerEvents="none">
    <Path d="m6 6 12 12M18 6 6 18" fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
  </Svg>;
}
