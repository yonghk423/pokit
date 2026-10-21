import Svg, { Path } from 'react-native-svg';

/** Uneven pencil outline, pale pigment and a hand-drawn graphite check. */
export function PencilCheckbox({ checked, size = 20, ink = '#34362F' }: {
  checked: boolean; size?: number; ink?: string;
}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Path d="M3.1 3.8L20.4 3L21 20.4L3.7 21Z" fill={checked ? '#C5E8D7' : '#FAFAF5'} />
    {checked ? <Path d="M4.7 9L12.4 4.8M4.8 13L18.8 5.1M5 17.3L19 9.4M7.5 19.4L19.4 13M14 19.6L19.5 16.6" fill="none" stroke="#8CBFA5" strokeWidth={0.65} opacity={0.35} strokeLinecap="round" /> : null}
    <Path d="M3 12.4L2.7 3.7Q10.4 2.8 20.4 3.1L21.2 20.5Q12.2 21.2 3.5 20.8L3 12.4" fill="none" stroke={ink} strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" />
    <Path d="M4.1 8L3.8 4.5L14.9 3.8M20.2 8.4L20.5 19.8L8.2 20M4.1 15.7L4.3 19.8" fill="none" stroke={ink} strokeWidth={0.45} opacity={0.55} strokeLinecap="round" />
    {checked ? <>
      <Path d="M6.5 12.2Q8.6 14.4 10.5 16.6Q13.6 11.9 18.3 7.1" fill="none" stroke={ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.3 12.8L10.6 17.2L14 12.1M14.9 10.9L18.5 7" fill="none" stroke={ink} strokeWidth={0.5} opacity={0.6} strokeLinecap="round" />
    </> : null}
  </Svg>;
}
