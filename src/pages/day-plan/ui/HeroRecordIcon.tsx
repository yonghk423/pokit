import Svg, { G, Path, Rect } from 'react-native-svg';

/** A fixed print or photo journal; no artwork downloads or thumbnail decoding. */
export function HeroRecordIcon({ journal = false, selected = false, ink = '#30372E', size = 34 }: { journal?: boolean; selected?: boolean; ink?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 48" accessible={false}>
    <G rotation={journal ? -4 : -5} origin="20,24">
      {journal ? <>
        <Path d="M5 3Q19 2 34 3Q36 3 36 6V43Q36 45 33 45H5Z" fill={selected ? '#DCE5D0' : '#F8F6EF'} stroke={ink} strokeWidth={1.35} strokeLinejoin="round" />
        <Path d="M9 3V44M5 44Q20 43 34 44" stroke={ink} strokeWidth={0.9} fill="none" />
        <Rect x={14} y={9} width={17} height={24} fill="#FAF9F4" stroke={ink} strokeWidth={1} />
        <Rect x={16} y={11} width={13} height={16} fill={selected ? '#E8D6C2' : '#E5E4DC'} />
        <Path d="M15 38L29 37.5" fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" />
      </> : <>
        <Path d="M4 2 36 2.5 35.5 45 4.5 45.5Z" fill="#FAF9F4" stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
        <Path d="M7.5 6H32.5V32H8Z" fill={selected ? '#CBDED5' : '#E5E6DF'} stroke={selected ? '#748D81' : ink} strokeWidth={0.8} />
        <Path d="m9 38 17-.6" stroke={ink} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      </>}
    </G>
  </Svg>;
}
