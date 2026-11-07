import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Image, Path, Polygon } from 'react-native-svg';

const artwork = require('../../../../assets/control-illustrations/polaroid-overview-photo.webp');
// Paper outlines in the photographic source; each print keeps its own pixels while moving.
const prints = [
  { points: '166.73,28.43 267.59,27 270.12,147.56 165.85,151.08', x: 217.57, y: 88.52, angle: -0.81, stacked: -9 },
  { points: '8,131.06 98.75,90.03 148.25,201.68 55.3,244.02', x: 77.58, y: 166.7, angle: -24.33, stacked: 7 },
  { points: '289.92,126.88 391.89,153.06 362.52,272.07 260.44,245.67', x: 326.19, y: 199.42, angle: 14.4, stacked: -4 },
  { points: '36.05,258.65 129.77,219.49 181.03,333.12 86.65,372.17', x: 108.38, y: 295.86, angle: -22.68, stacked: 11 },
  { points: '163.43,177.7 266.16,186.28 254.39,311.12 151.77,300.45', x: 208.94, y: 243.89, angle: 4.77, stacked: 0 },
];

const sceneIds = ['05-work', 'p2-04-birthday-surprise', 'p3-14-dog-walk', 'p4-19-station-wait', 'p5-01-platform', 'p6-01-rush-hour-commute'] as const;
// Keep the real paper edges and replace only the photographic windows.
const photoWindows = [
  { points: '173.77,35.03 261.32,34.26 262.64,123.58 174.10,124.13', transform: 'matrix(0.87558 -0.00770 0.00330 0.89098 173.76568 35.02979)' },
  { points: '14.05,135.68 94.35,99.93 130.87,180.56 50.57,217.63', transform: 'matrix(0.80298 -0.35749 0.36519 0.81948 14.04984 135.67717)' },
  { points: '297.29,135.46 383.64,158.56 358.56,246.77 274.19,223.67', transform: 'matrix(0.86348 0.23099 -0.23099 0.88218 297.29247 135.45718)' },
  { points: '44.85,264.59 126.80,228.95 163.43,312.77 80.93,349.07', transform: 'matrix(0.81948 -0.35639 0.36079 0.84478 44.84904 264.59381)' },
  { points: '170.25,185.40 258.79,194.53 249.66,285.82 160.35,276.25', transform: 'matrix(0.88548 0.09130 -0.09900 0.90858 170.24577 185.39588)' },
];

/** When the overview is open, the same photographs gather into a compact pile. */
export function HeroPolaroidOverviewIcon({ size = 32, expanded = false }: { ink?: string; size?: number; expanded?: boolean }) {
  const id = useId().replace(/:/g, '');
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduced) { progress.setValue(expanded ? 1 : 0); return; }
    const animation = Animated.timing(progress, { toValue: expanded ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [expanded, reduced, progress]);
  return <View pointerEvents="none" accessible={false} style={{ width: size, height: size }}>
    {[...prints, prints[4]].map((print, index) => {
      const x = index === 5 ? 325 : print.x;
      const y = index === 5 ? 318 : print.y;
      const photo = photoWindows[Math.min(index, 4)];
      const paperOutline = `M${print.points.split(' ').join(' L')} Z M${photo.points.split(' ').join(' L')} Z`;
      return <Animated.View key={index} style={{ position: 'absolute', width: size, height: size, left: (x / 400 - 0.5) * size, top: (y / 400 - 0.5) * size, transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, (0.5 - x / 400) * size] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, (0.5 - y / 400) * size] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: [index === 5 ? '-12deg' : '0deg', `${print.stacked - print.angle}deg`] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) },
    ] }}>
      <Svg width={size} height={size} viewBox="0 0 400 400" accessible={false} style={{ overflow: 'visible' }}>
        <Defs><ClipPath id={`${id}-${index}`}><Path d={paperOutline} fillRule="evenodd" clipRule="evenodd" /></ClipPath><ClipPath id={`${id}-photo-${index}`}><Polygon points={photo.points} /></ClipPath></Defs>
        <G transform={`translate(${200 - print.x} ${200 - print.y})`}>
          <Image href={artwork} width={400} height={400} clipPath={`url(#${id}-${index})`} />
          <G clipPath={`url(#${id}-photo-${index})`}>
            <Image href={COMIC_SCENE_THUMBNAILS[sceneIds[index]]} width={100} height={100} transform={photo.transform} preserveAspectRatio="xMidYMid slice" />
          </G>
        </G>
      </Svg>
    </Animated.View>; })}
  </View>;
}
