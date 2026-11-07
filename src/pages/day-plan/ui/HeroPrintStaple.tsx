import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Small metal staple centered above a printed photograph. */
export function HeroPrintStaple() {
  return <View pointerEvents="none" accessible={false} style={{ position: 'absolute', top: 3, left: '50%', marginLeft: -13, width: 26, height: 6 }}>
    <Svg width={26} height={6} viewBox="0 0 26 6">
      <Path d="m3 3.5 20-.4" stroke="#514E43" strokeWidth={2.2} strokeLinecap="round" opacity={0.3} />
      <Path d="m3 2 20-.4-.6 2-19 .3Z" fill="#8E8C7D" stroke="#646557" strokeWidth={0.5} />
      <Path d="m4 2 18-.3" stroke="#E1DECD" strokeWidth={0.7} strokeLinecap="round" />
    </Svg>
  </View>;
}
