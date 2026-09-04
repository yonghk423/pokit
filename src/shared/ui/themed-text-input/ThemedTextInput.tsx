import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from 'react-native';

import {
  isSingleFaceAppFont,
  resolveAppFontFamily,
  scaleTypeSize,
  useAppFontSizeScale,
  useEffectiveAppFontId,
  type AppFontWeight,
} from '@shared/lib/ui-font';

export type ThemedTextInputProps = TextInputProps;

function weightFromStyle(fontWeight: TextStyle['fontWeight']): AppFontWeight {
  if (fontWeight === '800' || fontWeight === '900' || fontWeight === 'bold') return '800';
  if (fontWeight === '700') return '700';
  if (fontWeight === '600' || fontWeight === 'semibold') return '600';
  if (fontWeight === '500' || fontWeight === 'medium') return '500';
  return '400';
}

function applyFontSizeScale(style: TextStyle, scale: number): TextStyle {
  if (scale === 1) return style;
  const next: TextStyle = { ...style };
  if (typeof style.fontSize === 'number') {
    next.fontSize = scaleTypeSize(style.fontSize, scale);
  }
  if (typeof style.lineHeight === 'number') {
    next.lineHeight = scaleTypeSize(style.lineHeight, scale);
  }
  return next;
}

/** ThemedText와 같은 앱 글씨체·크기 배율을 TextInput에 적용 (React 19: ref는 props) */
export function ThemedTextInput({ style, ...rest }: ThemedTextInputProps) {
  const fontId = useEffectiveAppFontId();
  const sizeScale = useAppFontSizeScale();
  const singleFace = isSingleFaceAppFont(fontId);
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const weight = weightFromStyle(flat.fontWeight);
  const fontFamily = resolveAppFontFamily(fontId, weight);

  const scaled = applyFontSizeScale(
    {
      ...flat,
      ...(fontFamily ? { fontFamily } : null),
      ...(singleFace ? { fontWeight: '400' as const } : null),
    },
    sizeScale,
  );

  return <TextInput {...rest} style={scaled} />;
}
