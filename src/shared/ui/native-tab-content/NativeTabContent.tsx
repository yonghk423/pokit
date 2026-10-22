import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

/** 탭 콘텐츠는 하단 인셋 위에서 끝난다. 그 여백이 흰 네비게이터로 비치지 않게 크림을 깐다. */
const TAB_CHROME_LIGHT = '#F5F0E6';
const TAB_CHROME_DARK = '#262B28';

/** Keep native tab chrome out of editor bounds without changing keyboard avoidance. */
export function NativeTabContent({ children }: PropsWithChildren) {
  if (Platform.OS !== 'ios') return <>{children}</>;
  return <IosTabContent>{children}</IosTabContent>;
}

function IosTabContent({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const chrome = useColorScheme() === 'dark' ? TAB_CHROME_DARK : TAB_CHROME_LIGHT;
  const [outerHeight, setOuterHeight] = useState(0);
  const [innerHeight, setInnerHeight] = useState(0);
  const measureOuter = useCallback((event: LayoutChangeEvent) => {
    setOuterHeight(event.nativeEvent.layout.height);
  }, []);
  const measureInner = useCallback((event: LayoutChangeEvent) => {
    setInnerHeight(event.nativeEvent.layout.height);
  }, []);
  const measuredInset = Math.max(0, outerHeight - innerHeight);
  const tabBarHeight = outerHeight > 0 && innerHeight > 0
    ? measuredInset
    : Math.max(insets.bottom, 49);

  return (
    <BottomTabBarHeightContext.Provider value={tabBarHeight}>
      <View style={[styles.fill, { backgroundColor: chrome }]}>
        <SafeAreaView
          edges={{ bottom: true }}
          style={[styles.fill, { backgroundColor: chrome }]}
          onLayout={measureOuter}>
          <View style={styles.fill} onLayout={measureInner}>{children}</View>
        </SafeAreaView>
      </View>
    </BottomTabBarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
});
