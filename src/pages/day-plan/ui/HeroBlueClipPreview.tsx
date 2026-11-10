import { DIARY_CLIP_IMAGES, type DiaryClip } from '../model/heroDiaryClip';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Image } from 'expo-image';


export function HeroBlueClipPreview({ dark, clip = 'blue' }: { dark: boolean; clip?: DiaryClip }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (ready || failed) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.8, duration: 650, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [ready, failed, opacity]);
  return <View accessibilityLabel={ready ? undefined : failed ? '집게 이미지를 불러오지 못했어요' : '집게 이미지 불러오는 중'} style={{ height: 72, justifyContent: 'center', alignItems: 'center' }}>
    {!ready && !failed ? <Animated.View testID="blue-clip-skeleton" pointerEvents="none" style={{ position: 'absolute', width: '85%', height: 36, borderRadius: 8, backgroundColor: dark ? '#626762' : '#DADCD7', opacity }} /> : null}
    {ready ? <View pointerEvents="none" style={{ position: 'absolute', width: '68%', height: 5, bottom: 12, borderRadius: 50, backgroundColor: dark ? 'rgba(0,0,0,0.3)' : 'rgba(28,31,52,0.12)', shadowColor: '#101528', shadowOpacity: 0.28, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } }} /> : null}
    <View style={{ width: '85%', height: 48, shadowColor: '#101528', shadowOpacity: ready ? 0.32 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 5 } }}>
      <Image source={DIARY_CLIP_IMAGES[clip]} contentFit="contain" cachePolicy="memory-disk" transition={0} priority="high" onDisplay={() => setReady(true)} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', opacity: ready ? 1 : 0 }} />
    </View>
  </View>;
}
