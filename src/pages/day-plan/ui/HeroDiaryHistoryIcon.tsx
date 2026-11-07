import Svg, { Path } from 'react-native-svg';

export function HeroDiaryHistoryIcon({ ink, size = 26 }: { ink: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 26 26" accessible={false}>
    <Path d="M4 9a9.5 9.5 0 1 1-.4 7M4 3.8V9h5.2M13 7v6l4 2.5" fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
