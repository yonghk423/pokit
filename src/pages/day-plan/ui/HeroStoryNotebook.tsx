import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import { scaleTypeSize, useAppFontSizeScale } from '@shared/lib/ui-font';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { useTranslation } from '@shared/lib/i18n';

export function HeroStoryNotebook({ title, text, ink, autoFocus, onTitleChange, onTextChange, onFocus, onBlur }: {
  title: string; text: string; ink: string; autoFocus: boolean;
  onTitleChange: (value: string) => void; onTextChange: (value: string) => void; onFocus: () => void; onBlur: () => void;
}) {
  const { t } = useTranslation();
  const appScale = useAppFontSizeScale();
  const { fontScale } = useWindowDimensions();
  const bodyRef = useRef<TextInput>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  useEffect(() => {
    if (!autoFocus || !layoutReady) return;
    // Let the new workspace commit its bounds before the keyboard resizes it.
    // One focus owner also avoids native autoFocus racing this scheduled focus.
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => bodyRef.current?.focus());
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [autoFocus, layoutReady]);
  const [height, setHeight] = useState(260);
  const [scrollY, setScrollY] = useState(0);
  const lineHeight = Math.ceil(scaleTypeSize(32, appScale) * fontScale);
  const fontSize = Math.round(scaleTypeSize(17, appScale) * fontScale);
  const titleSize = Math.round(scaleTypeSize(22, appScale) * fontScale);
  return <View testID="hero-inline-notebook" style={s.root} onLayout={event => {
    if (event.nativeEvent.layout.width > 0 && event.nativeEvent.layout.height > 0) setLayoutReady(true);
  }}>
    <ThemedTextInput testID="hero-inline-title" accessibilityLabel={t('comicDay.sceneTitle')} placeholder="Title" placeholderTextColor="#7D8176"
      value={title} onChangeText={onTitleChange} onFocus={onFocus} onBlur={onBlur} maxLength={80} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => bodyRef.current?.focus()}
      allowFontScaling={false} typographyScale={1} selectionColor={ink} style={[s.title, { color: ink, fontSize: titleSize, lineHeight: Math.ceil(titleSize * 1.55) }]} />
    <View testID="hero-inline-notebook-lines" style={s.body} onLayout={event => setHeight(event.nativeEvent.layout.height)}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View style={{ transform: [{ translateY: -(scrollY % lineHeight) }] }}>
          {Array.from({ length: Math.ceil(height / lineHeight) + 2 }, (_, index) => <View key={index} style={{ height: lineHeight, borderBottomWidth: 0.5, borderBottomColor: '#AFB1A7', opacity: 0.75 }} />)}
        </View>
      </View>
      <ThemedTextInput ref={bodyRef} testID="hero-inline-story" accessibilityLabel={t('comicDay.memo')} placeholder={t('comicDay.emptyDayPrompt')} placeholderTextColor="#7D8176" caretHidden={false} selectionColor={ink}
        value={text} onChangeText={onTextChange} onFocus={onFocus} onBlur={onBlur} maxLength={4000} multiline scrollEnabled textAlignVertical="top"
        allowFontScaling={false} typographyScale={1} onScroll={event => setScrollY(Math.max(0, event.nativeEvent.contentOffset.y))}
        style={[StyleSheet.absoluteFill, s.input, { color: ink, fontSize, lineHeight }]} />
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { flexGrow: 1, minHeight: 260 },
  title: { minHeight: 60, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 0.6, borderBottomColor: '#8A8C7E', flexShrink: 0 },
  body: { flex: 1, minHeight: 160, overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  input: { padding: 0, includeFontPadding: false },
});
