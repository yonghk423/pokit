import Svg, { Path } from 'react-native-svg';

/** Fine ink check with a slight hand drawn echo for the selected color swatch. */
export function PaletteSelectionCheck({ color, size = 16, outlineColor, strokeWidth = 1.65 }: {
  color: string; size?: number; outlineColor?: string; strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden>
      {outlineColor ? <Path
        d="M2.8 8.8c1.2.9 2.5 2.3 4.1 4.1.3.3.6.3.9-.1 2.1-2.9 4.5-5.8 8-8.8"
        stroke={outlineColor}
        strokeWidth={strokeWidth + 2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      /> : null}
      <Path
        d="M2.8 8.8c1.2.9 2.5 2.3 4.1 4.1.3.3.6.3.9-.1 2.1-2.9 4.5-5.8 8-8.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3.1 9.7c1 .8 2.1 1.9 3 2.8m2.1-.3c2.2-2.8 4.1-5 6-6.7"
        stroke={color}
        strokeWidth={0.55}
        strokeLinecap="round"
        fill="none"
        opacity={0.48}
      />
    </Svg>
  );
}
