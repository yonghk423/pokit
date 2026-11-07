import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

/** Thin 32px back chevron; the enclosing button owns the touch target. */
export function BackChevron({ color = '#292E28' }: { color?: ColorValue }) {
  return <Svg width={32} height={32} viewBox="0 0 24 24" accessible={false}>
    <Path d="m15 18-6-6 6-6" fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
