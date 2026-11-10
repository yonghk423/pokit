import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';

const camera = require('../../../../assets/control-illustrations/photo-camera-save.png');

/** Play the instant-camera print before committing the photo diary. */
export function HeroShutterSave({ disabled, busy, label, photoUri, onPress }: { disabled: boolean; busy: boolean; label: string; photoUri?: string; onPress: () => void }) {
  const [printing, setPrinting] = useState(false);
  const locked = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    progress.stopAnimation();
  }, [progress]);
  const print = () => {
    if (disabled || busy || locked.current) return;
    locked.current = true;
    setPrinting(true);
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      onPress();
      setPrinting(false);
      locked.current = false;
    }, 1000);
  };
  return <Pressable testID="hero-original-photo-save" accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy || printing, busy: busy || printing }} disabled={disabled || busy || printing} onPress={print} style={s.target}>
    {({ pressed }) => <View style={[s.button, { opacity: disabled && !busy ? 0.45 : 1, transform: [{ translateY: pressed ? 2 : 0 }, { scale: pressed ? 0.96 : 1 }] }]}>
      {printing ? <View pointerEvents="none" style={s.printWindow}>
        <Animated.View style={[s.print, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [42, 0] }) }] }]}>
          {photoUri ? <Image source={{ uri: photoUri }} resizeMode="contain" style={s.printPhoto} /> : <View style={[s.printPhoto, s.blankPhoto]} />}
        </Animated.View>
      </View> : null}
      <Image source={camera} style={s.camera} resizeMode="contain" accessible={false} />
      {printing ? <View pointerEvents="none" style={s.redLight} /> : null}
      {busy ? <View style={s.progress}><ActivityIndicator color="#F6F3EA" /></View> : null}
    </View>}
  </Pressable>;
}
const s = StyleSheet.create({
  target: { width: 90, height: 72, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 4 },
  button: { width: 60, height: 48 },
  camera: { width: '100%', height: '100%' },
  printWindow: { position: 'absolute', width: 34, height: 43, left: 13, bottom: 42, overflow: 'hidden' },
  print: { width: 32, height: 40, padding: 3, paddingBottom: 8, backgroundColor: '#FFFEF8', borderWidth: 0.5, borderColor: '#D5D2C9' },
  printPhoto: { width: '100%', height: '100%' },
  blankPhoto: { backgroundColor: '#D5E4DE' },
  redLight: { position: 'absolute', left: 46, top: 7, width: 3, height: 4, borderRadius: 2, backgroundColor: '#FF403B', shadowColor: '#FF211D', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  progress: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
