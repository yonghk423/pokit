import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { type PropsWithChildren, type ReactNode, useCallback, useContext, useState } from 'react';
import { type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

/** 탭 콘텐츠는 하단 인셋 위에서 끝난다. 그 여백이 흰 네비게이터로 비치지 않게 크림을 깐다. */
const TAB_CHROME_LIGHT = '#F7F6F4';
const TAB_CHROME_DARK = '#262B28';

type Props = PropsWithChildren<{ chromeColor?: string; background?: ReactNode }>;

/** Keep native tab chrome out of editor bounds without changing keyboard avoidance. */
export function NativeTabContent({ children, chromeColor, background }: Props) {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  if (Platform.OS !== 'ios') return <>{children}</>;
  // JS tabs already reserve their bar (including the home-indicator inset) outside
  // the scene. A native SafeAreaView here would inset and remeasure it a second time.
  if (tabBarHeight !== undefined) return <JsTabContent chromeColor={chromeColor} background={background}>{children}</JsTabContent>;
  return <IosTabContent chromeColor={chromeColor} background={background}>{children}</IosTabContent>;
}

function JsTabContent({ children, chromeColor, background }: Props) {
  const isDark = useColorScheme() === 'dark';
  const chrome = chromeColor ?? (isDark ? TAB_CHROME_DARK : TAB_CHROME_LIGHT);
  return <View style={[styles.fill, { backgroundColor: chrome }]}>{background}{children}</View>;
}

function IosTabContent({ children, chromeColor, background }: Props) {
  const insets = useSafeAreaInsets();
  const schemeChrome = useColorScheme() === 'dark' ? TAB_CHROME_DARK : TAB_CHROME_LIGHT;
  const chrome = chromeColor ?? schemeChrome;
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
      <View style={[styles.fill, { backgroundColor: chrome }]}>{background}
        <SafeAreaView
          edges={{ bottom: true }}
          style={[styles.fill, { backgroundColor: background ? 'transparent' : chrome }]}
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
