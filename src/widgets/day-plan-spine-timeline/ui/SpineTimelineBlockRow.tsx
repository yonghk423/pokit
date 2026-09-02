import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { blockDurationSec, getBlockTimelineIcon, resolveBlockCategoryKey, resolveCategoryCatalogAccentColor, resolveDayPlanBlockDisplayTitle, type SpineTimelineRow } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { formatDurationMinutes, formatMinuteOfDay, useTranslation } from '@shared/lib/i18n';
import { toPastelColor } from '@shared/lib/ui/toPastelColor';
import { CompletionRadioButton, COMPLETION_CHECKED_COLOR_DARK, COMPLETION_CHECKED_COLOR_LIGHT } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { SpineTimelinePalette } from './SpineTimelineView';

const SWIPE_DELETE_WIDTH = 88;
const SWIPE_DELETE_TRIGGER = 72;
const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };

function formatRailMinutes(minutes: number): string {
  const m = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

function SettingsButton({
  label,
  isDark,
  onPress,
}: {
  label: string;
  isDark: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const primary = isDark ? '#FAFAFA' : PrimaryColor.rgb;
  const border = isDark ? 'rgba(255,255,255,0.55)' : '#000000';
  const bg = isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const shadow = isDark ? '#9ECFD1' : '#181A2E';

  return (
    <View style={[styles.settingsBtnShell, { marginRight: 2, marginBottom: 2 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.settingsBtnShadow,
          {
            backgroundColor: shadow,
            borderColor: border,
            transform: [{ translateX: 2 }, { translateY: 2 }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.detailSettingsA11y', { label })}
        hitSlop={10}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.settingsBtn,
          {
            borderColor: border,
            backgroundColor: pressed
              ? isDark
                ? 'rgba(255,255,255,0.16)'
                : 'rgba(168, 218, 220, 0.35)'
              : bg,
          },
          pressed && { opacity: 0.92 },
        ]}>
        <IconSymbol name="slider.horizontal.3" size={13} color={primary} />
      </Pressable>
    </View>
  );
}

function CompleteRadio({
  checked,
  isDark,
  onPress,
}: {
  checked: boolean;
  isDark: boolean;
  onPress?: () => void;
}) {
  return (
    <CompletionRadioButton
      checked={checked}
      isDark={isDark}
      checkedColor={isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT}
      onPress={onPress}
    />
  );
}

function SpineNode({
  block,
  palette,
  isDark,
  completed,
  isCurrent,
  accentColor,
}: {
  block: Extract<SpineTimelineRow, { kind: 'block' }>['block'];
  palette: SpineTimelinePalette;
  isDark: boolean;
  completed: boolean;
  isCurrent: boolean;
  accentColor: string;
}) {
  const categoryKey = resolveBlockCategoryKey(block) ?? 'other';
  const iconName = getBlockTimelineIcon(block);
  const shouldPulse = isCurrent && !completed;
  const pulse = useRef(new Animated.Value(1)).current;
  const iconColor = resolveCategoryCatalogAccentColor(categoryKey);
  const iconBoxBg = toPastelColor(iconColor);

  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
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
  }, [pulse, shouldPulse]);

  return (
    <View
      style={[
        styles.nodeCircle,
        {
          backgroundColor: iconBoxBg,
          borderColor: shouldPulse ? accentColor : isDark ? palette.line : '#000000',
          borderWidth: 2,
        },
      ]}>
      <Animated.View
        style={[
          shouldPulse ? { opacity: pulse } : undefined,
          completed && { opacity: 0.5 },
        ]}>
        <IconSymbol name={iconName as any} size={15} color={iconColor} />
      </Animated.View>
    </View>
  );
}

type Props = {
  row: Extract<SpineTimelineRow, { kind: 'block' }>;
  blockIndex: number;
  palette: SpineTimelinePalette;
  isDark: boolean;
  rowSurface: string;
  completed: boolean;
  isCurrent: boolean;
  accentColor: string;
  reorderEnabled: boolean;
  onToggleComplete?: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  onOpenSettings?: () => void;
  onRowMeasured: (height: number) => void;
  onReorderDragActiveChange?: (active: boolean) => void;
  onCommitReorder?: (fromIndex: number, translationY: number) => void;
};

export function SpineTimelineBlockRow({
  row,
  blockIndex,
  palette,
  isDark,
  rowSurface,
  completed,
  isCurrent,
  accentColor,
  reorderEnabled,
  onToggleComplete,
  onPress,
  onDelete,
  onOpenSettings,
  onRowMeasured,
  onReorderDragActiveChange,
  onCommitReorder,
}: Props) {
  const { t, locale } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);
  const endsNextDay = row.block.endsNextCalendarDay === true;
  // 실제 저장값 기준 길이 — 익일 종료 블록은 자정을 넘긴 총 시간을 반영
  const durationMin = Math.max(0, Math.round(blockDurationSec(row.block) / 60));
  // 라벨은 저장된 종료(익일이면 익일 시각)를 그대로 보여준다. 타임라인 위치용 캡(24:00) 값이 아님
  const railEndMinutes = endsNextDay ? row.block.endMinutes : row.endMinutes;
  const startClockLabel = formatMinuteOfDay(row.startMinutes, locale);
  const endClockLabel = endsNextDay
    ? t('spineTimeline.nextDayClock', {
        clock: formatMinuteOfDay(row.block.endMinutes, locale).replace(/^[^\s]+\s/, ''),
      })
    : formatMinuteOfDay(row.endMinutes, locale).replace(/^[^\s]+\s/, '');
  const displayTitle = resolveDayPlanBlockDisplayTitle(row.block);

  const triggerDelete = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.();
  }, [onDelete]);

  const triggerReorderStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReorderDragActiveChange?.(true);
  }, [onReorderDragActiveChange]);

  const triggerReorderEnd = useCallback(
    (translationY: number) => {
      onCommitReorder?.(blockIndex, translationY);
    },
    [blockIndex, onCommitReorder],
  );

  const clearReorderDragActive = useCallback(() => {
    onReorderDragActiveChange?.(false);
  }, [onReorderDragActiveChange]);

  const blockGesture = useMemo(() => {
    const swipePan = Gesture.Pan()
      .activeOffsetX(10)
      .failOffsetY([-14, 14])
      .maxPointers(1)
      .onUpdate((e) => {
        if (e.translationX > 0) {
          translateX.value = Math.min(e.translationX, SWIPE_DELETE_WIDTH + 28);
        } else {
          translateX.value = 0;
        }
      })
      .onEnd((e) => {
        if (e.translationX >= SWIPE_DELETE_TRIGGER) {
          translateX.value = withSpring(0, REORDER_SPRING);
          runOnJS(triggerDelete)();
          return;
        }
        translateX.value = withSpring(0, REORDER_SPRING);
      });

    if (!reorderEnabled || !onCommitReorder) {
      return swipePan;
    }

    const reorderPan = Gesture.Pan()
      .activateAfterLongPress(REORDER_LONG_PRESS_MS)
      .maxPointers(1)
      .failOffsetX([-18, 18])
      .onStart(() => {
        reorderDragging.value = 1;
        translateX.value = 0;
        runOnJS(triggerReorderStart)();
      })
      .onUpdate((e) => {
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        runOnJS(triggerReorderEnd)(e.translationY);
      })
      .onFinalize(() => {
        translateY.value = withSpring(0, REORDER_SPRING);
        reorderDragging.value = 0;
        runOnJS(clearReorderDragActive)();
      });

    return Gesture.Race(swipePan, reorderPan);
  }, [
    clearReorderDragActive,
    onCommitReorder,
    reorderEnabled,
    reorderDragging,
    triggerDelete,
    triggerReorderEnd,
    triggerReorderStart,
  ]);

  const deleteUnderlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 12, SWIPE_DELETE_WIDTH], [0, 0.5, 1], Extrapolation.CLAMP),
  }));

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const reorderAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: reorderDragging.value ? 1.015 : 1 },
    ],
    zIndex: reorderDragging.value ? 320 : 0,
    elevation: reorderDragging.value ? 16 : 0,
    shadowColor: '#000000',
    shadowOpacity: reorderDragging.value ? 0.14 : 0,
    shadowRadius: reorderDragging.value ? 10 : 0,
    shadowOffset: { width: 0, height: reorderDragging.value ? 6 : 0 },
    borderWidth: reorderDragging.value ? 2 : 0,
    borderColor: '#000000',
  }));

  const titleColor = completed ? palette.muted : palette.ink;
  const liveTimeColor = isCurrent && !completed ? accentColor : palette.muted;
  const liveTitleColor = isCurrent && !completed ? accentColor : titleColor;

  return (
    <Reanimated.View
      style={[styles.rowOuter, reorderAnimatedStyle]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) onRowMeasured(h);
      }}>
      <View style={styles.eventRow}>
        <View style={styles.swipeClip}>
          <Reanimated.View
            pointerEvents="none"
            style={[styles.deleteUnderlay, deleteUnderlayStyle]}>
            <ThemedText style={styles.deleteLabel}>{t('common.delete')}</ThemedText>
          </Reanimated.View>
          <GestureDetector gesture={blockGesture}>
            <Reanimated.View
              style={[
                styles.swipeForeground,
                swipeAnimatedStyle,
                { backgroundColor: rowSurface },
              ]}>
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={t('dayPlan.blockEditA11y', { title: displayTitle })}
                style={({ pressed }) => [styles.blockMainPress, pressed && onPress && styles.pressed]}>
                <View style={styles.railCol}>
                  <ThemedText
                    style={[
                      styles.railTime,
                      { color: liveTimeColor },
                      isCurrent && !completed && styles.railTimeLive,
                      completed && styles.textDone,
                    ]}>
                    {formatRailMinutes(row.startMinutes)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.railTimeSecondary,
                      { color: liveTimeColor },
                      isCurrent && !completed && styles.railTimeLive,
                      completed && styles.textDone,
                    ]}>
                    {endsNextDay ? `+${formatRailMinutes(railEndMinutes)}` : formatRailMinutes(railEndMinutes)}
                  </ThemedText>
                </View>
                <View style={styles.spineCol}>
                  <SpineNode
                    block={row.block}
                    palette={palette}
                    isDark={isDark}
                    completed={completed}
                    isCurrent={isCurrent}
                    accentColor={accentColor}
                  />
                  <View style={[styles.spineLine, { backgroundColor: palette.line }]} />
                </View>
                <View style={styles.contentCol}>
                  <ThemedText
                    style={[
                      styles.metaText,
                      { color: liveTimeColor },
                      isCurrent && !completed && styles.metaTextLive,
                      completed && styles.textDone,
                    ]}>
                    {startClockLabel}~{endClockLabel} ({formatDurationMinutes(durationMin, locale)})
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.titleText,
                      { color: liveTitleColor },
                      isCurrent && !completed && styles.titleLive,
                      completed && styles.titleDone,
                    ]}
                    numberOfLines={2}>
                    {displayTitle}
                  </ThemedText>
                </View>
              </Pressable>
            </Reanimated.View>
          </GestureDetector>
        </View>
        {onOpenSettings ? (
          <SettingsButton label={displayTitle} isDark={isDark} onPress={onOpenSettings} />
        ) : null}
        {onToggleComplete ? (
          <CompleteRadio
            checked={completed}
            isDark={isDark}
            onPress={onToggleComplete}
          />
        ) : null}
      </View>
    </Reanimated.View>
  );
}

