import { useMemo } from 'react';
import { View, type LayoutRectangle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { penContour } from '@shared/ui/pen-frame';

/** A loose pen gesture: rounded around icons, flatter around wide controls. */
export function tutorialPenPaths(w: number, h: number) {
  const exponent = h > 140 ? 6 : w > 170 ? 4 : 2.5;
  const rx = w / 2 - 5, ry = h / 2 - 5;
  const points: [number, number][] = [];
  const start = -0.43;
  for (let i = 0; i <= 96; i++) {
    const a = start + i / 96 * Math.PI * 2.12;
    const c = Math.cos(a), s = Math.sin(a);
    const x = Math.sign(c) * Math.abs(c) ** (2 / exponent);
    const y = Math.sign(s) * Math.abs(s) ** (2 / exponent);
    // Uneven wrist movement, in points rather than a percentage of the card size.
    // This keeps long controls from becoming dramatically distorted.
    const driftX = 1.15 * Math.sin(a * 3 + 0.6) + 0.45 * Math.sin(a * 7);
    const driftY = 1.05 * Math.sin(a * 2 - 0.8) + 0.4 * Math.sin(a * 5);
    // The final sweep slips slightly outside the first stroke instead of tracing it.
    const release = Math.max(0, (i - 87) / 9);
    points.push([w / 2 + rx * x + driftX + release * 1.5,
      h / 2 + ry * y + driftY - release * 1.7]);
  }
  return {
    main: penContour(points, 1.8, 1.1),
    // A short, light return of the nib, rather than two concentric rings.
    finish: penContour(points.slice(88), 0.65, 2.8),
  };
}

/** Lives above the real button; the ink never receives gestures. */
export function TutorialPenHighlight({ target, width, height }: { target: LayoutRectangle; width: number; height: number }) {
  const dark = useColorScheme() === 'dark';
  const large = target.height > 120;
  const paddingX = large ? 24 : target.width > 100 ? 18 : 10;
  const paddingY = large ? 24 : target.width > 100 ? 16 : 12;
  const left = Math.max(2, target.x - paddingX);
  const top = Math.max(2, target.y - paddingY);
  const w = Math.max(12, Math.min(width - left - 2, target.x + target.width + paddingX - left));
  const h = Math.max(12, Math.min(height - top - 2, target.y + target.height + paddingY - top));
  const paths = useMemo(() => tutorialPenPaths(w, h), [w, h]);
  const ink = dark ? '#EEE9DE' : '#34362F';
  return <View testID="tutorial-pen-highlight" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', left, top, width: w, height: h }}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
      <Path d={paths.main} fill={ink} opacity={0.94} />
      <Path d={paths.finish} fill={ink} opacity={0.4} />
    </Svg>
  </View>;
}
