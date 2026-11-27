import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { useStoreArtwork } from '../lib/storeArtwork';
import { type DiaryClip } from '../model/heroDiaryClip';
import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';




export function HeroBlueClipPreview({ dark, clip = 'blue' }: { dark: boolean; clip?: DiaryClip }) {
  const { artwork } = useStoreArtwork();
  const ready = !!artwork;
  const [failed, setFailed] = useState(false);
  const cherryBinder = clip === 'cherry-binder';
  return <View accessibilityLabel={ready ? undefined : failed ? translateUiText("집게 이미지를 불러오지 못했어요") : translateUiText("집게 이미지 불러오는 중")} style={{ height: cherryBinder ? 58 : 56, justifyContent: 'center', alignItems: 'center' }}>
    {!ready && !failed ? <View testID="blue-clip-skeleton" pointerEvents="none" style={{ position: 'absolute', width: '68%', height: 29, borderRadius: 8, backgroundColor: dark ? '#626762' : '#DADCD7', opacity: 0.4 }} /> : null}
    <View style={cherryBinder ? { width: '85%', height: 58 } : { width: clip === 'rose-pink-bookmark' ? 25 : '80%', aspectRatio: clip === 'rose-pink-bookmark' ? 864 / 1888 : artwork ? artwork[clip].width / artwork[clip].height : 640 / 213, overflow: 'visible' }}>
      {artwork ? <Image source={artwork[clip]} contentFit={cherryBinder ? 'contain' : 'fill'} contentPosition="center" allowDownscaling={false} cachePolicy="memory" transition={0} useAppleWebpCodec={false} priority="high"  onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} /> : null}
    </View>
  </View>;
}
