import { Image, StyleSheet, View } from 'react-native';

const BORDER = require('../../../../assets/control-illustrations/button-border.webp');

/** A hollow graphite border: paper/color and touch targets remain underneath. */
export function HanddrawnFrame({ color, bold = false }: { color: string; bold?: boolean }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}><Image source={BORDER} accessible={false} resizeMode="stretch" capInsets={{ top: 18, left: 18, bottom: 18, right: 18 }} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', tintColor: color, opacity: bold ? 1 : 0.78 }]} /></View>;
}
