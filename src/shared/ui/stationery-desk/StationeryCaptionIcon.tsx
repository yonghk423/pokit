import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const SOURCES = {
  face: require('../../../../assets/control-illustrations/memo.webp'),
  ink: require('../../../../assets/routine-icons/pencil.webp'),
};
/** Miniature graphite stationery, matching the header illustration family. */
export function StationeryCaptionIcon({ kind, color, size = 22 }: {
  kind: 'face' | 'ink'; color: string; size?: number;
}) {
  if (kind === 'face') {
    return <Image source={SOURCES.face} contentFit="contain" transition={0} useAppleWebpCodec={false} accessible={false} style={{ width: size, height: size * 26 / 24 }} />;
  }
  return (
    <View pointerEvents="none" style={{ width: size, height: size * 26 / 24 }}>
      <Image source={SOURCES.ink} contentFit="contain" transition={0} useAppleWebpCodec={false} accessible={false} style={StyleSheet.absoluteFill} />
      <Svg width={size} height={size * 26 / 24} viewBox="0 0 32 32" style={StyleSheet.absoluteFill} accessible={false}>
        <Path d="M3.6 29.3 5.5 24.8 9.4 26 7.1 28.1Z" fill={color} stroke="#646761" strokeWidth={0.4} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
