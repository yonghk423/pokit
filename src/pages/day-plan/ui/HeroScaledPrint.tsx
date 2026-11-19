import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

/** Scale paper, handwriting and decoration together while retaining accurate scroll bounds. */
export function HeroScaledPrint({ width, height: fixedHeight, children }: { width: number; height?: number; children: ReactNode }) {
  const naturalWidth = width * 2;
  const [measuredHeight, setHeight] = useState<number | null>(null);
  const height = fixedHeight ?? measuredHeight;
  return <View style={{ width, height: height == null ? 0 : height / 2, opacity: height == null ? 0 : 1 }}>
    <View onLayout={fixedHeight === undefined ? event => { const next = event.nativeEvent.layout.height; setHeight(previous => previous !== null && Math.abs(previous - next) < 0.5 ? previous : next); } : undefined} style={{ position: 'absolute', width: naturalWidth, left: -width / 2, top: -(height ?? 0) / 4, transform: [{ scale: 0.5 }] }}>
      {children}
    </View>
  </View>;
}
