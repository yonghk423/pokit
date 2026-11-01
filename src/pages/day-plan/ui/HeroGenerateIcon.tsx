import Svg, { Path } from 'react-native-svg';

/** Approved C concept: a fountain nib drawing a portrait on a tilted photo card. */
export function HeroGenerateIcon({ ink }: { ink: string }) {
  return <Svg testID="hero-generate-portrait-pen" width={44} height={44} viewBox="0 0 100 100" accessible={false} pointerEvents="none">
    <Path d="m29 30 23-5m16 17 6 34q1 4-3 5l-32 8q-4 1-5-3L23 40" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M52 37q-13 2-15 14-1 5-1 8l-3.5 5 3.2 1.6-.6 3.1 2.1 1.5q-1 4 3 4l5-1q7 9 1 16M48 42q-6 8 2 12l7 2q5 2 6 6m-9-6q2 7 8 10l5 5m-28-14 3 1m-2 3 3 .3" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M45 41q-5 8 2 10c5 2 10-4 15-10" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" />
    <Path d="m78 8 9 6-12 16-8-6Z" fill={ink} stroke={ink} strokeWidth={1.05} strokeLinejoin="round" />
    <Path d="m77 10 7 4m-4-2-10 14" fill="none" stroke="#F5E8CF" strokeWidth={.65} strokeLinecap="round" />
    <Path d="m67 24-3 4 8 6 3-4q-2-5-8-6Z" fill="#F5E8CF" stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
    <Path d="m65 29-9 8-3 11 10-6 8-9Z" fill={ink} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
    <Path d="m54 46 8-9m1-1a1 1 0 1 0 .1 0" fill="none" stroke="#F5E8CF" strokeWidth={.85} strokeLinecap="round" />
    <Path d="M24 28q-.7 5-4.6 6 4.1.5 4.8 6 .7-5.3 4.8-6-4.3-.6-5-6Z" fill={ink} />
  </Svg>;
}
