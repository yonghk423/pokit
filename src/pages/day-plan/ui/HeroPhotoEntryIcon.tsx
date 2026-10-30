import Svg, { Path } from 'react-native-svg';

/** A little hand-held camera, drawn like the diary's fountain-pen illustrations. */
export function HeroPhotoEntryIcon({ ink, size = 56 }: { ink: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 72 72" accessible={false}>
    <Path d="M5 66L16 43 17 30 26 23 42 25 57 43 66 65Z" fill={ink} opacity={0.025} />
    <Path d="M22 26L28 25 30 20 44 19.5 47 25 57 25.5 58 46 22 47Z" fill="none" stroke={ink} strokeWidth={1.35} strokeLinejoin="round" />
    <Path d="M38 26C23 25 23 47 38 48 53 48 55 27 38 26Z" fill="none" stroke={ink} strokeWidth={1.75} />
    <Path d="M38 30C27 29 28 44 38 44 48 44 49 30 38 30ZM32 34Q34 31 37 32M40 40L42 37M25 30L28 30M50 29L54 29M32 22L41 22" fill="none" stroke={ink} strokeWidth={0.85} strokeLinecap="round" />
    <Path d="M4 65L15 45 15 32Q16 28 20 26L23 22Q26 19 29 21L35 23Q36 26 32 27L25 25 21 30M15 35L21 32 26 33Q28 36 25 37L19 38M17 41L22 39 26 40Q27 43 23 44L20 46 19 52 12 67" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M65 66L57 51 56 45Q60 40 59 33L56 29 53 30 55 35 53 40M58 45L50 49 48 54 54 67M8 61L16 48M61 62L55 51M17 30L21 27" fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M37 14L36 7M45 15L49 9M28 15L25 11M53 20L59 17" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" />
    <Path d="M24 47L29 47.5M58 27L58.5 33M5 65L9 58" fill="none" stroke={ink} strokeWidth={0.5} opacity={0.6} strokeLinecap="round" />
  </Svg>;
}
