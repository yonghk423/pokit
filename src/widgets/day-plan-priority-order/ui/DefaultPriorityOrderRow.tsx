import { PaperControl } from '@shared/ui/paper-control';
import { PaperGrain } from '@shared/ui/paper-grain';
import { deskPaperChoices, deskInkChoices } from '@shared/ui/stationery-desk/choices';
import { FountainPenColorPalette } from '@shared/ui/fountain-pen-color-palette';
import { PostItColorPalette } from '@shared/ui/post-it-color-palette';
import { PigmentGrain } from '@shared/ui/pigment-grain';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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

import {
  resolveCategoryCatalogIcon,
  resolveCategoryCatalogIconTile,
  useDayPlanChromeSettingsStore,
  useGoalDetailSettingsStore,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import {
  resolvePostItFaceColor,
  resolvePostItInkHex,
  resolvePostItInkMuted,
} from '@shared/lib/storage';
import { resolveBrutalConfirmPrimaryColors } from '@shared/ui/brutal-confirm-button';
import {
  RowColorPaletteBridgeProvider,
  RowColorPaletteFallbackHost,
  type RowColorPaletteTab,
} from '@shared/ui/color-palette-tabs';
import { COMPLETION_CHECKED_COLOR_DARK, COMPLETION_CHECKED_COLOR_LIGHT, CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { RoutineActionIcon } from '@shared/ui/routine-action-icon';
import { ThemedText } from '@shared/ui/themed-text';

import { orderRowStyles as styles } from '../lib/orderRowStyles';
import type { PriorityOrderRowProps } from '../lib/types';


const PEN_STRIKE_MS = 720;
const PEN_STRIKE_EASE = Easing.bezier(0.16, 0.72, 0.2, 1);

/** 완료 글줄 — 왼쪽에서 펜으로 긋듯 이어진다 */
function PenStruckBlock({
  struck,
  strikeColor,
  children,
}: {
  struck: boolean;
  strikeColor: string;
  children: ReactElement;
}) {
  const draw = useSharedValue(struck ? 1 : 0);
  const fade = useSharedValue(struck ? 0.55 : 1);

  useEffect(() => {
    const duration = struck ? PEN_STRIKE_MS : 320;
    draw.value = withTiming(struck ? 1 : 0, { duration, easing: PEN_STRIKE_EASE });
    fade.value = withTiming(struck ? 0.55 : 1, { duration, easing: PEN_STRIKE_EASE });
  }, [draw, fade, struck]);

  const textStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: draw.value * 0.38,
    transform: [{ scaleX: draw.value }],
  }));

  return (
    <View style={styles.penStrikeHost}>
      <Reanimated.View style={textStyle}>{children}</Reanimated.View>
      <Reanimated.View
        pointerEvents="none"
        style={[styles.penStrikeLine, { backgroundColor: strikeColor }, lineStyle]}
      />
    </View>
  );
}

/** 완료 버튼 — 집중 시작 전·후 모두 표시(담기 목록에서 완료 표시 가능) */
/** 설정·펼침 액션 아이콘 — 솔리드 음영과 맞춘 순수 검정 */
const ACTION_ICON_LIGHT = '#000000';
const ACTION_ICON_DARK = '#FAFAFA';
const BRUTAL_SHADOW_SM = 2;
/** 설정·펼침·완료 액션 얼굴 크기 (통일) */
const ORDER_ACTION_FACE = 26;

const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };
const EXPAND_OPEN_MS = 280;
const EXPAND_CLOSE_MS = 220;
const EXPAND_EASING = Easing.out(Easing.cubic);

