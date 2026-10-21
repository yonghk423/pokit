import Svg, { Circle, Path } from 'react-native-svg';
export function DayRhythmSymbol({ kind, size = 32, ink = '#292B25' }: { kind: 'sun' | 'moon'; size?: number; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    {kind === 'sun' ? <>
      <Path d="M16 2L15.8 5M25.6 5.9L23.3 8.4M30 16L27.1 16.1M25.9 25.9L23.5 23.6M16 30L16.2 27.2M6 26L8.3 23.5M2 16L4.9 15.7M5.9 5.8L8.4 8.2" stroke={ink} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Path d="M16.4 7.9C21 7.6 24.5 11.4 24.1 16.1C24 20.8 20.6 24.4 15.8 24.2C11.2 24.2 7.6 20.7 7.9 15.9C7.8 11.4 11.6 7.9 16.4 7.9Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.1} />
      <Circle cx={13} cy={15} r={0.8} fill={ink} /><Circle cx={19} cy={15} r={0.8} fill={ink} />
      <Path d="M12.9 18.4Q16 21.2 19 18.3 M9.3 12.2Q11 8.5 15.3 8.8" stroke={ink} strokeWidth={0.8} strokeLinecap="round" fill="none" />
    </> : <>
      <Path d="M22.5 3.6C13.7 1.3 5.4 7.2 5 15.2C4.1 23.9 12.5 30.4 20 27.2C23.3 26.1 25.8 23.4 27 20.4C19.5 22 14.2 18.1 14.6 12C14.9 8.1 18 5.2 22.5 3.6Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.4 12.4C6 17.8 9.3 23.6 14.6 24.8M16.4 7.2Q13.2 11.5 15 15.8" fill="none" stroke="#5A5E52" strokeWidth={0.45} strokeLinecap="round" />
    </>}
  </Svg>;
}
