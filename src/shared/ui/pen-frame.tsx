import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Point = readonly [number, number];
type Line = readonly Point[];

/** Filled nib contours: pressure varies along the line, rather than a uniform SVG stroke. */
export function penContour(points: Line, weight = 1.3, phase = 0) {
  const samples: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[i];
    const c = points[i + 1];
    const d = points[Math.min(points.length - 1, i + 2)];
    const count = Math.max(6, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 2));
    for (let n = 0; n < count; n++) {
      const t = n / count;
      const axis = (k: 0 | 1) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t);
      samples.push([axis(0), axis(1)]);
    }
  }
  samples.push(points[points.length - 1]);
  const left: Point[] = []; const right: Point[] = [];
  samples.forEach((point, i) => {
    const before = samples[Math.max(0, i - 1)];
    const after = samples[Math.min(samples.length - 1, i + 1)];
    const dx = after[0] - before[0]; const dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    const t = i / Math.max(1, samples.length - 1);
    const pressure = 0.78 + 0.19 * Math.sin(t * Math.PI * 2 + phase) + 0.09 * Math.sin(t * Math.PI * 5 + phase);
    const taper = Math.min(1, 0.5 + Math.min(t, 1 - t) * 9);
    const radius = weight * pressure * taper / 2;
    left.push([point[0] - dy / length * radius, point[1] + dx / length * radius]);
    right.push([point[0] + dy / length * radius, point[1] - dx / length * radius]);
  });
  return left.concat(right.reverse()).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('') + 'Z';
}

export function PenFrame({ color }: { color: string }) {
  const [size, setSize] = useState({ width: 320, height: 74 });
  const w = size.width; const h = size.height;
  const edges: Line[] = [
    [[3, 3.2], [w * 0.18, 2.8], [w * 0.43, 3.5], [w * 0.73, 2.9], [w - 3, 3.2]],
    [[w - 3, 3], [w - 2.5, h * 0.28], [w - 3.4, h * 0.69], [w - 3, h - 3]],
    [[w - 3, h - 3], [w * 0.77, h - 3.5], [w * 0.46, h - 2.8], [w * 0.2, h - 3.3], [3, h - 3]],
    [[3, h - 3], [2.5, h * 0.73], [3.3, h * 0.34], [3, 3]],
  ];
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={({ nativeEvent: { layout } }) => {
    if (layout.width > 0 && layout.height > 0) setSize(old => old.width === layout.width && old.height === layout.height ? old : { width: layout.width, height: layout.height });
  }}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
      {edges.map((points, i) => <Path key={i} d={penContour(points, i % 2 ? 1.65 : 1.35, i * 1.2)} fill={color} />)}
    </Svg>
  </View>;
}
