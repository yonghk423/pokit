import Svg, { G, Path } from 'react-native-svg';

/** An open photo archive with prints peeking above its pocket. */
export function HeroGalleryIcon({ ink, selected, size = 34 }: { ink: string; selected: boolean; size?: number }) {
  const paper = '#FAF8F1';
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <G stroke={ink} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 15V11Q4 9 6 9h9l3 3h16q2 0 2 2v20H5Z" fill={selected ? '#E1E8DA' : '#F0EFE8'} />
      <Path d="m8 7 14-3 4 22-14 3Z" fill={paper} />
      <Path d="m10.5 9 9.5-2 2.5 13-9.5 2Z" fill={selected ? '#D5E4EB' : 'none'} strokeWidth={0.8} />
      <Path d="m21 5 13 3-4.5 22-13-3Z" fill={paper} />
      <Path d="m22.5 8 8.5 2-2.5 13-8.5-2Z" fill={selected ? '#E8DBD0' : 'none'} strokeWidth={0.8} />
      <Path d="M3 20q0-1.5 2-1.5h11l3 3h16q2 0 1.5 2L33 36H7Z" fill={selected ? '#DCE5DA' : '#F8F7F1'} />
      <Path d="m8 33 23 .2" strokeWidth={0.5} opacity={0.35} />
      <Path d="M17 26h7v6h-7Z m1.5 1.5h4v2.5h-4Z" fill="none" strokeWidth={0.8} />
    </G>
  </Svg>;
}