const RAIL_W = 44;
const SPINE_W = 36;
const COMPLETE_W = 44;

const styles = StyleSheet.create({
  rowOuter: {
    width: '100%',
    position: 'relative',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
    paddingVertical: 10,
    minHeight: 56,
  },
  swipeClip: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  deleteUnderlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DC2626',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 18,
  },
  deleteLabel: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
  },
  swipeForeground: {
    width: '100%',
  },
  blockMainPress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  completeHit: {
    width: COMPLETE_W,
    height: COMPLETE_W,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  settingsBtnShell: {
    position: 'relative',
    marginTop: 6,
    flexShrink: 0,
  },
  settingsBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  railCol: {
    width: RAIL_W,
    alignItems: 'flex-end',
    paddingTop: 4,
    gap: 2,
  },
  railTime: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  railTimeSecondary: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.72,
  },
  railTimeLive: {
    fontWeight: '800',
    opacity: 1,
  },
  spineCol: {
    width: SPINE_W,
    alignItems: 'center',
  },
  spineLine: {
    width: 2,
    height: 20,
    marginTop: 4,
    borderRadius: 1,
    opacity: 0.35,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  metaTextLive: {
    fontWeight: '700',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  titleLive: {
    fontWeight: '800',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.55,
  },
  textDone: {
    opacity: 0.55,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  pressed: {
    opacity: 0.72,
  },
});
