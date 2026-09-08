import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  RETRO_RADIUS,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

export type BrutalConfirmButtonProps = {
  onPress: () => void;
  /** 기본: 확인 */
  label?: string;
  accessibilityLabel?: string;
  /** 면 색. 생략 시 시티팝 민트 primary */
  fill?: string;
  /** 글자색. 생략 시 민트 위 틸 잉크 */
  labelColor?: string;
  /** 윤곽선 */
  border?: string;
  /** 있으면 solid shadow. 생략 시 검정(라이트) / 민트(다크) */
  shadowColor?: string;
  disabled?: boolean;
  /** end: 시간 피커용 우측 정렬 / stretch: 시트·모달 풀폭 */
  align?: 'end' | 'stretch';
  /** stretch 일 때 바깥 여백 등 */
  style?: StyleProp<ViewStyle>;
  /** 모달 푸터 등 — 높이·패딩을 조금 줄임 */
  compact?: boolean;
};

export function resolveBrutalConfirmPrimaryColors(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    /** 항상 밝은 민트 면 (다크 모드도 primaryContainer 대신 primary) */
    fill: isDark ? c.primary : c.primaryContainer,
    labelColor: isDark ? c.primaryOn : c.primary,
    border: c.border,
    shadowColor: isDark ? c.solidShadow : c.border,
    /**
     * 비활성도 민트 계열 불투명 색.
     * opacity로 흐리면 solid shadow가 비쳐 검게 보임.
     */
    disabledFill: isDark ? '#6FA8AA' : '#C5E8E9',
    disabledLabelColor: isDark ? 'rgba(0,32,33,0.55)' : '#5A8587',
  };
}

/**
 * Flat Brutalism Lite 확인 CTA — 민트 면 · 외곽선 없음 · 4px solid shadow.
 */
export function BrutalConfirmButton({
  onPress,
  label,
  accessibilityLabel,
  fill,
  labelColor,
  border: _border,
  shadowColor,
  disabled = false,
  align = 'end',
  style,
  compact = false,
}: BrutalConfirmButtonProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const primary = resolveBrutalConfirmPrimaryColors(isDark);
  // fill을 넘기면 활성/비활성 모두 그 민트를 쓰고, 비활성은 별도 연한 민트로 대체하지 않음
  // (요청: 이름 미입력·disabled여도 항상 민트)
  const resolvedFill = fill ?? (disabled ? primary.disabledFill : primary.fill);
  const resolvedLabelColor =
    labelColor ?? (disabled ? primary.disabledLabelColor : primary.labelColor);
  const resolvedShadow = shadowColor ?? primary.shadowColor;
  const resolvedLabel = label ?? t('common.confirm');
  const stretch = align === 'stretch';
  const showShadow = Boolean(resolvedShadow);
  const shadowOffset = compact ? 2 : SOLID_SHADOW_OFFSET;

  return (
    <View
      style={[
        stretch ? styles.shellStretch : styles.shellEnd,
        showShadow && { marginRight: shadowOffset, marginBottom: shadowOffset },
        style,
      ]}>
      {showShadow ? (
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              backgroundColor: resolvedShadow,
              transform: [{ translateX: shadowOffset }, { translateY: shadowOffset }],
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
        style={[
          styles.face,
          stretch && styles.faceStretch,
          compact && styles.faceCompact,
          {
            backgroundColor: resolvedFill,
          },
        ]}>
        <ThemedText
          style={[
            styles.label,
            stretch && styles.labelStretch,
            compact && styles.labelCompact,
            { color: resolvedLabelColor },
          ]}>
          {resolvedLabel}
        </ThemedText>
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
    borderRadius: RETRO_RADIUS,
  },
  face: {
    minWidth: 76,
    height: 40,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: RETRO_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  faceStretch: {
    alignSelf: 'stretch',
    minWidth: undefined,
    height: 48,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  faceCompact: {
    height: 40,
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  labelStretch: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.25,
  },
  labelCompact: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
  },
});
