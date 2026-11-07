import Svg, { G, Path } from 'react-native-svg';

/** Two blank instant prints; selection brings color into the paper and emulsion. */
export function HeroGalleryIcon({ ink, selected, size = 34 }: { ink: string; selected: boolean; size?: number }) {
  const paper = selected ? '#FAF8F1' : 'none';
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <G stroke={ink} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.7 7.8 25.8 3.9 30.1 30.8 8.4 34.8Z" fill={paper} />
      <Path d="M6.8 10.3 23.5 7.4 26.4 25.1 10 28.1Z" fill={selected ? '#DCE8EE' : 'none'} />
      <Path d="m8.9 34.9 21.4-3.7" opacity={0.3} strokeWidth={0.6} />
      <Path d="m17 9 20.1 3.3-4.3 25-20-3.4Z" fill={selected ? '#FCFAF5' : '#F7F6F4'} />
      <Path d="m19.4 12.3 14.5 2.4-2.7 15.7-14.6-2.5Z" fill={selected ? '#E8E1EE' : 'none'} />
      <Path d="m13.1 34.5 19.8 3.3M17.2 9.4l19.5 3.2" strokeWidth={0.5} opacity={0.5} />
    </G>
  </Svg>;
}
