import Svg, { Path } from 'react-native-svg';

/** A small sheet and pencil, with loose graphite contours instead of a system compose glyph. */
export function SketchNewPageIcon({ size = 24, color = '#363630' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 28 28" accessible={false}>
    <Path d="M4.1 5L16.3 4.3L21.4 9.4L21.9 24L4.6 24.5Z" fill="#FFFFFF" />
    <Path d="M12.9 4.6L4 5.1L4.6 24.3Q12.8 24.8 21.9 24L21.6 15.2M4.9 8L5.2 22.7L15 23.1" fill="none" stroke={color} strokeWidth={0.95} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 8L3.1 25.7L18.4 25.1M6.7 5.8L12.5 5.3" fill="none" stroke={color} strokeWidth={0.45} opacity={0.5} strokeLinecap="round" />
    <Path d="M13.4 14.8L22.5 2.9Q23.2 2 24.4 2.9L25.7 4Q26.4 4.6 25.7 5.6L16.6 17.2L12 19.8Z" fill="#F0F0EC" stroke={color} strokeWidth={1} strokeLinejoin="round" />
    <Path d="M21.3 4.4L24.8 7.1M13.4 14.8L16.6 17.2M14.7 15.7L23.8 4.1M12.7 17.7L14 18.6M7.9 12.7L10.6 12.5M8.1 16L10.4 15.9M8.1 20.9L16.9 20.5" fill="none" stroke={color} strokeWidth={0.65} strokeLinecap="round" />
    <Path d="M12.2 19.6L13.7 18.7L12.9 18.1Z" fill={color} />
    <Path d="M6.1 22L9.4 21.8M19.8 19.4L20 22.1M17.7 14.4L23.9 6.3" fill="none" stroke={color} strokeWidth={0.35} opacity={0.45} strokeLinecap="round" />
  </Svg>;
}
