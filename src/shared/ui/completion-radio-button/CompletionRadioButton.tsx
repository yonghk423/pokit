import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';

export const COMPLETION_TOGGLE_ANIM_MS = 280;
/** soft 모션 기준 — 토글 후 후속 UI 동기화용 */
export const COMPLETION_TOGGLE_SOFT_ANIM_MS = 420;

/** 완료 채움 — 검정 원/사각 */
export const COMPLETION_CHECKED_COLOR_LIGHT = '#09090b';
/** 다크 모드도 동일하게 검정 채움 + 민트 체크 */
export const COMPLETION_CHECKED_COLOR_DARK = '#09090b';

/** 완료 체크 아이콘 — Soft Mint */
export const COMPLETION_CHECK_ICON_COLOR = RetroFlatColors.light.bgMint;

const CIRCLE_OUTER_SIZE = 30;
const SQUARE_OUTER_SIZE = 20;
const HIT_SIZE = 44;
const BORDER_WIDTH = 2.5;
const CHECK_ICON_SIZE = 18;
const SQUARE_CHECK_ICON_SIZE = 14;

const EASE_OUT = Easing.out(Easing.cubic);
/** 스르륵 — ease-out expo 느낌 */
const EASE_SOFT = Easing.bezier(0.22, 1, 0.36, 1);

const MOTION = {
  default: {
    fillInMs: 220,
    fillOutMs: 160,
    pressInMs: 90,
    pressOutMs: 140,
    easing: EASE_OUT,
  },
  soft: {
    fillInMs: 420,
    fillOutMs: 340,
    pressInMs: 140,
    pressOutMs: 200,
    easing: EASE_SOFT,
  },
} as const;

/** 완료 채움 위 체크 아이콘 색 — 어두운 채움이면 민트, 밝은 채움이면 검정 */
export function completionCheckIconColor(fill: string): string {
  const raw = fill.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = hex[1]!;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#09090b' : COMPLETION_CHECK_ICON_COLOR;
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(raw);
  if (rgb) {
    const luminance =
      (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
    return luminance > 0.55 ? '#09090b' : COMPLETION_CHECK_ICON_COLOR;
  }
  const u = fill.toUpperCase();
  if (u === '#FAFAFA' || u === '#FFFFFF' || u === '#A8DADC') return '#09090b';
  return COMPLETION_CHECK_ICON_COLOR;
}

type Props = {
  checked: boolean;
  isDark: boolean;
  /** circle: 목록 행 · square: 시간대별 타임라인 */
  shape?: 'circle' | 'square';
  /** 원/사각 외곽 한 변(px). 미지정 시 shape 기본값 */
  size?: number;
  checkedColor?: string;
  uncheckedColor?: string;
  /** border: 윤곽선(기본) · shadow: 테두리 없이 솔리드 음영만 */
  outline?: 'border' | 'shadow';
  /** outline=shadow 일 때 음영 색 */
  shadowColor?: string;
  /** outline=shadow 일 때 미완료 면색 */
  uncheckedFill?: string;
  /** default: 짧게 · soft: 스르륵 길게 */
  motion?: keyof typeof MOTION;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const SOLID_SHADOW_SM = 2;

export function CompletionRadioButton({
  checked,
  isDark,
  shape = 'circle',
  size,
  checkedColor = isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT,
  uncheckedColor,
  outline = 'border',
  shadowColor = '#000000',
  uncheckedFill,
  motion = 'default',
  onPress,
  accessibilityLabel,
}: Props) {
  const { t } = useTranslation();
  const timing = MOTION[motion];
  const defaultOuter = shape === 'square' ? SQUARE_OUTER_SIZE : CIRCLE_OUTER_SIZE;
  const outerSize = size ?? defaultOuter;
  const cornerRadius = shape === 'square' ? 0 : outerSize / 2;
  const defaultCheck = shape === 'square' ? SQUARE_CHECK_ICON_SIZE : CHECK_ICON_SIZE;
  const checkIconSize =
    size != null ? Math.max(10, Math.round(outerSize * 0.58)) : defaultCheck;
  const useSolidShadow = outline === 'shadow';
  const borderWidth = useSolidShadow ? 0 : outerSize <= 26 ? 2 : BORDER_WIDTH;
  const hitSize = size != null ? Math.max(outerSize + 12, 36) : HIT_SIZE;
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(checked ? 1 : 0);
  const prevCheckedRef = useRef(checked);

  const checkIconColor = completionCheckIconColor(checkedColor);
  const borderIdle =
    uncheckedColor ??
    (isDark ? 'rgba(255,255,255,0.42)' : '#9CA3AF');
  const idleFill = useSolidShadow
    ? (uncheckedFill ?? (isDark ? 'rgba(255,255,255,0.14)' : '#FFFFFF'))
    : 'transparent';
  useEffect(() => {
    const wasChecked = prevCheckedRef.current;
    prevCheckedRef.current = checked;

    if (checked && !wasChecked) {
      fillProgress.value = withTiming(1, {
        duration: timing.fillInMs,
        easing: timing.easing,
      });
      return;
    }

    if (!checked && wasChecked) {
      fillProgress.value = withTiming(0, {
        duration: timing.fillOutMs,
        easing: timing.easing,
      });
      return;
    }

    fillProgress.value = checked ? 1 : 0;
  }, [checked, fillProgress, timing.easing, timing.fillInMs, timing.fillOutMs]);

  const rootAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const outlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - fillProgress.value,
    transform: [{ scale: 0.92 + (1 - fillProgress.value) * 0.08 }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fillProgress.value,
    transform: [{ scale: 0.72 + fillProgress.value * 0.28 }],
  }));

  const handlePress = () => {
    if (!checked) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.selectionAsync();
    }
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? (checked ? t('common.completeCancel') : t('common.complete'))}
      hitSlop={6}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withTiming(0.94, {
          duration: timing.pressInMs,
          easing: timing.easing,
        });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, {
          duration: timing.pressOutMs,
          easing: timing.easing,
        });
      }}
      style={[styles.hit, { width: hitSize, height: hitSize }]}>
      <View
        style={[
          styles.shell,
          useSolidShadow
            ? { marginRight: SOLID_SHADOW_SM, marginBottom: SOLID_SHADOW_SM }
            : null,
        ]}>
        {useSolidShadow ? (
          <View
            pointerEvents="none"
            style={[
              styles.solidShadow,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: cornerRadius,
                backgroundColor: shadowColor,
                transform: [
                  { translateX: SOLID_SHADOW_SM },
                  { translateY: SOLID_SHADOW_SM },
                ],
              },
            ]}
          />
        ) : null}
        <Reanimated.View
          style={[
            styles.visualWrap,
            { width: outerSize, height: outerSize, zIndex: 1 },
            rootAnimatedStyle,
          ]}>
          <Reanimated.View
            pointerEvents="none"
            style={[
              styles.layer,
              styles.uncheckedOutline,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: cornerRadius,
                borderColor: borderIdle,
                borderWidth,
                backgroundColor: idleFill,
              },
              outlineAnimatedStyle,
            ]}
          />
          <Reanimated.View
            pointerEvents="none"
            style={[
              styles.layer,
              styles.checkedFill,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: cornerRadius,
                backgroundColor: checkedColor,
              },
              fillAnimatedStyle,
            ]}>
            <MaterialIcons name="check" size={checkIconSize} color={checkIconColor} />
          </Reanimated.View>
        </Reanimated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    position: 'relative',
    overflow: 'visible',
  },
  solidShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  visualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  uncheckedOutline: {
    backgroundColor: 'transparent',
  },
  checkedFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});