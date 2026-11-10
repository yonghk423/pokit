import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** A: a softly irregular closed lid and tapered, ribbed hand-drawn basket. */
export function TrashIcon({ size = 29, color = '#514B40' }: { size?: number; color?: ColorValue }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false} pointerEvents="none">
    <Path d="M11.4 6.2c.3-1.7.5-3.5 2.2-3.7 1.6-.3 3.8-.3 5.1.1 1.3.4 1.5 2 1.7 3.6M4.1 9.3c.1-2 5.4-3.5 11.9-3.5 6.4 0 11.9 1.4 11.9 3.4-.1 1.8-5.4 2.9-11.9 2.8C9.5 12 4 11 4.1 9.3Zm0 .1.2 2.7c3.6 2 19.4 2.3 23.4-.1l.2-2.8M5.8 13.1l2.1 14c.3 2 3.8 2.6 8.1 2.6 4.2 0 7.8-.7 8.1-2.6l2-14M10 16l1 10M14.1 16.5l.3 10M18.3 16.4l-.4 10M22.3 16l-1.1 10" fill="none" stroke={color} strokeWidth={1.05} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
