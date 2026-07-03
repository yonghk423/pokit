import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@shared/config/theme';
import { useThemeColor } from '@shared/lib/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'label';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        styles.base,
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'label' ? styles.label : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Fonts.sans,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.sansSemiBold,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.sansExtraBold,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.64,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: Fonts.sansBold,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: Fonts.sansMedium,
    color: '#436086',
  },
});
