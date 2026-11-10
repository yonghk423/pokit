import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

const segments = ['M1 1h4', 'M5.5 1.5v4', 'M5.5 6.5v4', 'M1 11h4', 'M.5 6.5v4', 'M.5 1.5v4', 'M1 6h4'];
const digits = ['012345', '12', '01643', '01236', '1256', '05236', '054326', '012', '0123456', '012356'];

/** Film-camera date imprint; SVG digits keep the same shape in previews and exports. */
export function HeroFilmDateStamp({ date, testID }: { date: string; testID?: string }) {
  const parts = date.match(/\d+/g) ?? [];
  const value = parts.length >= 3 ? [parts[0]!.slice(-2), parts[1]!.padStart(2, '0'), parts[2]!.padStart(2, '0')].join(' ') : '';
  if (!value) return null;
  return <View testID={testID} pointerEvents="none" accessibilityLabel={date} style={{ position: 'absolute', left: 12, bottom: 16, width: 12, height: 68 }}>
    <Svg width={12} height={68} viewBox="0 0 12 68" accessible={false}>
      {[
        { color: '#B84316', width: 2.5, opacity: 0.08 },
        { color: '#D4531D', width: 1.7, opacity: 0.16 },
        { color: '#C24C20', width: 0.95, opacity: 0.84 },
        { color: '#EE8A42', width: 0.35, opacity: 0.3 },
      ].map((layer, layerIndex) => <G key={layerIndex} transform="translate(12 0) rotate(90)" stroke={layer.color} strokeWidth={layer.width} strokeLinecap="round" opacity={layer.opacity}>
        {value.split('').map((digit, index) => digit === ' ' ? null : <G key={index} transform={`translate(${index * 8} 0)`} opacity={[0.94, 0.82, 1, 0.9][index % 4]}>
          {digits[Number(digit)].split('').map((segment, segmentIndex) => <Path key={segment} d={segments[Number(segment)]} opacity={segmentIndex % 3 === 0 ? 0.84 : 1} />)}
        </G>)}
      </G>)}
    </Svg>
  </View>;
}
