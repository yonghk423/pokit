import { memo } from 'react';
import { View } from 'react-native';

/** Small, static placeholder: no timer or layout-changing animation. */
export const HeroContentSkeleton = memo(function HeroContentSkeleton({ ink, testID = 'hero-content-skeleton' }: { ink: string; testID?: string }) {
  return <View testID={testID} accessible={false} pointerEvents="none" style={{ gap: 15, paddingTop: 8 }}>
    {[0.9, 0.76, 0.94, 0.62].map((width, index) => <View key={index} style={{ width: `${width * 100}%`, height: 11, borderRadius: 5, backgroundColor: ink, opacity: 0.13 }} />)}
  </View>;
});
