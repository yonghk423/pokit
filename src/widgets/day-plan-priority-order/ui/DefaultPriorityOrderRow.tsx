import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { PrimaryColor } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { activeIconColorByCategory } from '../lib/activeIconColorByCategory';
import { orderRowStyles as styles } from '../lib/orderRowStyles';
import type { PriorityOrderRowProps } from '../lib/types';

/** 집중 중 완료 라디오 — 작은 원·중성 그레이 */
const COMPLETE_RADIO_SIZE = 20;
const GRAY_DEFAULT_LIGHT = '#9CA3AF';
const GRAY_PRESSED_LIGHT = '#D1D5DB';
const GRAY_DONE_LIGHT = '#B8BCC4';
const GRAY_DEFAULT_DARK = 'rgba(255,255,255,0.42)';
const GRAY_PRESSED_DARK = 'rgba(255,255,255,0.58)';
const GRAY_DONE_DARK = 'rgba(255,255,255,0.28)';

/** 우선순위 목록 공통 행 — 카테고리별 파일에서 그대로 쓰거나 감싸서 전문화 */
export function DefaultPriorityOrderRow({
  categoryKey,
  icon,
  label,
  subtitle,
  priorityLabel,
  isTopPriority,
  isFocusStarted,
  isCompleted,
  isDark,
  ink,
  inkMuted,
  line,
  onToggleFocusComplete,
  onSettings,
  onFocusDetail,
  animateOnMount,
}: PriorityOrderRowProps) {
  const enter = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shouldPulse = Boolean(isFocusStarted && !isCompleted);
  const primary = PrimaryColor.rgb;
  /** 맨 위(지금 할 차례)이거나 집중 중이면 카테고리 액센트 — 기존엔 isTopPriority를 무시해 선택 직후에도 ink만 쓰임 */
  const showAccentIcon = Boolean(!isCompleted && (isFocusStarted || isTopPriority));
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
      {priorityLabel ? (
        <View style={[styles.inlineRankPill, { backgroundColor: 'transparent' }]}>
          <ThemedText style={[styles.inlineRankPillText, { color: '#111111' }]}>{priorityLabel}</ThemedText>
        </View>
      ) : null}
      {shouldPulse && categoryKey === 'medicine' ? (
        <Animated.View style={[styles.medicineIconBadge, { opacity: pulse }]}>
          <IconSymbol name="cross.fill" size={10} color="#ef4444" />
        </Animated.View>
      ) : (
        <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
          <IconSymbol
            key={`${categoryKey}-${iconColor}-${isCompleted ? 1 : 0}`}
            name={icon as any}
            size={17}
            color={iconColor}
          />
        </Animated.View>
      )}
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
      <View style={styles.orderRowActions}>
        {isFocusStarted && onFocusDetail ? (
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
        ) : onSettings ? (
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
        ) : null}
        {isFocusStarted && onToggleFocusComplete ? (
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
    </Animated.View>
  );
}
