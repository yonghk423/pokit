import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

/** Scale paper, handwriting and decoration together while retaining accurate scroll bounds. */
export function HeroScaledPrint({ width, children }: { width: number; children: ReactNode }) {
  const naturalWidth = width * 2;
  const [height, setHeight] = useState<number | null>(null);
  return <View style={{ width, height: height == null ? 0 : height / 2, opacity: height == null ? 0 : 1 }}>
    <View onLayout={event => setHeight(event.nativeEvent.layout.height)} style={{ position: 'absolute', width: naturalWidth, left: -width / 2, top: -(height ?? 0) / 4, transform: [{ scale: 0.5 }] }}>
      {children}
    </View>
  </View>;
}
