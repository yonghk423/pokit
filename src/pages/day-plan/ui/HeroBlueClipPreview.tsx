import { useStoreArtwork } from '../lib/storeArtwork';
import { type DiaryClip } from '../model/heroDiaryClip';
import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';




export function HeroBlueClipPreview({ dark, clip = 'blue' }: { dark: boolean; clip?: DiaryClip }) {
  const { artwork } = useStoreArtwork();
  const ready = !!artwork;
  const [failed, setFailed] = useState(false);
  return <View accessibilityLabel={ready ? undefined : failed ? '집게 이미지를 불러오지 못했어요' : '집게 이미지 불러오는 중'} style={{ height: 72, justifyContent: 'center', alignItems: 'center' }}>
    {!ready && !failed ? <View testID="blue-clip-skeleton" pointerEvents="none" style={{ position: 'absolute', width: '85%', height: 36, borderRadius: 8, backgroundColor: dark ? '#626762' : '#DADCD7', opacity: 0.4 }} /> : null}
    {ready ? <View pointerEvents="none" style={{ position: 'absolute', width: '68%', height: 5, bottom: 12, borderRadius: 50, backgroundColor: dark ? 'rgba(0,0,0,0.3)' : 'rgba(28,31,52,0.12)', shadowColor: '#101528', shadowOpacity: 0.28, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } }} /> : null}
    <View style={{ width: '85%', height: 48, shadowColor: '#101528', shadowOpacity: ready ? 0.32 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 5 } }}>
      {artwork ? <Image source={artwork[clip]} contentFit="contain" cachePolicy="memory-disk" transition={0} useAppleWebpCodec={false} priority="high"  onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} /> : null}
    </View>
  </View>;
}
