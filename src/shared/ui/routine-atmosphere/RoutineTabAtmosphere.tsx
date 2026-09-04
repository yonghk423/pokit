import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import {
  ATMOSPHERE_SLOT_STYLE,
  atmosphereLayersForVariant,
  type RoutineAtmosphereVariant,
} from './routineAtmosphereAssets';

type Props = {
  variant: RoutineAtmosphereVariant;
  isDark?: boolean;
};

/**
 * 탭 뒤쪽 시티팝 콜라주.
 * 화면마다 5~6장을 가장자리에 흩뿌린다.
 */
export function RoutineTabAtmosphere({ variant, isDark = false }: Props) {
  const layers = atmosphereLayersForVariant(variant);
  const opacityScale = isDark ? 0.52 : 1;

  return (
    <View pointerEvents="none" style={styles.root} accessibilityElementsHidden>
      {layers.map((layer) => (
        <Image
          key={`${variant}-${layer.key}-${layer.slot}`}
          source={layer.source}
          style={[
            ATMOSPHERE_SLOT_STYLE[layer.slot],
            { opacity: layer.opacity * opacityScale },
          ]}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={`atmosphere-${layer.key}`}
          transition={0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
});
