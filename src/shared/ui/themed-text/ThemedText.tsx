import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import {
  useEffectiveAppFontId,
  resolveAppFontFamily,
  isSingleFaceAppFont,
  useAppFontSizeScale,
  scaleTypeSize,
} from '@shared/lib/ui-font';
import { useThemeColor } from '@shared/lib/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'label';
};

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

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const fontId = useEffectiveAppFontId();
  const sizeScale = useAppFontSizeScale();
  const singleFace = isSingleFaceAppFont(fontId);

  const weightFamily =
    type === 'title'
      ? resolveAppFontFamily(fontId, '800')
      : type === 'subtitle'
        ? resolveAppFontFamily(fontId, '700')
        : type === 'defaultSemiBold' || type === 'label'
          ? resolveAppFontFamily(fontId, '600')
          : type === 'link'
            ? resolveAppFontFamily(fontId, '500')
            : resolveAppFontFamily(fontId, '400');

  const flat = StyleSheet.flatten([
    weightFamily ? { fontFamily: weightFamily } : null,
    { color },
    type === 'default' ? styles.default : undefined,
    type === 'title' ? styles.title : undefined,
    type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
    type === 'subtitle' ? styles.subtitle : undefined,
    type === 'link' ? styles.link : undefined,
    type === 'label' ? styles.label : undefined,
    // 단일 페이스 한글 폰트는 가짜 bold 합성 대신 Regular 유지
    singleFace ? { fontWeight: '400' as const } : null,
    style,
  ]) as TextStyle;

  return <Text style={applyFontSizeScale(flat, sizeScale)} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.64,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontWeight: '500',
    color: '#436086',
  },
});
