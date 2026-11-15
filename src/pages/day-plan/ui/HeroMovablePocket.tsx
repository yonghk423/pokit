import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDiaryTheme } from '../model/diaryTheme';
import { DiaryItemImage } from './DiaryItemImage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

const WIDTH = 44;
const HEIGHT = 44;
const POSITION_KEY = 'pokit:diary-pocket-position';

export function HeroMovablePocket({ defaultTop, ko }: { defaultTop: number; ko: boolean }) {
  const theme = useDiaryTheme('pocket');
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState(() => {
    const value = localStorageClient.getJson<{ x: number; y: number }>(POSITION_KEY);
    return value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : null;
  });
  const maxX = Math.max(0, bounds.width - WIDTH);
  const maxY = Math.max(0, bounds.height - HEIGHT);
  const left = Math.max(0, Math.min(maxX, position ? position.x * maxX : bounds.width - 124 - WIDTH));
  const top = Math.max(0, Math.min(maxY, position ? position.y * maxY : defaultTop));
  const offset = useRef(new Animated.ValueXY()).current;
  const origin = useRef({ x: 0, y: 0 });
  useEffect(() => { offset.setValue({ x: left, y: top }); }, [left, top, offset]);
  const drag = Gesture.Pan().enabled(bounds.width > 0 && bounds.height > 0)
    .activateAfterLongPress(350).minDistance(8).runOnJS(true)
    .onStart(() => {
      origin.current = { x: left, y: top };
      tapHaptic('select');
    })
    .onUpdate(event => {
      offset.setValue({
        x: Math.max(0, Math.min(maxX, origin.current.x + event.translationX)),
        y: Math.max(0, Math.min(maxY, origin.current.y + event.translationY)),
      });
    })
    .onEnd((event, success) => {
      if (!success) return;
      const x = Math.max(0, Math.min(maxX, origin.current.x + event.translationX));
      const y = Math.max(0, Math.min(maxY, origin.current.y + event.translationY));
      const next = { x: maxX ? x / maxX : 0, y: maxY ? y / maxY : 0 };
      localStorageClient.setJson(POSITION_KEY, next);
      setPosition(next);
    })
    .onFinalize((_event, success) => {
      if (!success) offset.setValue({ x: left, y: top });
    });
  if (!theme) return null;
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 4 }]} onLayout={event => setBounds({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
    <GestureDetector gesture={drag}>
      <Animated.View testID="hero-movable-pocket" accessible accessibilityLabel={translateUiText("봉투 장식")} accessibilityHint={translateUiText("꾹 누른 뒤 끌어서 이동")} style={{ position: 'absolute', left: 0, top: 0, width: WIDTH, height: HEIGHT, transform: offset.getTranslateTransform() }}>
        <DiaryItemImage pointerEvents="none" accessible={false} source={theme.source} contentFit="contain" style={{ width: WIDTH, height: 37 }} />
      </Animated.View>
    </GestureDetector>
  </View>;
}
