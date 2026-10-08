import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';

export const COMPLETION_TOGGLE_ANIM_MS = 280;
/** soft 모션 기준 — 토글 후 후속 UI 동기화용 */
export const COMPLETION_TOGGLE_SOFT_ANIM_MS = 420;

/** 완료 채움 — API 호환 (아이콘만 표시하므로 면색은 미사용) */
export const COMPLETION_CHECKED_COLOR_LIGHT = RetroFlatColors.light.bgMint;
export const COMPLETION_CHECKED_COLOR_DARK = RetroFlatColors.dark.bgMint;

/** 어두운 채움 위 폴백 체크색 */
export const COMPLETION_CHECK_ICON_COLOR = RetroFlatColors.light.bgMint;

/** 활성 붓터치 체크 잉크 */
export const COMPLETION_CHECK_INK = '#0A1628';

/** 붓터치 느낌의 완료 체크 */
export function BrushCheckMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M4.6 12.4c1.1 1.05 2.55 2.55 4.35 4.7 2.05-3.55 5.35-7.85 10.1-11.55-.55-.35-1.05-.55-1.35-.45-3.95 3.05-6.85 6.85-8.55 9.85-1.25-1.35-2.35-2.35-3.55-3.15-.55.35-1 .7-1 .6z"
        fill={color}
      />
    </Svg>
  );
}

const CIRCLE_OUTER_SIZE = 30;
const SQUARE_OUTER_SIZE = 20;
const HIT_SIZE = 44;
const CHECK_ICON_SIZE = 18;
const SQUARE_CHECK_ICON_SIZE = 14;

const EASE_OUT = Easing.out(Easing.cubic);
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

/** 완료 채움 위 체크 아이콘 색 — API 호환 유지 */
export function completionCheckIconColor(fill: string): string {
  const raw = fill.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = hex[1]!;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? COMPLETION_CHECK_INK : COMPLETION_CHECK_ICON_COLOR;
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(raw);
  if (rgb) {
    const luminance =
      (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
    return luminance > 0.55 ? COMPLETION_CHECK_INK : COMPLETION_CHECK_ICON_COLOR;
  }
  const u = fill.toUpperCase();
  if (u === '#FAFAFA' || u === '#FFFFFF' || u === '#A8DADC') return COMPLETION_CHECK_INK;
  return COMPLETION_CHECK_ICON_COLOR;
}

type Props = {
  checked: boolean;
  isDark: boolean;
  /** circle: 목록 행 · square: 시간대별 타임라인 (히트 영역 크기만 영향) */
  shape?: 'circle' | 'square';
  /** 히트/아이콘 기준 한 변(px) */
  size?: number;
  checkedColor?: string;
  uncheckedColor?: string;
  outline?: 'border' | 'shadow';
  shadowColor?: string;
  uncheckedFill?: string;
  motion?: keyof typeof MOTION;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * 완료 토글 — 원형/사각 면 없이 붓터치 체크만.
 * 미완료: 흐린 체크 · 완료: 진한 체크.
 */
export function CompletionRadioButton({
  checked,
  isDark,
  shape = 'circle',
  size,
  checkedColor: _checkedColor,
  uncheckedColor: _uncheckedColor,
  outline: _outline,
  shadowColor: _shadowColor,
  uncheckedFill: _uncheckedFill,
  motion = 'default',
  onPress,
  accessibilityLabel,
}: Props) {
  const { t } = useTranslation();
  const timing = MOTION[motion];
  const defaultOuter = shape === 'square' ? SQUARE_OUTER_SIZE : CIRCLE_OUTER_SIZE;
  const outerSize = size ?? defaultOuter;
  const defaultCheck = shape === 'square' ? SQUARE_CHECK_ICON_SIZE : CHECK_ICON_SIZE;
  const checkIconSize =
    size != null ? Math.max(12, Math.round(outerSize * 0.62)) : defaultCheck;
  const hitSize = size != null ? Math.max(outerSize + 12, 36) : HIT_SIZE;
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(checked ? 1 : 0);
  const prevCheckedRef = useRef(checked);

  const activeColor = isDark ? '#FAFAFA' : COMPLETION_CHECK_INK;
  const idleColor = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(10, 22, 40, 0.28)';

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

  const idleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - fillProgress.value,
    transform: [{ scale: 0.94 + (1 - fillProgress.value) * 0.06 }],
  }));

  const activeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fillProgress.value,
    transform: [{ scale: 0.86 + fillProgress.value * 0.14 }],
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
      accessibilityLabel={
        accessibilityLabel ?? (checked ? t('common.completeCancel') : t('common.complete'))
      }
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
      <Reanimated.View
        style={[
          styles.visualWrap,
          { width: outerSize, height: outerSize },
          rootAnimatedStyle,
        ]}>
        <Reanimated.View pointerEvents="none" style={[styles.layer, idleAnimatedStyle]}>
          <BrushCheckMark size={checkIconSize} color={idleColor} />
        </Reanimated.View>
        <Reanimated.View pointerEvents="none" style={[styles.layer, activeAnimatedStyle]}>
          <BrushCheckMark size={Math.round(checkIconSize * 1.08)} color={activeColor} />
        </Reanimated.View>
      </Reanimated.View>
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
  visualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
