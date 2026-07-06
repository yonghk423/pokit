import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { PrimaryColor } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { activeIconColorByCategory } from '../lib/activeIconColorByCategory';
import { orderRowStyles as styles } from '../lib/orderRowStyles';
import type { PriorityOrderRowProps } from '../lib/types';

/** 완료 라디오 — 집중 시작 전·후 모두 표시(담기 목록에서 완료 표시 가능) */
const COMPLETE_RADIO_SIZE = 20;
const GRAY_DEFAULT_LIGHT = '#9CA3AF';
const GRAY_PRESSED_LIGHT = '#D1D5DB';
const GRAY_DONE_LIGHT = '#B8BCC4';
const GRAY_DEFAULT_DARK = 'rgba(255,255,255,0.42)';
const GRAY_PRESSED_DARK = 'rgba(255,255,255,0.58)';
const GRAY_DONE_DARK = 'rgba(255,255,255,0.28)';

const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };

/** 우선순위 목록 공통 행 — 카테고리별 파일에서 그대로 쓰거나 감싸서 전문화 */
export function DefaultPriorityOrderRow({
  categoryKey,
  icon,
  label,
  subtitle,
  isFocusStarted,
  isCompleted,
  isDark,
  ink,
  inkMuted,
  line,
  onToggleFocusComplete,
  onReorderDragTranslationEnd,
  onReorderDragActiveChange,
  onSettings,
  onFocusDetail,
  onFinishForToday,
  animateOnMount,
}: PriorityOrderRowProps) {
  const reorderTranslateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);
  const onReorderDragTranslationEndRef = useRef(onReorderDragTranslationEnd);
  const onReorderDragActiveChangeRef = useRef(onReorderDragActiveChange);

  onReorderDragTranslationEndRef.current = onReorderDragTranslationEnd;
  onReorderDragActiveChangeRef.current = onReorderDragActiveChange;

  const gestureBridgeRef = useRef({
    start: () => {},
    end: (_translationY: number) => {},
    clear: () => {},
  });

  gestureBridgeRef.current = {
    start: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onReorderDragActiveChangeRef.current?.(true);
    },
    end: (translationY: number) => {
      onReorderDragTranslationEndRef.current?.(translationY);
    },
    clear: () => {
      onReorderDragActiveChangeRef.current?.(false);
    },
  };

  const bridgeReorderStart = useCallback(() => {
    gestureBridgeRef.current.start();
  }, []);

  const bridgeReorderEnd = useCallback((translationY: number) => {
    gestureBridgeRef.current.end(translationY);
  }, []);

  const bridgeReorderClear = useCallback(() => {
    gestureBridgeRef.current.clear();
  }, []);

  const reorderEnabled = Boolean(onReorderDragTranslationEnd);

  const reorderPanGesture = useMemo(() => {
    if (!reorderEnabled) return null;
    return Gesture.Pan()
      .activateAfterLongPress(REORDER_LONG_PRESS_MS)
      .maxPointers(1)
      .activeOffsetY([-4, 4])
      .onStart(() => {
        reorderDragging.value = 1;
        runOnJS(bridgeReorderStart)();
      })
      .onUpdate((e) => {
        reorderTranslateY.value = e.translationY;
      })
      .onEnd((e) => {
        runOnJS(bridgeReorderEnd)(e.translationY);
      })
      .onFinalize(() => {
        reorderTranslateY.value = withSpring(0, REORDER_SPRING);
        reorderDragging.value = 0;
        runOnJS(bridgeReorderClear)();
      });
  }, [bridgeReorderClear, bridgeReorderEnd, bridgeReorderStart, reorderDragging, reorderEnabled, reorderTranslateY]);

  const reorderMainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reorderTranslateY.value }, { scale: reorderDragging.value ? 1.015 : 1 }],
    zIndex: reorderDragging.value ? 220 : 0,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: reorderDragging.value ? 2 : 0,
    borderColor: '#000000',
  }));

  const enter = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shouldPulse = Boolean(isFocusStarted && !isCompleted);
  const primary = PrimaryColor.rgb;
  /** 시작 전에는 아이콘 강조를 쓰지 않는다. 집중 시작 이후에만 카테고리 액센트. */
  const showAccentIcon = Boolean(!isCompleted && isFocusStarted);
  const iconColor = isCompleted
    ? inkMuted
    : showAccentIcon
      ? activeIconColorByCategory(categoryKey)
      : ink;

  useEffect(() => {
    if (!animateOnMount) {
      enter.setValue(1);
      return;
    }
    Animated.spring(enter, {
      toValue: 1,
      damping: 16,
      stiffness: 180,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [animateOnMount, enter]);

  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldPulse, pulse]);

  const rankIconTitleBlock = (
    <>
      <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
        <IconSymbol
          key={`${categoryKey}-${iconColor}-${isCompleted ? 1 : 0}`}
          name={icon as any}
          size={17}
          color={iconColor}
        />
      </Animated.View>
      <View style={styles.orderRowRomanText}>
        <ThemedText
          style={[styles.orderRowRomanTitle, { color: ink }, isCompleted && styles.orderRowRomanTitleDone]}
          numberOfLines={1}
          lightColor={ink}
          darkColor={ink}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            style={[
              styles.orderRowRomanSubtitle,
              { color: inkMuted },
              isCompleted && styles.orderRowRomanTitleDone,
            ]}
            numberOfLines={1}
            lightColor={inkMuted}
            darkColor={inkMuted}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </>
  );

  const actionsColumn = (
    <View style={styles.orderRowActions}>
      {onFinishForToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 오늘 일정에서 완전 종료`}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onFinishForToday();
          }}
          style={[
            styles.orderFinishBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
          ]}>
          <ThemedText
            style={[styles.orderFinishBtnText, { color: isDark ? '#FAFAFA' : primary }]}
            numberOfLines={1}>
            종료
          </ThemedText>
        </Pressable>
      ) : null}
      {onSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 상세 설정`}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSettings();
          }}
          style={[
            styles.orderSettingsBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
          ]}>
          <IconSymbol name="slider.horizontal.3" size={14} color={isDark ? '#FAFAFA' : primary} />
        </Pressable>
      ) : isFocusStarted && onFocusDetail ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 몰입 화면 자세히 보기`}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFocusDetail();
          }}
          style={[
            styles.orderSettingsBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
          ]}>
          <IconSymbol name="slider.horizontal.3" size={14} color={isDark ? '#FAFAFA' : primary} />
        </Pressable>
      ) : null}
      {onToggleFocusComplete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCompleted ? `${label} 완료 취소` : `${label} 완료`}
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            onToggleFocusComplete();
          }}
          style={styles.orderCompleteMaterialHit}>
          {({ pressed }) => (
            <MaterialIcons
              name={isCompleted ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={COMPLETE_RADIO_SIZE}
              color={
                isCompleted
                  ? isDark
                    ? GRAY_DONE_DARK
                    : GRAY_DONE_LIGHT
                  : pressed
                    ? isDark
                      ? GRAY_PRESSED_DARK
                      : GRAY_PRESSED_LIGHT
                    : isDark
                      ? GRAY_DEFAULT_DARK
                      : GRAY_DEFAULT_LIGHT
              }
            />
          )}
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.orderRowRoman,
        { borderBottomColor: line },
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1] }) },
          ],
        },
      ]}>
      {reorderPanGesture ? (
        <Reanimated.View style={[styles.orderRowDragShell, reorderMainAnimatedStyle]}>
          <GestureDetector gesture={reorderPanGesture}>
            <View
              style={styles.orderRowReorderMain}
              accessibilityRole="adjustable"
              accessibilityLabel={`${label}, 길게 눌러 순서를 바꿀 수 있어요`}>
              {rankIconTitleBlock}
            </View>
          </GestureDetector>
          {actionsColumn}
        </Reanimated.View>
      ) : (
        <View style={styles.orderRowDragShell}>
          <View style={styles.orderRowReorderMain}>{rankIconTitleBlock}</View>
          {actionsColumn}
        </View>
      )}
    </Animated.View>
  );
}
