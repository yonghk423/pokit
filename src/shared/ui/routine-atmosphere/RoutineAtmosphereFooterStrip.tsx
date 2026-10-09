import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AtmosphereFadeIn } from './AtmosphereFadeIn';
import {
  footerStripForVariant,
  type RoutineAtmosphereVariant,
} from './routineAtmosphereAssets';
import { useDeferredAtmosphereReady } from './useDeferredAtmosphereReady';

type Props = {
  variant: RoutineAtmosphereVariant;
  isDark?: boolean;
  /** 여백이 큰 화면(템플릿 등)에서 타일을 키워 빈 공간을 채움 */
  density?: 'default' | 'rich';
};

const TILE_ROTATE = [-6, 4, -3, 5, -4] as const;
const TILE_LIFT = [0, 10, 2, 14, 4] as const;

/**
 * 리스트 하단 스크랩북 스트립.
 * 전환 직후에는 자리만 잡고, 준비되면 타일을 한꺼번에 페이드인한다.
 */
function RoutineAtmosphereFooterStripBase({
  variant,
  isDark = false,
  density = 'default',
}: Props) {
  const ready = useDeferredAtmosphereReady(100);
  const sources = useMemo(() => footerStripForVariant(variant), [variant]);
  const opacity = isDark ? 0.38 : 0.82;
  const rich = density === 'rich';
  const tileSize = rich ? 148 : 132;

  return (
    <View
      style={[styles.root, rich && styles.rootRich]}
      pointerEvents="none"
      accessibilityElementsHidden>
      <AtmosphereFadeIn ready={ready} style={styles.fadeRow}>
        {sources.map((source, index) => (
          <Image
            key={`footer-${index}`}
            source={source}
            style={[
              styles.tile,
              {
                width: tileSize,
                height: tileSize,
                opacity,
                zIndex: index + 1,
                marginTop: TILE_LIFT[index % TILE_LIFT.length] ?? 0,
                transform: [
                  {
                    rotate: `${TILE_ROTATE[index % TILE_ROTATE.length] ?? 0}deg`,
                  },
                ],
              },
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`atmosphere-footer-${index}`}
            transition={0}
            priority="low"
          />
        ))}
      </AtmosphereFadeIn>
    </View>
  );
}

export const RoutineAtmosphereFooterStrip = memo(RoutineAtmosphereFooterStripBase);

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    paddingTop: 22,
    paddingBottom: 12,
    paddingHorizontal: 8,
    minHeight: 160,
  },
  rootRich: {
    paddingTop: 32,
    paddingBottom: 18,
    paddingHorizontal: 4,
    minHeight: 196,
  },
  fadeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  tile: {
    width: 132,
    height: 132,
    borderRadius: 2,
    overflow: 'hidden',
  },
});
