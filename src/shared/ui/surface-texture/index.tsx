import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { getPreparedSurfaceTexture, type SurfaceTextureKind } from './textureCache';

/** One stable image view across paper/pigment tab changes. */
export function SurfaceTexture({ kind, opacity = 1 }: { kind: SurfaceTextureKind; opacity?: number }) {
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={[StyleSheet.absoluteFill, { opacity }, kind === 'paper' && styles.paper]}>
      <Image
        source={getPreparedSurfaceTexture(kind)}
        accessible={false}
        contentFit="cover"
        cachePolicy="memory"
        priority="high"
        transition={0}
        useAppleWebpCodec={false}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({ paper: { mixBlendMode: 'multiply' } });
