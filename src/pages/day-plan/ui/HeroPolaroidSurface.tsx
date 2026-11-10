import { Image, StyleSheet, View } from 'react-native';
import { useId, useRef } from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Gently handled photographic stock, drawn behind the image and caption. */
export function HeroPolaroidSurface({ onReady, onError }: { onReady?: () => void; onError?: (error: unknown) => void } = {}) {
  const loaded = useRef(new Set<string>());
  const ready = (layer: string) => {
    loaded.current.add(layer);
    if (loaded.current.size === 2) onReady?.();
  };
  const id = useId().replace(/:/g, '');
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#F1F0EC' }]}>
    <Image onLoad={() => ready('stock')} onError={onError} source={require('../../../../assets/textures/polaroid-stock-v1.png')} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0.18 }} />
    <Image onLoad={() => ready('handled')} onError={onError} source={require('../../../../assets/textures/polaroid-handled-v1.png')} resizeMode="stretch" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.72 }]} />
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id={`${id}-light`} cx="15%" cy="0%" rx="95%" ry="110%"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} /><Stop offset="0.65" stopColor="#FFFFFF" stopOpacity={0} /><Stop offset="1" stopColor="#746F60" stopOpacity={0.055} /></RadialGradient><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} /><Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} /><Stop offset="1" stopColor="#999994" stopOpacity={0.07} /></LinearGradient></Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
      <Rect width="100%" height="100%" fill={`url(#${id}-light)`} />
    </Svg>
    <View style={[StyleSheet.absoluteFill, { borderTopWidth: 0.8, borderLeftWidth: 0.7, borderBottomWidth: 1.8, borderRightWidth: 1.4, borderTopColor: '#FFFFFFA0', borderLeftColor: '#FFFFFF70', borderBottomColor: '#9C9B9480', borderRightColor: '#B1B0A870' }]} />
    <View style={{ position: 'absolute', top: 1, left: 1, right: 1, height: 1, backgroundColor: '#FFFFFF70' }} />
    <View style={{ position: 'absolute', bottom: 2.1, left: 1, right: 1, height: 0.7, backgroundColor: '#FFFFFF60' }} />
  </View>;
}

/** Reflections belong to the print coating, leaving the source photograph untouched. */
export function HeroPhotoEmulsion() {
  const id = `emulsion-${useId().replace(/:/g, '')}`;
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.11} />
          <Stop offset="0.28" stopColor="#FFFFFF" stopOpacity={0.025} />
          <Stop offset="0.46" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.015} />
        </LinearGradient>
        <LinearGradient id={`${id}-recess`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#25241F" stopOpacity={0.23} />
          <Stop offset="1" stopColor="#25241F" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
      <Rect width="100%" height={3} fill={`url(#${id}-recess)`} />
    </Svg>
    <View style={[StyleSheet.absoluteFill, { borderTopWidth: 0.7, borderLeftWidth: 0.6, borderRightWidth: 0.5, borderBottomWidth: 0.8, borderTopColor: '#38383380', borderLeftColor: '#47474155', borderRightColor: '#FFFFFF99', borderBottomColor: '#FFFFFFDD' }]} />
    <View style={{ position: 'absolute', bottom: 1, left: 1, right: 1, height: 0.5, backgroundColor: '#FFFFFF35' }} />
  </View>;
}
