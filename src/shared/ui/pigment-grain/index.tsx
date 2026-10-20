import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const GRAIN_TEXTURE = require('../../../../assets/color-textures/grain-overlay.png');

/** 팔레트와 루틴 배경에 동일한 종이·안료 입자 질감을 적용한다. */
export function PigmentGrain() {
  return (
    <Image
      source={GRAIN_TEXTURE}
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={0}
    />
  );
}
