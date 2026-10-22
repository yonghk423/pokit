import Svg, { Path } from 'react-native-svg';
export const COMIC_CHECK_MINT = '#A6E6CA';
/** Layered pencil contours and uneven pigment, shared by cartoon selection and tasks. */
export function ComicCheck({ checked, size = 30, tone = 'default' }: { checked: boolean; size?: number; tone?: 'default' | 'destructive' }) {
  const destructive = tone === 'destructive';
  const fill = destructive ? '#F1B6B2' : COMIC_CHECK_MINT;
  const contour = destructive ? '#963F3A' : '#282823';
  return <Svg width={size} height={size} viewBox="0 0 30 30" accessible={false}>
    <Path d="M14.1 3.1L17.5 2.7L20.3 3.9L22.8 5.3L24.7 7.8L26.2 10.2L26.7 13.3L26.3 16.1L25.8 19.1L24 21.7L21.7 24L18.8 25.6L15.9 26.4L12.6 26L9.8 25.4L7.3 23.6L5.4 21.2L3.9 18.6L3.1 15.6L3.5 12.4L4.3 9.6L6 7.1L8.5 5.2L11.2 3.7Z" fill={checked ? fill : '#FFFFFF'} />
    {checked ? <>
      <Path d="M5.1 11L13.4 5.4M4.8 15.8L20.5 5.5M5.5 20.3L24 8.2M8.8 23.3L25.4 12.7M13.1 24.9L24.5 17.8" stroke={destructive ? '#FCE5E2' : '#D8F4E6'} strokeWidth={1.1} opacity={0.45} strokeLinecap="round" />
      <Path d="M8.2 8.1L11.2 6.1M6.9 19.5L10.1 17.5M20.8 21L23.3 19.3" stroke={destructive ? '#CC7770' : '#74CDA9'} strokeWidth={0.45} opacity={0.5} />
    </> : null}
    <Path d="M14.1 2.5C18.6 1.6 22 4.1 24.2 7.1C26 9.4 27.7 12.8 26.9 16.1C26.6 20.2 23.8 24.1 20.3 25.7C16.6 27.6 12.6 27.1 9.2 25.6C5.5 23.8 2.8 19.9 2.8 16.1C2.1 12.6 4.1 8.6 6.4 6.4C8.6 4.2 11.3 2.9 14.8 2.8" fill="none" stroke={contour} strokeWidth={0.95} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8.7 3.9C12.4 1.5 17 1.7 20.3 3.7C24.2 5.5 27.4 10.2 27.5 14.4M26.7 18.5C25.4 23.3 21.1 27.4 16.4 27.7C12.3 28 8.1 26.1 5.7 23.4M3.6 21.2C1.1 17.7 1.9 12.9 3.5 9.4C4.2 8 5.2 6.8 6.2 6" fill="none" stroke={destructive ? '#963F3A' : '#30302B'} strokeWidth={0.5} opacity={0.65} strokeLinecap="round" />
    <Path d="M4.6 11.8L4.1 14.2M8.3 24L10.4 25M22.8 6.2L24 7.8M23.9 22L22.3 23.8" fill="none" stroke={destructive ? '#A65D56' : '#5B5B52'} strokeWidth={0.35} strokeLinecap="round" />
    {checked ? <>
      <Path d="M8.2 14.8L8.9 14.2L10.1 15.1L11.3 16.3L12.9 17.6L14.4 15.7L16.1 13.7L18.6 11.1L20.8 9.4L21.6 9.7L21.3 10.6L19.2 12.9L17 15.3L15.3 17.4L13.6 19.7L12.9 20L11.7 18.8L10.3 17.4L8.8 16.1Z" fill={destructive ? '#742C29' : '#20201B'} />
      <Path d="M7.9 15.2L10.2 17.5L13 20.3L16.9 15.2L21.7 10M9 14.1L12.8 17.8L16 13.7L20.3 9.6" fill="none" stroke={destructive ? '#742C29' : '#383831'} strokeWidth={0.45} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </> : null}
  </Svg>;
}