/** 우선순위 목록 공통 행 — 카테고리별 파일에서 그대로 쓰거나 감싸서 전문화 */
function DefaultPriorityOrderRowInner({
  categoryKey,
  icon: _iconProp,
  label,
  subtitle,
  summaryHint,
  itemFaceColor = null,
  onSelectItemFaceColor,
  itemInkColor = null,
  onSelectItemInkColor,
  isFocusStarted,
  isCompleted,
  isDark,
  ink,
  inkMuted,
  line: _line,
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
  const categoryLabelEpoch = useGoalDetailSettingsStore((s) => s.revision);
  void categoryLabelEpoch;
  const icon = resolveCategoryCatalogIcon(categoryKey);
  const completeInAccordion = useDayPlanChromeSettingsStore((s) => s.settings.completeInAccordion);
  const rowFaceBg = itemFaceColor ? resolvePostItFaceColor(itemFaceColor, isDark) : undefined;
  const customInk = Boolean(itemInkColor || itemFaceColor);
  const rowInk = customInk
    ? resolvePostItInkHex(itemInkColor ?? 'auto', itemFaceColor, isDark)
    : ink;
  const rowInkMuted = customInk ? resolvePostItInkMuted(rowInk) : inkMuted;
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
  }));

  const enter = useRef(new Animated.Value(animateOnMount ? 0 : 1)).current;
  const { boxBg: iconBoxBg, iconColor } = resolveCategoryCatalogIconTile(categoryKey, isDark);

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

  const actionBg = isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const actionBorder = isDark ? 'rgba(255,255,255,0.55)' : '#000000';
  const completeCta = resolveBrutalConfirmPrimaryColors(isDark);
  /** 설정·펼침·카테고리 아이콘 오프셋 — 순검정보다 옅은 잉크 */
  const actionShadow = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)';

  const rankIconTitleBlock = (
    <>
      <View
          style={styles.orderIconBoxShell}>
          <View
            style={[
              styles.orderIconBox,
              {
                backgroundColor: iconBoxBg,
                borderWidth: 0,
                borderColor: actionBorder,
              },
            ]}>
            {iconBoxBg && iconBoxBg !== 'transparent' ? <PigmentGrain /> : null}
            <Animated.View style={isCompleted ? { opacity: 0.5 } : undefined}>
              <IconSymbol
                key={`${categoryKey}-${icon}-${iconColor}-${isCompleted ? 1 : 0}`}
                name={icon as any}
                size={32}
                color={iconColor}
              />
            </Animated.View>
          </View>
        </View>
      <View style={styles.orderRowRomanText}>
        <View style={styles.orderRowTitleMark}>
          <PenStruckBlock struck={Boolean(isCompleted)} strikeColor={rowInk}>
            <ThemedText
              style={[styles.orderRowRomanTitle, styles.orderRowTitleText, { color: rowInk }]}
              numberOfLines={1}
              lightColor={rowInk}
              darkColor={rowInk}>
              {label}
            </ThemedText>
          </PenStruckBlock>
        </View>
        {summaryHint ? (
          <ThemedText
            style={[styles.orderRowSummaryHint, { color: rowInk }]}
            numberOfLines={2}
            lightColor={rowInk}
            darkColor={rowInk}>
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
              color={rowInkMuted}
              style={styles.subtitleTimeIcon}
            />
            {subtitle ? (
              <ThemedText
                style={[styles.orderRowRomanSubtitle, { color: rowInkMuted }]}
                numberOfLines={1}
                lightColor={rowInkMuted}
                darkColor={rowInkMuted}>
                {subtitle}
              </ThemedText>
            ) : (
              <ThemedText
                style={[styles.orderRowTimeUnset, { color: rowInkMuted }]}
                numberOfLines={1}
                lightColor={rowInkMuted}
                darkColor={rowInkMuted}>
                {t('dayPlan.timeUnsetHint')}
              </ThemedText>
            )}
          </Pressable>
        ) : subtitle ? (
          <ThemedText
            style={[styles.orderRowRomanSubtitle, { color: rowInkMuted, marginTop: 2 }]}
            numberOfLines={1}
            lightColor={rowInkMuted}
            darkColor={rowInkMuted}>
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

  const renderFacePalette = (compact: boolean, hideLabel = false) => {
    if (!onSelectItemFaceColor) return null;
    return (
      <View
        style={[styles.importanceMarkBlock, compact && styles.importanceMarkBlockCompact]}
        accessibilityRole="toolbar"
        accessibilityLabel={t('dayPlan.routineFaceColorLabel')}>
        {hideLabel ? null : (
          <ThemedText
            style={[styles.expandNoteActionText, { color: rowInkMuted }]}
            numberOfLines={1}>
            {t('dayPlan.routineFaceColorLabel')}
          </ThemedText>
        )}
        <PostItColorPalette value={itemFaceColor} onChange={onSelectItemFaceColor} isDark={isDark} />
      </View>
    );
  };

  const renderInkPalette = (compact: boolean, hideLabel = false) => {
    if (!onSelectItemInkColor) return null;
    return (
      <View
        style={[styles.importanceMarkBlock, compact && styles.importanceMarkBlockCompact]}
        accessibilityRole="toolbar"
        accessibilityLabel={t('dayPlan.routineInkColorLabel')}>
        {hideLabel ? null : (
          <ThemedText
            style={[styles.expandNoteActionText, { color: rowInkMuted }]}
            numberOfLines={1}>
            {t('dayPlan.routineInkColorLabel')}
          </ThemedText>
        )}
        <FountainPenColorPalette value={itemInkColor} onChange={onSelectItemInkColor} isDark={isDark} />
      </View>
    );
  };

  const priorityButton =
    onSelectItemFaceColor || onSelectItemInkColor
      ? wrapBrutal(
          <View
            style={[
              styles.orderRowPriorityBtn,
              {
                borderColor: actionBorder,
                backgroundColor: actionBg,
              },
            ]}>
            {renderFacePalette(true)}
            {renderInkPalette(true)}
          </View>,
        )
      : null;

  const finishButton = onFinishForToday
    ? (
      <PaperControl
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
            backgroundColor: actionBg,
          },
        ]}>
        <ThemedText
          style={[styles.orderFinishBtnText, { color: isDark ? '#FAFAFA' : '#000000' }]}
          numberOfLines={1}>
          {t('dayPlan.endTodayConfirm')}
        </ThemedText>
      </PaperControl>
    )
    : null;

  const expandEnabled = Boolean(onToggleExpand);

  const handleToggleExpand = useCallback(() => {
    if (!onToggleExpand) return;
    void Haptics.selectionAsync();
    onToggleExpand();
  }, [onToggleExpand]);

  const mainContent = expandEnabled ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: Boolean(expanded) }}
      accessibilityLabel={
        expanded ? t('dayPlan.collapseA11y', { label }) : t('dayPlan.expandA11y', { label })
      }
      onPress={handleToggleExpand}
      style={styles.orderRowReorderMain}>
      {rankIconTitleBlock}
    </Pressable>
  ) : (
    <View
      style={styles.orderRowReorderMain}
      accessibilityRole={reorderPanGesture ? 'adjustable' : undefined}
      accessibilityLabel={reorderPanGesture ? t('dayPlan.reorderA11y', { label }) : undefined}>
      {rankIconTitleBlock}
    </View>
  );

  const noteFaceAction =
    Boolean(expandEnabled && onSelectItemFaceColor);
  const noteInkAction =
    Boolean(expandEnabled && onSelectItemInkColor);

  const colorTabs = useMemo((): RowColorPaletteTab[] => {
    const tabs: RowColorPaletteTab[] = [];
    if (noteFaceAction) {
      tabs.push({
        id: 'face',
        label: t('dayPlan.colorTab.face'),
        choices: deskPaperChoices(itemFaceColor, onSelectItemFaceColor!, isDark),
        reset: () => onSelectItemFaceColor?.(null),
        swatch: rowFaceBg ?? undefined,
      });
    }
    if (noteInkAction) {
      tabs.push({
        id: 'ink',
        label: t('dayPlan.colorTab.ink'),
        choices: deskInkChoices(itemInkColor, onSelectItemInkColor!),
        reset: () => onSelectItemInkColor?.(null),
        swatch: rowInk ?? undefined,
      });
    }
    return tabs;
  }, [noteFaceAction, noteInkAction, rowFaceBg, rowInk, itemFaceColor, itemInkColor, onSelectItemFaceColor, onSelectItemInkColor, isDark, t]);

  const noteFinishAction = expandEnabled && onFinishForToday
    ? (
      <PaperControl
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.endTodayA11y', { label })}
        hitSlop={8}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onFinishForToday();
        }}
        style={[
          styles.orderFinishBtn,
          styles.expandFinishBtn,
          {
            borderColor: actionBorder,
            backgroundColor: actionBg,
          },
        ]}>
        <ThemedText
          style={[
            styles.orderFinishBtnText,
            styles.expandFinishBtnText,
            { color: isDark ? '#FAFAFA' : '#000000' },
          ]}
          numberOfLines={1}>
          {t('dayPlan.endTodayConfirm')}
        </ThemedText>
      </PaperControl>
    )
    : null;

  /** 레이아웃「완료를 펼침에 두기」— 민트 면으로 종료(흰 면)와 구분 */
  const noteCompleteAction =
    expandEnabled && completeInAccordion && onToggleFocusComplete
      ? wrapBrutal(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isCompleted
                ? t('dayPlan.completeCancelA11y', { label })
                : t('dayPlan.completeA11y', { label })
            }
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleFocusComplete();
            }}
            style={[
              styles.orderFinishBtn,
              styles.expandFinishBtn,
              {
                borderColor: completeCta.border,
                backgroundColor: completeCta.fill,
              },
            ]}>
            <ThemedText
              style={[
                styles.orderFinishBtnText,
                styles.expandFinishBtnText,
                { color: completeCta.labelColor },
              ]}
              numberOfLines={1}>
              {isCompleted ? t('common.completeCancel') : t('common.complete')}
            </ThemedText>
          </Pressable>,
        )
      : null;

  const expandInlineActions = Boolean(
    noteFaceAction ||
      noteInkAction ||
      noteFinishAction ||
      noteCompleteAction,
  );
  const colorSectionActions = Boolean(noteFaceAction || noteInkAction);
  const expandButton = expandEnabled
    ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('dayPlan.collapseA11y', { label }) : t('dayPlan.expandA11y', { label })}
          accessibilityState={{ expanded: Boolean(expanded) }}
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleExpand?.();
          }}
          style={styles.expandChevronBtn}>
          <Reanimated.View style={expandChevronAnimatedStyle}>
            <RoutineActionIcon
              name="expand"
              size={19}
              color={isDark ? ACTION_ICON_DARK : ACTION_ICON_LIGHT}
            />
          </Reanimated.View>
        </Pressable>
      )
    : null;

  const actionsColumn = (
    <View style={styles.orderRowActions}>
      {!expandInlineActions ? priorityButton : null}
      {!expandInlineActions ? finishButton : null}
      {onSettings
        ? (
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
              pressed && { opacity: 0.88 },
            ]}>
            <RoutineActionIcon name="adjust" size={24} color={isDark ? ACTION_ICON_DARK : ACTION_ICON_LIGHT} />
          </Pressable>
        )
        : isFocusStarted && onFocusDetail
          ? (
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
                pressed && { opacity: 0.88 },
              ]}>
              <RoutineActionIcon name="adjust" size={24} color={isDark ? ACTION_ICON_DARK : ACTION_ICON_LIGHT} />
            </Pressable>
          )
          : null}
      {expandButton}
      {onToggleFocusComplete && !completeInAccordion ? (
        <View style={{ marginBottom: BRUTAL_SHADOW_SM }}>
          <CompletionRadioButton
            checked={Boolean(isCompleted)}
            isDark={isDark}
            size={ORDER_ACTION_FACE}
            appearance="ink"
            motion="gentle"
            checkedColor={isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT}
            uncheckedColor={isDark ? '#FAFAFA' : '#202020'}
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
        rowFaceBg ? { backgroundColor: rowFaceBg } : null,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1] }) },
          ],
        },
      ]}>
      {rowFaceBg ? <PaperGrain /> : null}
      {reorderPanGesture ? (
        <Reanimated.View style={[styles.orderRowDragShell, reorderMainAnimatedStyle]}>
          <GestureDetector gesture={reorderPanGesture}>{mainContent}</GestureDetector>
          {actionsColumn}
        </Reanimated.View>
      ) : (
        <View style={styles.orderRowDragShell}>
          {mainContent}
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
            <RowColorPaletteBridgeProvider
              tabs={colorTabs}
              ink={rowInk}
              muted={rowInkMuted}
              isDark={isDark}>
              {expandedContent}
              {expandInlineActions ? (
                <View style={styles.expandActionsCol}>
                  {colorSectionActions ? <RowColorPaletteFallbackHost /> : null}
                  {noteCompleteAction || noteFinishAction ? (
                    <View style={styles.expandActionsRow}>
                      {noteCompleteAction}
                      {noteFinishAction}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </RowColorPaletteBridgeProvider>
          </View>
        </Reanimated.View>
      ) : null}
    </Animated.View>
  );
}

export const DefaultPriorityOrderRow = memo(DefaultPriorityOrderRowInner);
