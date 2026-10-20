import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

/** Lightly irregular ink contours, readable at small toolbar sizes. */
export function PaperActionIcon({ name, size = 20, color = '#404848' }: {
  name: 'copy' | 'share' | 'check'; size?: number; color?: string;
}) {
  if (name !== 'check') return <Image source={name === 'copy' ? require('../../../../assets/control-illustrations/stack.webp') : require('../../../../assets/control-illustrations/send.webp')} contentFit="contain" useAppleWebpCodec={false} transition={0} accessible={false} style={{ width: size, height: size }} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} pointerEvents="none">
      <Path d="m4 12 5.3 5.2Q15 10 20 5.7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
