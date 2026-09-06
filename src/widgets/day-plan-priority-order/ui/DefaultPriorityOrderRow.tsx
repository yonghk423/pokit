import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ITEM_PRIORITY_META, priorityRowWash } from '@entities/day-plan';
import type { TodoPriority } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { useTranslation } from '@shared/lib/i18n';
import { COMPLETION_CHECKED_COLOR_DARK, COMPLETION_CHECKED_COLOR_LIGHT, CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { activeIconColorByCategory, categoryAccentColorPastel } from '../lib/activeIconColorByCategory';
import { orderRowStyles as styles } from '../lib/orderRowStyles';
import type { PriorityOrderRowProps } from '../lib/types';

/** 완료 버튼 — 집중 시작 전·후 모두 표시(담기 목록에서 완료 표시 가능) */
const GRAY_DEFAULT_LIGHT = '#9CA3AF';
const BRUTAL_SHADOW_SM = 2;
/** 설정·펼침·완료 액션 얼굴 크기 (통일) */
const ORDER_ACTION_FACE = 26;

const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };
const EXPAND_OPEN_MS = 280;
const EXPAND_CLOSE_MS = 220;
const EXPAND_EASING = Easing.out(Easing.cubic);

/** 우선순위 목록 공통 행 — 카테고리별 파일에서 그대로 쓰거나 감싸서 전문화 */
export function DefaultPriorityOrderRow({
  categoryKey,
  icon,
  label,
  subtitle,
  summaryHint,
  itemPriority = 'medium',
  onCycleItemPriority,
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
  expanded,
  onToggleExpand,
  expandedContent,
  onEditTime,
}: PriorityOrderRowProps) {
  const { t } = useTranslation();
  const priorityLabel = t(`todo.priority.${itemPriority}` as const);
  const reorderTranslateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);
  const expandProgress = useSharedValue(expanded ? 1 : 0);
  const expandContentHeight = useSharedValue(0);
  const [expandMounted, setExpandMounted] = useState(Boolean(expanded));
  const onReorderDragTranslationEndRef = useRef(onReorderDragTranslationEnd);
  const onReorderDragActiveChangeRef = useRef(onReorderDragActiveChange);

  onReorderDragTranslationEndRef.current = onReorderDragTranslationEnd;
  onReorderDragActiveChangeRef.current = onReorderDragActiveChange;

  useEffect(() => {
    if (!onToggleExpand) return;
    if (expanded) {
      setExpandMounted(true);
      if (expandContentHeight.value > 0) {
        expandProgress.value = withTiming(1, {
          duration: EXPAND_OPEN_MS,
          easing: EXPAND_EASING,
        });
      }
      return;
    }
    expandProgress.value = withTiming(
      0,
      { duration: EXPAND_CLOSE_MS, easing: EXPAND_EASING },
      (finished) => {
        if (finished) runOnJS(setExpandMounted)(false);
      },
    );
  }, [expandContentHeight, expandProgress, expanded, onToggleExpand]);

  const expandPanelAnimatedStyle = useAnimatedStyle(() => {
    const h = expandContentHeight.value;
    return {
      opacity: expandProgress.value,
      height: expandProgress.value * h,
      overflow: 'hidden' as const,
      transform: [{ translateY: (1 - expandProgress.value) * -6 }],
    };
  });

  const expandChevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${expandProgress.value * 180}deg` }],
  }));

  const handleExpandContentLayout = useCallback(
    (height: number) => {
      if (height <= 0) return;
      const prev = expandContentHeight.value;
      if (Math.abs(height - prev) <= 0.5) return;
      expandContentHeight.value = height;
      if (expanded && expandProgress.value < 1) {
        expandProgress.value = withTiming(1, {
          duration: EXPAND_OPEN_MS,
          easing: EXPAND_EASING,
        });
      }
    },
    [expandContentHeight, expandProgress, expanded],
  );

  const gestureBridgeRef = useRef({
    start: () => { },
    end: (_translationY: number) => { },
    clear: () => { },
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
  const priorityMeta = ITEM_PRIORITY_META[itemPriority];
  const iconColor = activeIconColorByCategory(categoryKey);

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

  const iconBoxBg = categoryAccentColorPastel(categoryKey);
  const actionBg = isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const actionBorder = isDark ? 'rgba(255,255,255,0.55)' : '#000000';
  const actionShadow = isDark ? '#9ECFD1' : '#181A2E';
  const actionHoverBg = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(168, 218, 220, 0.35)';

  const rankIconTitleBlock = (
    <>
      <View
        style={[
          styles.orderIconBoxShell,
          { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.orderIconBoxShadow,
            {
              backgroundColor: actionShadow,
              borderColor: actionBorder,
              transform: [
                { translateX: BRUTAL_SHADOW_SM },
                { translateY: BRUTAL_SHADOW_SM },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.orderIconBox,
            {
              backgroundColor: iconBoxBg,
              borderColor: actionBorder,
            },
          ]}>
          <Animated.View
            style={[
              shouldPulse ? { opacity: pulse } : undefined,
              isCompleted && { opacity: 0.5 },
            ]}>
            <IconSymbol
              key={`${categoryKey}-${iconColor}-${isCompleted ? 1 : 0}`}
              name={icon as any}
              size={16}
              color={iconColor}
            />
          </Animated.View>
        </View>
      </View>
      <View style={styles.orderRowRomanText}>
        <ThemedText
          style={[styles.orderRowRomanTitle, { color: ink }, isCompleted && styles.orderRowRomanTitleDone]}
          numberOfLines={1}
          lightColor={ink}
          darkColor={ink}>
          {label}
        </ThemedText>
        {summaryHint ? (
          <ThemedText
            style={[
              styles.orderRowSummaryHint,
              { color: inkMuted },
              isCompleted && styles.orderRowRomanTitleDone,
            ]}
            numberOfLines={2}
            lightColor={inkMuted}
            darkColor={inkMuted}>
            {summaryHint}
          </ThemedText>
        ) : null}
        {onEditTime ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              subtitle
                ? t('todo.timeA11y', { time: subtitle })
                : t('dayPlan.timeUnsetA11y')
            }
            hitSlop={6}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEditTime();
            }}
            style={({ pressed }) => [
              styles.subtitleTimeRow,
              pressed && { opacity: 0.65 },
            ]}>
            <IconSymbol
              name="clock"
              size={11}
              color={inkMuted}
              style={styles.subtitleTimeIcon}
            />
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
            ) : (
              <ThemedText
                style={[styles.orderRowTimeUnset, { color: inkMuted }]}
                numberOfLines={1}
                lightColor={inkMuted}
                darkColor={inkMuted}>
                {t('dayPlan.timeUnsetHint')}
              </ThemedText>
            )}
          </Pressable>
        ) : subtitle ? (
          <ThemedText
            style={[
              styles.orderRowRomanSubtitle,
              { color: inkMuted, marginTop: 2 },
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

  const wrapBrutal = (child: ReactElement) => (
    <View
      style={[
        styles.orderBrutalBtnShell,
        { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.orderBrutalBtnShadow,
          {
            backgroundColor: actionShadow,
            borderColor: actionBorder,
            transform: [
              { translateX: BRUTAL_SHADOW_SM },
              { translateY: BRUTAL_SHADOW_SM },
            ],
          },
        ]}
      />
      {child}
    </View>
  );

  const priorityButton = onCycleItemPriority
    ? wrapBrutal(
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.priorityChangeA11y', { label: priorityLabel })}
        hitSlop={8}
        onPress={() => {
          void Haptics.selectionAsync();
          onCycleItemPriority();
        }}
        style={({ pressed }) => [
          styles.orderRowPriorityBtn,
          {
            borderColor: actionBorder,
            backgroundColor: pressed ? actionHoverBg : actionBg,
          },
          pressed && { opacity: 0.92 },
        ]}>
        <ThemedText
          style={[
            styles.orderRowPriorityBtnText,
            { color: priorityMeta.dot },
            isCompleted && styles.orderRowRomanTitleDone,
          ]}
          numberOfLines={1}>
          {priorityLabel}
        </ThemedText>
      </Pressable>,
    )
    : null;

  const finishButton = onFinishForToday
    ? wrapBrutal(
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.endTodayA11y', { label })}
        hitSlop={10}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onFinishForToday();
        }}
        style={({ pressed }) => [
          styles.orderFinishBtn,
          {
            borderColor: actionBorder,
            backgroundColor: pressed ? actionHoverBg : actionBg,
          },
          pressed && { opacity: 0.92 },
        ]}>
        <ThemedText
          style={[styles.orderFinishBtnText, { color: isDark ? '#FAFAFA' : primary }]}
          numberOfLines={1}>
          {t('dayPlan.endTodayConfirm')}
        </ThemedText>
      </Pressable>,
    )
    : null;

  const expandEnabled = Boolean(onToggleExpand);
  const notePriorityAction = expandEnabled && onCycleItemPriority
    ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.priorityChangeA11y', { label: priorityLabel })}
        hitSlop={8}
        onPress={() => {
          void Haptics.selectionAsync();
          onCycleItemPriority();
        }}
        style={({ pressed }) => [styles.expandNoteAction, pressed && { opacity: 0.55 }]}>
        <ThemedText
          style={[
            styles.expandNoteActionText,
            { color: priorityMeta.dot },
          ]}
          numberOfLines={1}>
          {t('dayPlan.priorityNoteLabel', { label: priorityLabel })}
        </ThemedText>
      </Pressable>
    )
    : null;

  const noteFinishAction = expandEnabled && onFinishForToday
    ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.endTodayA11y', { label })}
        hitSlop={8}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onFinishForToday();
        }}
        style={({ pressed }) => [styles.expandNoteAction, pressed && { opacity: 0.55 }]}>
        <ThemedText
          style={[styles.expandNoteActionText, { color: inkMuted }]}
          numberOfLines={1}>
          {t('dayPlan.endTodayConfirm')}
        </ThemedText>
      </Pressable>
    )
    : null;

  const expandInlineActions = Boolean(notePriorityAction || noteFinishAction);
  const rowWash = priorityRowWash(itemPriority, isDark);
  const expandButton = expandEnabled
    ? wrapBrutal(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('dayPlan.collapseA11y', { label }) : t('dayPlan.expandA11y', { label })}
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleExpand?.();
          }}
          style={[
            styles.expandChevronBtn,
            {
              borderColor: actionBorder,
              backgroundColor: actionBg,
            },
          ]}>
          <Reanimated.View style={expandChevronAnimatedStyle}>
            <IconSymbol
              name="chevron.down"
              size={10}
              color={isDark ? '#FAFAFA' : primary}
            />
          </Reanimated.View>
        </Pressable>,
      )
    : null;

  const actionsColumn = (
    <View style={styles.orderRowActions}>
      {!expandInlineActions ? priorityButton : null}
      {!expandInlineActions ? finishButton : null}
      {onSettings
        ? wrapBrutal(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dayPlan.detailSettingsA11y', { label })}
            hitSlop={10}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSettings();
            }}
            style={({ pressed }) => [
              styles.orderSettingsBtn,
              {
                borderColor: actionBorder,
                backgroundColor: pressed ? actionHoverBg : actionBg,
              },
              pressed && { opacity: 0.92 },
            ]}>
            <IconSymbol name="slider.horizontal.3" size={11} color={isDark ? '#FAFAFA' : primary} />
          </Pressable>,
        )
        : isFocusStarted && onFocusDetail
          ? wrapBrutal(
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dayPlan.focusDetailA11y', { label })}
              hitSlop={10}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFocusDetail();
              }}
              style={({ pressed }) => [
                styles.orderSettingsBtn,
                {
                  borderColor: actionBorder,
                  backgroundColor: pressed ? actionHoverBg : actionBg,
                },
                pressed && { opacity: 0.92 },
              ]}>
              <IconSymbol name="slider.horizontal.3" size={11} color={isDark ? '#FAFAFA' : primary} />
            </Pressable>,
          )
          : null}
      {expandButton}
      {onToggleFocusComplete ? (
        <View style={{ marginBottom: BRUTAL_SHADOW_SM }}>
          <CompletionRadioButton
            checked={Boolean(isCompleted)}
            isDark={isDark}
            size={ORDER_ACTION_FACE}
            checkedColor={isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT}
            uncheckedColor={isDark ? 'rgba(255,255,255,0.42)' : GRAY_DEFAULT_LIGHT}
            accessibilityLabel={isCompleted ? t('dayPlan.completeCancelA11y', { label }) : t('dayPlan.completeA11y', { label })}
            onPress={onToggleFocusComplete}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.orderRowRoman,
        { borderBottomColor: line, backgroundColor: rowWash },
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
              accessibilityLabel={t('dayPlan.reorderA11y', { label })}>
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
      {expandEnabled && expandMounted && (expandedContent || expandInlineActions) ? (
        <Reanimated.View style={[styles.expandPanel, expandPanelAnimatedStyle]}>
          <View
            style={styles.expandPanelMeasure}
            onLayout={(e) => {
              handleExpandContentLayout(e.nativeEvent.layout.height);
            }}>
            {expandedContent}
            {expandInlineActions ? (
              <View style={styles.expandActionsRow}>
                {notePriorityAction}
                {noteFinishAction}
              </View>
            ) : null}
          </View>
        </Reanimated.View>
      ) : null}
    </Animated.View>
  );
}
