import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';

/** Keep native tab chrome out of editor bounds without changing keyboard avoidance. */
export function NativeTabContent({ children }: PropsWithChildren) {
  if (Platform.OS !== 'ios') return <>{children}</>;
  return <IosTabContent>{children}</IosTabContent>;
}

function IosTabContent({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
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
      <SafeAreaView
        edges={{ bottom: true }}
        style={styles.fill}
        onLayout={measureOuter}>
        <View style={styles.fill} onLayout={measureInner}>{children}</View>
      </SafeAreaView>
    </BottomTabBarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
});
