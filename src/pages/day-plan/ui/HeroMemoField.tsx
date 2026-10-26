import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { scaleTypeSize, useAppFontSizeScale } from '@shared/lib/ui-font';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

const VISIBLE_LINES = 5;

/** Repeat rules across the viewport regardless of memo length or native content-size events. */
export function ComicMemoField({ value, ink, onChangeText }: { value: string; ink: string; onChangeText: (text: string) => void }) {
  const { t } = useTranslation();
  const appScale = useAppFontSizeScale();
  const { fontScale } = useWindowDimensions();
  const lineHeight = Math.ceil(scaleTypeSize(36, appScale) * fontScale);
  const fontSize = Math.round(scaleTypeSize(17, appScale) * fontScale);
  const [scrollY, setScrollY] = useState(0);
  const height = VISIBLE_LINES * lineHeight;
  const ruleOffset = scrollY % lineHeight;
  return <View style={{ height, overflow: 'hidden' }}>
    <View testID="comic-memo-rules" pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: -ruleOffset }] }]}>
      {Array.from({ length: VISIBLE_LINES + 1 }, (_, index) => <View testID="comic-memo-rule" key={index} style={{ height: lineHeight, borderBottomWidth: 0.5, borderColor: '#B6B6B0' }} />)}
    </View>
    <ThemedTextInput multiline scrollEnabled allowFontScaling={false} typographyScale={1}
      accessibilityLabel={t('comicDay.memo')} value={value} onChangeText={onChangeText}
      placeholder={t('comicDay.memoHint')} placeholderTextColor="#888"
      onScroll={event => setScrollY(Math.max(0, event.nativeEvent.contentOffset.y))}
      style={{ color: ink, fontSize, lineHeight, height, padding: 0, paddingTop: 0, paddingBottom: 0, margin: 0, includeFontPadding: false, textAlignVertical: 'top' }} />
  </View>;
}
