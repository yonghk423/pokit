import { POLAROID_PHOTO_HEIGHT } from '../lib/heroPolaroidFraming';
import { formatHeroPolaroidDate } from './HeroPolaroidExport';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemedText } from '@shared/ui/themed-text';
import type { AppFontId } from '@shared/lib/ui-font';
import { ComicSceneImage } from './HeroSceneImage';

/** White print with the same filled photo window as the downloadable card. */
export function HeroPolaroidPreview({ source, title, memo, pen, fontId, date }: { source?: ImageSourcePropType; title: string; memo?: string; pen?: string; fontId?: AppFontId; date?: string | number }) {
  const turn = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const turning = useRef(false);
  useEffect(() => { turn.stopAnimation(); turn.setValue(0); setFlipped(false); turning.current = false; }, [title, memo, date, turn]);
  const flip = () => {
    if (turning.current) return;
    turning.current = true;
    const next = !flipped;
    setFlipped(next);
    Animated.timing(turn, { toValue: next ? 1 : 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => { turning.current = false; });
  };
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const imageKey = `detail-polaroid:${typeof source === 'number' ? source : source && 'uri' in source ? source.uri : 'empty'}`;
  // Fit the whole print, including its caption border, inside the available area.
  const designWidth = 360;
  const captionHeight = 88;
  const photoHeight = POLAROID_PHOTO_HEIGHT;
  const designHeight = 24 + photoHeight + captionHeight + 18;
  const scale = Math.max(0, Math.min((space.width - 32) / designWidth, (space.height - 56) / designHeight));
  return <View testID="detail-polaroid-preview" onLayout={e => {
    const { width, height } = e.nativeEvent.layout;
    setSpace(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }} style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <Pressable testID="detail-polaroid-flip" accessibilityRole="button" accessibilityLabel={flipped ? '사진 보기' : '작성한 글 보기'} onPress={flip} style={{ alignSelf: 'flex-end', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
      <Svg width={30} height={30} viewBox="0 0 32 32" accessible={false}>
        <Path d="M4 11.5 13 10l2.5 17-9 1.5Z M6.3 14l4.8-.8 1.2 8.3-4.8.8Z" fill="none" stroke={pen ?? '#292D28'} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="m19 10 9 1.5-2.5 17-9-1.5Z m1.6 5 4.5.7 m-5 3 4.5.7 m-5 3 3 .5" fill="none" stroke={pen ?? '#292D28'} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8 7C11 1.8 21 1.8 24 7 m-4-1 4 1 .6-4" fill="none" stroke={pen ?? '#292D28'} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
    {scale > 0 ? <View testID="detail-polaroid-print" style={{ width: designWidth * scale, height: designHeight * scale }}>
      <Animated.View pointerEvents={flipped ? 'none' : 'auto'} accessibilityElementsHidden={flipped} style={{ backfaceVisibility: 'hidden', position: 'absolute', width: designWidth, height: designHeight, left: (designWidth * scale - designWidth) / 2, top: (designHeight * scale - designHeight) / 2, transform: [{ perspective: 1200 }, { scale }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }], backgroundColor: '#F9F9F6', padding: 18, paddingTop: 24 }}>
        <HeroPolaroidSurface />
        <ComicSceneImage source={source} imageKey={imageKey} contentFit="cover" contentPosition="center" showSkeletonOnMount transitionDuration={120} backgroundColor="#F9F9F6" style={{ width: designWidth - 36, height: photoHeight }} />
        <View style={{ height: captionHeight, paddingTop: 18, paddingHorizontal: 8, paddingBottom: 8, overflow: 'hidden' }}>
          {title.trim() ? <ThemedText fontId={fontId} numberOfLines={2} style={{ flexShrink: 1, fontSize: 22, lineHeight: 30, color: pen ?? '#292D28' }}>{title.trim()}</ThemedText> : null}

          <ThemedText testID="detail-polaroid-date" fontId={fontId} allowFontScaling={false} style={{ marginTop: 'auto', textAlign: 'right', fontSize: 15, lineHeight: 22, color: pen ?? '#565A52' }}>{formatHeroPolaroidDate(date)}</ThemedText>
        </View>
      </Animated.View>
      <Animated.View pointerEvents={flipped ? 'auto' : 'none'} accessibilityElementsHidden={!flipped} style={{ position: 'absolute', width: designWidth, height: designHeight, left: (designWidth * scale - designWidth) / 2, top: (designHeight * scale - designHeight) / 2, backfaceVisibility: 'hidden', transform: [{ perspective: 1200 }, { scale }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }], backgroundColor: '#F9F9F6', padding: 28 }}>
        <HeroPolaroidSurface />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18, paddingVertical: 12 }}>
          <ThemedText fontId={fontId} style={{ fontSize: 24, lineHeight: 34, color: pen ?? '#292D28' }}>{title.trim()}</ThemedText>
          <ThemedText testID="detail-polaroid-memo" fontId={fontId} style={{ fontSize: 19, lineHeight: 32, color: pen ?? '#292D28' }}>{memo?.trim() || '오늘의 이야기를 적어보세요.'}</ThemedText>
        </ScrollView>
        <ThemedText fontId={fontId} style={{ textAlign: 'right', fontSize: 15, color: pen ?? '#565A52' }}>{formatHeroPolaroidDate(date)}</ThemedText>
      </Animated.View>
    </View> : <View testID="detail-polaroid-loading" style={{ flex: 1, alignSelf: 'stretch', margin: 16, backgroundColor: '#EFEEE9' }} />}
  </View>;
}
