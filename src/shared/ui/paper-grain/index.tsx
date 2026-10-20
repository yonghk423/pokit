import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const PAPER_GRAIN = require('../../../../assets/color-textures/clean-paper.webp');

/** Fine, even paper fibers without the broad stains of the pigment texture. */
export function PaperGrain({ opacity = 0.32 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden style={[StyleSheet.absoluteFill, styles.paper, { opacity }]}>
      <Image
        source={PAPER_GRAIN}
        accessible={false}
        contentFit="cover"
        transition={0}
        useAppleWebpCodec={false}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  paper: { mixBlendMode: 'multiply' },
});
