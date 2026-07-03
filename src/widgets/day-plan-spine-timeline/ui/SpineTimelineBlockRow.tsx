import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { formatMinuteOfDayKo, getBlockTimelineIcon, resolveBlockCategoryKey, resolveCategoryCatalogAccentColor, type SpineTimelineRow } from '@entities/day-plan';
import { formatDurationMinKo } from '@shared/lib/formatDurationMinKo';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { SpineTimelinePalette } from './SpineTimelineView';

const SWIPE_DELETE_WIDTH = 88;
const SWIPE_DELETE_TRIGGER = 72;
const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };
const COMPLETE_RADIO_SIZE = 22;

function formatRailMinutes(minutes: number): string {
  const m = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

function CompleteRadio({
  checked,
  isDark,
  accent,
  onPress,
}: {
  checked: boolean;
  isDark: boolean;
  accent: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={checked ? '완료 취소' : '완료'}
      onPress={onPress}
      hitSlop={10}
      style={styles.completeHit}>
      {({ pressed }) => (
        <MaterialIcons
          name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={COMPLETE_RADIO_SIZE}
          color={
            checked
              ? accent
              : pressed
                ? isDark
                  ? 'rgba(255,255,255,0.58)'
                  : '#D1D5DB'
                : isDark
                  ? 'rgba(255,255,255,0.42)'
                  : '#9CA3AF'
          }
        />
      )}
    </Pressable>
  );
}

function SpineNode({
  block,
  palette,
  isDark,
  completed,
}: {
  block: Extract<SpineTimelineRow, { kind: 'block' }>['block'];
  palette: SpineTimelinePalette;
  isDark: boolean;
  completed: boolean;
}) {
  const blockBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const categoryKey = resolveBlockCategoryKey(block) ?? 'other';
  const iconName = getBlockTimelineIcon(block);
  const iconColor = completed
    ? palette.muted
    : resolveCategoryCatalogAccentColor(categoryKey);

  return (
    <View style={[styles.nodeCircle, { backgroundColor: blockBg }, completed && styles.nodeDone]}>
      <IconSymbol name={iconName as any} size={14} color={iconColor} />
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
  reorderEnabled: boolean;
  onToggleComplete: () => void;
  onPress?: () => void;
  onDelete?: () => void;
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
  reorderEnabled,
  onToggleComplete,
  onPress,
  onDelete,
  onRowMeasured,
  onReorderDragActiveChange,
  onCommitReorder,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);
  const durationMin = row.endMinutes - row.startMinutes;

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

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: reorderDragging.value ? 1.015 : 1 },
    ],
    zIndex: reorderDragging.value ? 220 : 0,
    elevation: reorderDragging.value ? 24 : 0,
    shadowOpacity: reorderDragging.value ? 0.12 : 0,
    shadowRadius: reorderDragging.value ? 8 : 0,
    shadowOffset: { width: 0, height: reorderDragging.value ? 4 : 0 },
  }));

  const titleColor = completed ? palette.muted : palette.ink;

  return (
    <View
      style={styles.rowOuter}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) onRowMeasured(h);
      }}>
      <View style={styles.eventRow}>
        <View style={styles.swipeClip}>
          <Reanimated.View
            pointerEvents="none"
            style={[styles.deleteUnderlay, deleteUnderlayStyle]}>
            <ThemedText style={styles.deleteLabel}>삭제</ThemedText>
          </Reanimated.View>
          <GestureDetector gesture={blockGesture}>
            <Reanimated.View
              style={[
                styles.swipeForeground,
                rowAnimatedStyle,
                { backgroundColor: rowSurface, shadowColor: '#000' },
              ]}>
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={`${row.block.title}, 탭하면 수정 · 오른쪽으로 밀면 삭제 · 길게 눌러 순서 변경`}
                style={({ pressed }) => [styles.blockMainPress, pressed && onPress && styles.pressed]}>
                <View style={styles.railCol}>
                  <ThemedText
                    style={[
                      styles.railTime,
                      { color: palette.muted },
                      completed && styles.textDone,
                    ]}>
                    {formatRailMinutes(row.startMinutes)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.railTimeSecondary,
                      { color: palette.muted },
                      completed && styles.textDone,
                    ]}>
                    {formatRailMinutes(row.endMinutes)}
                  </ThemedText>
                </View>
                <View style={styles.spineCol}>
                  <SpineNode block={row.block} palette={palette} isDark={isDark} completed={completed} />
                  <View style={[styles.spineLine, { backgroundColor: palette.line }]} />
                </View>
                <View style={styles.contentCol}>
                  <ThemedText
                    style={[
                      styles.metaText,
                      { color: palette.muted },
                      completed && styles.textDone,
                    ]}>
                    {formatMinuteOfDayKo(row.startMinutes)}~
                    {formatMinuteOfDayKo(row.endMinutes).replace(/^[^\s]+\s/, '')} (
                    {formatDurationMinKo(durationMin)})
                  </ThemedText>
                  <ThemedText
                    style={[styles.titleText, { color: titleColor }, completed && styles.titleDone]}
                    numberOfLines={2}>
                    {row.block.title}
                  </ThemedText>
                </View>
              </Pressable>
            </Reanimated.View>
          </GestureDetector>
        </View>
        <CompleteRadio
          checked={completed}
          isDark={isDark}
          accent={palette.accent}
          onPress={() => {
            void Haptics.selectionAsync();
            onToggleComplete();
          }}
        />
      </View>
    </View>
  );
}

const RAIL_W = 44;
const SPINE_W = 36;
const COMPLETE_W = 28;

const styles = StyleSheet.create({
  rowOuter: {
    width: '100%',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    opacity: 0.55,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
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
