import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { ComicSceneImage } from './HeroSceneImage';

/** A single illustration inside a softly irregular fountain-pen circle. */
export function HeroSceneEntryIcon({ ink }: { ink: string }) {
  return <View style={{ width: 56, height: 56 }} accessible={false}>
    <View style={{ position: 'absolute', left: 5, top: 5, width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: '#F3E8D2' }}>
      <ComicSceneImage imageKey="empty-scene-shortcut" source={COMIC_SCENE_THUMBNAILS['57-blue-bottle-cafe']} contentFit="cover" style={StyleSheet.absoluteFill} />
    </View>
    <Svg width={56} height={56} viewBox="0 0 56 56" style={StyleSheet.absoluteFill} accessible={false}>
      <Path d="M28 3C42 2 53 13 53 28C54 42 42 53 28 53C13 54 3 42 3 28C2 14 14 3 28 3Z" fill="none" stroke={ink} strokeWidth={1.15} strokeLinecap="round" />
      <Path d="M8 17Q13 6 25 5M50 34Q47 47 35 50" fill="none" stroke={ink} strokeWidth={0.45} opacity={0.45} strokeLinecap="round" />
    </Svg>
  </View>;
}
