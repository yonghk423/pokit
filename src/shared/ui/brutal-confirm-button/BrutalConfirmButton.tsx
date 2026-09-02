import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RETRO_BORDER_WIDTH, RETRO_RADIUS } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

const SHADOW_SM = 2;

export type BrutalConfirmButtonProps = {
  onPress: () => void;
  /** 기본: 확인 */
  label?: string;
  accessibilityLabel?: string;
  /** 면 색 (잉크·primary) */
  fill: string;
  /** 글자색 */
  labelColor: string;
  /** 윤곽선 */
  border: string;
  /** 있으면 2px solid shadow */
  shadowColor?: string;
  disabled?: boolean;
  /** end: 시간 피커용 우측 정렬 / stretch: 시트·모달 풀폭 */
  align?: 'end' | 'stretch';
  /** stretch 일 때 바깥 여백 등 */
  style?: StyleProp<ViewStyle>;
};

/**
 * Flat Brutalism Lite 확인 CTA — 2px 보더 · 0 radius · 단색 채움 · 선택적 solid shadow.
 */
export function BrutalConfirmButton({
  onPress,
  label,
  accessibilityLabel,
  fill,
  labelColor,
  border,
  shadowColor,
  disabled = false,
  align = 'end',
  style,
}: BrutalConfirmButtonProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('common.confirm');
  const stretch = align === 'stretch';
  const showShadow = Boolean(shadowColor) && !disabled;

  return (
    <View
      style={[
        stretch ? styles.shellStretch : styles.shellEnd,
        showShadow && { marginRight: SHADOW_SM, marginBottom: SHADOW_SM },
        style,
      ]}>
      {showShadow ? (
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              backgroundColor: shadowColor,
              borderColor: border,
              transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
            },
          ]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? resolvedLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.face,
          stretch && styles.faceStretch,
          {
            backgroundColor: fill,
            borderColor: border,
            opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          },
        ]}>
        <ThemedText style={[styles.label, { color: labelColor }]}>{resolvedLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shellEnd: {
    alignSelf: 'flex-end',
    position: 'relative',
  },
  shellStretch: {
    alignSelf: 'stretch',
    position: 'relative',
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: RETRO_RADIUS,
  },
  face: {
    minWidth: 76,
    minHeight: 40,
    paddingHorizontal: 16,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: RETRO_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  faceStretch: {
    alignSelf: 'stretch',
    minWidth: undefined,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
