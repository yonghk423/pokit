import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import {
  useEffectiveAppFontId,
  resolveAppFontFamily,
  isSingleFaceAppFont,
  useAppFontSizeScale,
  scaleTypeSize,
  type AppFontWeight,
} from '@shared/lib/ui-font';
import { useThemeColor } from '@shared/lib/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'label';
};

function weightFromStyle(fontWeight: TextStyle['fontWeight'] | undefined): AppFontWeight | undefined {
  if (fontWeight == null) return undefined;
  if (fontWeight === '800' || fontWeight === '900' || fontWeight === 'bold') return '800';
  if (fontWeight === '700') return '700';
  if (fontWeight === '600' || fontWeight === 'semibold') return '600';
  if (fontWeight === '500' || fontWeight === 'medium') return '500';
  return '400';
}

function typeWeight(
  type: NonNullable<ThemedTextProps['type']>,
): AppFontWeight {
  if (type === 'title') return '800';
  if (type === 'subtitle') return '700';
  if (type === 'defaultSemiBold' || type === 'label') return '600';
  if (type === 'link') return '500';
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

  const userFlat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const weight = weightFromStyle(userFlat.fontWeight) ?? typeWeight(type);
  const fontFamily = resolveAppFontFamily(fontId, weight);
  const { fontWeight: _ignoredWeight, fontFamily: _ignoredFamily, ...restUser } = userFlat;

  // iOS는 fontFamily+fontWeight 조합이 맞지 않으면 시스템 폰트로 폴백한다.
  // 앱 페이스를 마지막에 두고, 단일 페이스는 weight를 Regular로 고정한다.
  const resolved = StyleSheet.flatten([
    { color },
    type === 'default' ? styles.default : undefined,
    type === 'title' ? styles.title : undefined,
    type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
    type === 'subtitle' ? styles.subtitle : undefined,
    type === 'link' ? styles.link : undefined,
    type === 'label' ? styles.label : undefined,
    restUser,
    fontFamily ? { fontFamily } : null,
    singleFace || !fontFamily ? { fontWeight: '400' as const } : { fontWeight: weight },
  ]) as TextStyle;

  return <Text style={applyFontSizeScale(resolved, sizeScale)} {...rest} />;
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
