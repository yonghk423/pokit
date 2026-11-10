import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';

/** Fixed-size white placeholder stays in place until the photo has decoded. */
export function HeroCalendarPhoto({ uri, contain = false }: { uri: string; contain?: boolean }) {
  const [settled, setSettled] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const imageReady = useCalendarWidgetImageReady();
  useEffect(() => {
    opacity.setValue(0);
    if (settled !== uri) return;
    const animation = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) imageReady?.(); });
    return () => animation.stop();
  }, [settled, uri, opacity, imageReady]);
  return <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}><Image source={{ uri }} resizeMode={contain ? 'contain' : 'cover'} style={StyleSheet.absoluteFill} onLoad={() => { setSettled(uri); }} onError={() => { setSettled(uri); }} /></Animated.View>
    {settled !== uri ? <View testID="calendar-photo-skeleton" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECECEC' }]}><View style={{ position: 'absolute', top: '25%', left: '15%', width: '70%', height: '50%', backgroundColor: '#F5F5F5' }} /></View> : null}
  </View>;
}
