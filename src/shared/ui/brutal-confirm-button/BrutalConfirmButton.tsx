import { PenFrame } from '@shared/ui/pen-frame';
import {
  Pressable,
  StyleSheet,
  View,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  RETRO_RADIUS,
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
  /** 면 색. 기본은 투명 */
  fill?: string;
  /** 글자색. 기본은 잉크색 */
  labelColor?: string;
  /** 윤곽선 */
  border?: string;
  /** 그림자 색. 기본은 그림자 없음 */
  shadowColor?: string;
  /** solid shadow 오프셋. 생략 시 compact는 1, 그 외는 SOLID_SHADOW_OFFSET */
  shadowOffset?: number;
  disabled?: boolean;
  /** 스크롤 영역에서도 탭이 쉽게 취소되지 않도록 유지할 거리 */
  pressRetentionOffset?: Insets | number;
  /** end: 시간 피커용 우측 정렬 / stretch: 시트·모달 풀폭 */
  align?: 'end' | 'stretch';
  /** stretch 일 때 바깥 여백 등 */
  style?: StyleProp<ViewStyle>;
  /** 모달 푸터 등 — 높이·패딩을 조금 줄임 */
  compact?: boolean;
};

export function resolveBrutalConfirmPrimaryColors(isDark: boolean) {
  const ink = isDark ? '#F5F5F0' : '#171717';
  return {
    fill: 'transparent',
    labelColor: ink,
    border: ink,
    shadowColor: 'transparent',
    disabledFill: 'transparent',
    disabledLabelColor: isDark ? 'rgba(245,245,240,0.4)' : 'rgba(0,0,0,0.4)',
  };
}

/** Transparent paper CTA with a single fountain-pen outline. */

export function BrutalConfirmButton({
  onPress,
  label,
  accessibilityLabel,
  fill,
  labelColor,
  border,
  shadowColor,
  shadowOffset: shadowOffsetProp,
  disabled = false,
  pressRetentionOffset,
  align = 'end',
  style,
  compact = false,
}: BrutalConfirmButtonProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const primary = resolveBrutalConfirmPrimaryColors(isDark);
  const resolvedFill = fill ?? (disabled ? primary.disabledFill : primary.fill);
  const resolvedLabelColor =
    labelColor ?? (disabled ? primary.disabledLabelColor : primary.labelColor);
  const resolvedShadow = shadowColor ?? primary.shadowColor;
  const resolvedLabel = label ?? t('common.confirm');
  const stretch = align === 'stretch';
  const showShadow = Boolean(resolvedShadow) && resolvedShadow !== 'transparent';
  /** compact도 액션 버튼과 동일 offset 1 */
  const shadowOffset = shadowOffsetProp ?? (compact ? 1 : SOLID_SHADOW_OFFSET);

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
        pressRetentionOffset={pressRetentionOffset}
        style={[
          styles.face,
          stretch && styles.faceStretch,
          compact && styles.faceCompact,
          {
            backgroundColor: resolvedFill,
          },
        ]}>
        <PenFrame color={border ?? primary.border} />
        <ThemedText
          lightColor={resolvedLabelColor}
          darkColor={resolvedLabelColor}
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
    ...StyleSheet.absoluteFill,
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
