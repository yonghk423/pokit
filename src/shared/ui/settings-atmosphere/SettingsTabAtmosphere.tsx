import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { settingsAtmosphereAssets } from './settingsAtmosphereAssets';

type Props = {
  isDark?: boolean;
};

/**
 * 설정 화면 전체 배경 — splash5.png.
 * absoluteFill — 레이아웃 높이에 영향 없음.
 */
export function SettingsTabAtmosphere({ isDark = false }: Props) {
  return (
    <View pointerEvents="none" style={styles.root} accessibilityElementsHidden>
      <Image
        source={settingsAtmosphereAssets.desk}
        style={[styles.bg, { opacity: isDark ? 0.5 : 1 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey="settings-atmosphere-desk"
        transition={0}
        priority="high"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
