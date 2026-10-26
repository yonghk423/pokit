import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const HERO_SOURCE = require('../../../../assets/splash-artwork.png');
const SHELF_ROWS = 7;

/** Intro artwork with a paper skeleton that holds its frame until the large PNG decodes on device. */
export function TutorialHeroImage({ width, height }: { width: number; height: number }) {
  const [loaded, setLoaded] = useState(false);
  const pulse = useRef(new Animated.Value(0.55)).current;
  const skeletonOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loaded) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 720, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 720, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [loaded, pulse]);

  useEffect(() => {
    if (!loaded) return;
    Animated.timing(skeletonOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  }, [loaded, skeletonOpacity]);

  // Match ComicSceneDeck card radius (16). Asset corners are also masked transparent.
  return <View style={{ width, height, borderRadius: 16, overflow: 'hidden' }}>
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, s.card, { opacity: Animated.multiply(pulse, skeletonOpacity) }]}>
      <View style={s.shelves}>
        {Array.from({ length: SHELF_ROWS }, (_, index) => <View key={index} style={s.shelf} />)}
      </View>
      <View style={[s.figure, { width: width * 0.2, height: height * 0.62, left: width * 0.4, top: height * 0.22 }]} />
      <View style={s.floor} />
    </Animated.View>
    <Image
      source={HERO_SOURCE}
      contentFit="contain"
      transition={260}
      recyclingKey="splash-artwork-rounded-v2"
      style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: '#ECE4D2', borderRadius: 16 },
  shelves: { position: 'absolute', left: '8%', right: '8%', top: '7%', height: '66%', justifyContent: 'space-between' },
  shelf: { height: 6, borderRadius: 2, backgroundColor: 'rgba(23,21,16,0.1)' },
  figure: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(23,21,16,0.08)' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '16%', backgroundColor: 'rgba(23,21,16,0.04)' },
});
