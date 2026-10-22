import { useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { scaleTypeSize, useAppFontSizeScale } from '@shared/lib/ui-font';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

/** Keep a four-line viewport; move paper rules with the native text scroll offset. */
export function ComicMemoField({ value, ink, onChangeText }: { value: string; ink: string; onChangeText: (text: string) => void }) {
  const { t } = useTranslation();
  const appScale = useAppFontSizeScale();
  const { fontScale } = useWindowDimensions();
  const lineHeight = Math.ceil(scaleTypeSize(36, appScale) * fontScale);
  const fontSize = Math.round(scaleTypeSize(17, appScale) * fontScale);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY] = useState(() => new Animated.Value(0));
  const rows = Math.max(4, Math.ceil(contentHeight / lineHeight));
  const height = 4 * lineHeight;
  return <View style={{ height, overflow: 'hidden' }}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: Animated.multiply(scrollY, -1) }] }]}>
      {Array.from({ length: rows }, (_, index) => <View testID="comic-memo-rule" key={index} style={{ height: lineHeight, borderBottomWidth: 0.5, borderColor: '#B6B6B0' }} />)}
    </Animated.View>
    <ThemedTextInput multiline scrollEnabled allowFontScaling={false} typographyScale={1}
      accessibilityLabel={t('comicDay.memo')} value={value} onChangeText={onChangeText}
      placeholder={t('comicDay.memoHint')} placeholderTextColor="#888"
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      onContentSizeChange={event => setContentHeight(Math.ceil(event.nativeEvent.contentSize.height))}
      style={{ color: ink, fontSize, lineHeight, height, padding: 0, paddingTop: 0, paddingBottom: 0, margin: 0, includeFontPadding: false, textAlignVertical: 'top' }} />
  </View>;
}
