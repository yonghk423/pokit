import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AtmosphereFadeIn } from './AtmosphereFadeIn';
import {
  ATMOSPHERE_SLOT_STYLE,
  atmosphereLayersForVariant,
  type RoutineAtmosphereVariant,
} from './routineAtmosphereAssets';
import { useDeferredAtmosphereReady } from './useDeferredAtmosphereReady';

type Props = {
  variant: RoutineAtmosphereVariant;
  isDark?: boolean;
};

/**
 * 탭 뒤쪽 시티팝 콜라주 (탭당 랜덤 3장).
 * 본문·탭 전환을 우선하고, 준비되면 한꺼번에 페이드인한다.
 */
function RoutineTabAtmosphereBase({ variant, isDark = false }: Props) {
  const ready = useDeferredAtmosphereReady(80);
  const layers = useMemo(() => atmosphereLayersForVariant(variant), [variant]);
  const opacityScale = isDark ? 0.52 : 1;

  return (
    <View pointerEvents="none" style={styles.root} accessibilityElementsHidden>
      <AtmosphereFadeIn ready={ready} style={styles.fill}>
        {layers.map((layer) => (
          <Image
            key={`${layer.key}-${layer.slot}`}
            source={layer.source}
            style={[
              ATMOSPHERE_SLOT_STYLE[layer.slot],
              { opacity: layer.opacity * opacityScale },
            ]}
            contentFit="contain"
            cachePolicy="memory-disk"
            recyclingKey={`atmosphere-${layer.key}`}
            transition={0}
            priority="low"
          />
        ))}
      </AtmosphereFadeIn>
    </View>
  );
}

export const RoutineTabAtmosphere = memo(RoutineTabAtmosphereBase);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
