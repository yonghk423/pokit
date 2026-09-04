import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import {
  footerStripForVariant,
  type RoutineAtmosphereVariant,
} from './routineAtmosphereAssets';

type Props = {
  variant: RoutineAtmosphereVariant;
  isDark?: boolean;
  /** 여백이 큰 화면(템플릿 등)에서 타일을 키워 빈 공간을 채움 */
  density?: 'default' | 'rich';
};

/**
 * 리스트 하단 스크랩북 스트립 — 배경 콜라주와 다른 PNG를 추가로 노출.
 */
export function RoutineAtmosphereFooterStrip({
  variant,
  isDark = false,
  density = 'default',
}: Props) {
  const sources = footerStripForVariant(variant);
  const opacity = isDark ? 0.42 : 0.88;
  const rich = density === 'rich';
  const tileSize = rich ? 120 : 96;

  return (
    <View
      style={[styles.root, rich && styles.rootRich]}
      pointerEvents="none"
      accessibilityElementsHidden>
      {sources.map((source, index) => (
        <Image
          key={`footer-${variant}-${index}`}
          source={source}
          style={[
            styles.tile,
            {
              width: tileSize,
              height: tileSize,
              opacity,
              zIndex: index + 1,
              marginLeft: index === 0 ? 0 : rich ? -36 : -28,
              transform: [{ rotate: `${(index % 2 === 0 ? -1 : 1) * (4 + index)}deg` }],
            },
          ]}
          contentFit="contain"
          cachePolicy="memory-disk"
          recyclingKey={`atmosphere-footer-${variant}-${index}`}
          transition={0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 8,
    minHeight: 108,
  },
  rootRich: {
    paddingTop: 28,
    paddingBottom: 16,
    minHeight: 148,
  },
  tile: {
    width: 96,
    height: 96,
  },
});
