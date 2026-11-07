import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

/** Scale paper, handwriting and decoration together while retaining accurate scroll bounds. */
export function HeroScaledPrint({ width, children }: { width: number; children: ReactNode }) {
  const naturalWidth = width * 2;
  const [height, setHeight] = useState(naturalWidth * 4 / 3 + 90);
  return <View style={{ width, height: height / 2 }}>
    <View onLayout={event => setHeight(event.nativeEvent.layout.height)} style={{ position: 'absolute', width: naturalWidth, left: -width / 2, top: -height / 4, transform: [{ scale: 0.5 }] }}>
      {children}
    </View>
  </View>;
}
