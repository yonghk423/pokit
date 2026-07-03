import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SymbolViewProps } from 'expo-symbols';

import { resolveCategoryCatalogIcon } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import type { DayMealSlot } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

export type MealSlotTimelineItem = {
  key: string;
  label: string;
  icon: string;
  subtitle?: string;
};

export type MealSlotTimelineSection<T extends MealSlotTimelineItem = MealSlotTimelineItem> = {
  slot: DayMealSlot;
  title: string;
  /** HH:mm — 왼쪽 레일 */
  hintTime: string;
  isCurrent: boolean;
  items: T[];
};

export type MealSlotTimelinePalette = {
  ink: string;
  muted: string;
  line: string;
  surface: string;
  accent: string;
};

const SLOT_ICON: Record<DayMealSlot, SymbolViewProps['name']> = {
  dawn: 'sun.horizon.fill',
  morning: 'sun.max.fill',
  lunch: 'sun.max',
  dinner: 'sunset.fill',
  night: 'moon.fill',
};

const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };
const RAIL_W = 44;
const SPINE_W = 36;
const COMPLETE_W = 28;

function formatRailHhmm(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h}:${String(m).padStart(2, '0')}`;
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
      onPress={onPress}
      hitSlop={8}
      style={styles.completeHit}>
      {({ pressed }) => (
        <MaterialIcons
          name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={20}
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

function SpineAddButton({
  palette,
  isDark,
  label,
  onPress,
}: {
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.spineAddBtn,
        {
          borderColor: palette.line,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        pressed && styles.pressed,
      ]}>
      <IconSymbol name="plus" size={12} color={palette.accent} />
    </Pressable>
  );
}

function SlotAnchorRow({
  section,
  palette,
  isDark,
  isLastSection,
  onAddRoutine,
}: {
  section: MealSlotTimelineSection;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isLastSection: boolean;
  onAddRoutine?: () => void;
}) {
  const nodeBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const titleColor = section.isCurrent ? palette.ink : palette.muted;

  return (
    <View style={styles.eventRow}>
      <View style={styles.railCol}>
        <ThemedText style={[styles.railTime, { color: palette.muted }]}>
          {formatRailHhmm(section.hintTime)}
        </ThemedText>
      </View>
      <View style={styles.spineCol}>
        <View style={[styles.nodeCircle, styles.nodeCircleLg, { backgroundColor: nodeBg }]}>
          <IconSymbol
            name={SLOT_ICON[section.slot]}
            size={16}
            color={section.isCurrent ? palette.ink : palette.muted}
          />
        </View>
        {onAddRoutine ? (
          <SpineAddButton
            palette={palette}
            isDark={isDark}
            label="루틴 연결"
            onPress={onAddRoutine}
          />
        ) : null}
        {!isLastSection || section.items.length > 0 ? (
          <View style={[styles.spineLine, { backgroundColor: palette.line }]} />
        ) : null}
      </View>
      <View style={styles.contentCol}>
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>{section.title}</ThemedText>
      </View>
      <View style={styles.completeSpacer} />
    </View>
  );
}

function RoutineSpineRow({
  item,
  palette,
  isDark,
  completed,
  reorderEnabled,
  onToggleComplete,
  onSettings,
  onReorderDragActiveChange,
  onReorderDragTranslationEnd,
  onAddRoutine,
}: {
  item: MealSlotTimelineItem;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  completed: boolean;
  reorderEnabled: boolean;
  onToggleComplete?: () => void;
  onSettings?: () => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderDragTranslationEnd?: (translationY: number) => void;
  onAddRoutine?: () => void;
}) {
  const translateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);
  const nodeBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const iconColor = completed ? palette.muted : activeIconColorByCategory(item.key);
  const titleColor = completed ? palette.muted : palette.ink;

  const triggerReorderStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReorderDragActiveChange?.(item.key, true);
  }, [item.key, onReorderDragActiveChange]);

  const triggerReorderEnd = useCallback(
    (translationY: number) => {
      onReorderDragTranslationEnd?.(translationY);
    },
    [onReorderDragTranslationEnd],
  );

  const clearReorderDragActive = useCallback(() => {
    onReorderDragActiveChange?.(item.key, false);
  }, [item.key, onReorderDragActiveChange]);

  const reorderGesture = useMemo(() => {
    if (!reorderEnabled || !onReorderDragTranslationEnd) return null;
    return Gesture.Pan()
      .activateAfterLongPress(REORDER_LONG_PRESS_MS)
      .maxPointers(1)
      .onStart(() => {
        reorderDragging.value = 1;
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
  }, [
    clearReorderDragActive,
    onReorderDragTranslationEnd,
    reorderDragging,
    reorderEnabled,
    triggerReorderEnd,
    triggerReorderStart,
    translateY,
  ]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: reorderDragging.value ? 1.015 : 1 }],
    zIndex: reorderDragging.value ? 220 : 0,
  }));

  const rowContent = (
    <>
      <View style={styles.railCol} />
      <View style={styles.spineCol}>
        <View style={[styles.nodeCircle, { backgroundColor: nodeBg }, completed && styles.nodeDone]}>
          <IconSymbol
            name={resolveCategoryCatalogIcon(item.key) as SymbolViewProps['name']}
            size={14}
            color={iconColor}
          />
        </View>
        <View style={styles.spineAddSlot}>
          {onAddRoutine ? (
            <SpineAddButton
              palette={palette}
              isDark={isDark}
              label="루틴 더 연결"
              onPress={onAddRoutine}
            />
          ) : null}
        </View>
        <View style={[styles.spineLine, { backgroundColor: palette.line }]} />
      </View>
      <View style={styles.contentCol}>
        <View style={styles.titleRow}>
          <ThemedText
            style={[styles.titleText, { color: titleColor }, completed && styles.titleDone]}
            numberOfLines={1}>
            {item.label}
          </ThemedText>
          {onSettings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.label} 상세 설정`}
              hitSlop={8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSettings();
              }}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  borderColor: palette.line,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                },
                pressed && styles.pressed,
              ]}>
              <IconSymbol name="slider.horizontal.3" size={14} color={palette.ink} />
            </Pressable>
          ) : null}
        </View>
        {item.subtitle ? (
          <ThemedText
            style={[styles.metaText, { color: palette.muted }, completed && styles.titleDone]}
            numberOfLines={1}>
            {item.subtitle}
          </ThemedText>
        ) : null}
      </View>
      <CompleteRadio
        checked={completed}
        isDark={isDark}
        accent={isDark ? '#FAFAFA' : PrimaryColor}
        onPress={onToggleComplete}
      />
    </>
  );

  if (!reorderGesture) {
    return <View style={styles.eventRow}>{rowContent}</View>;
  }

  return (
    <GestureDetector gesture={reorderGesture}>
      <Reanimated.View style={[styles.eventRow, rowAnimatedStyle]}>{rowContent}</Reanimated.View>
    </GestureDetector>
  );
}

type Props<T extends MealSlotTimelineItem> = {
  sections: MealSlotTimelineSection<T>[];
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isItemCompleted: (key: string) => boolean;
  reorderEnabled?: boolean;
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onPressEditSchedule?: () => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderItemDragEnd?: (key: string, translationY: number) => void;
};

export function MealSlotTimelineView<T extends MealSlotTimelineItem>({
  sections,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled = false,
  onPressAddRoutine,
  onPressEditSchedule,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onReorderItemDragEnd,
}: Props<T>) {
  return (
    <View style={styles.root}>
      {onPressEditSchedule ? (
        <View style={styles.scheduleToolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="구간 시간 설정"
            accessibilityHint="새벽·아침·점심·저녁·밤 구간 시작 시각을 변경할 수 있어요"
            hitSlop={6}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressEditSchedule();
            }}
            style={({ pressed }) => [
              styles.scheduleEditBtn,
              {
                borderColor: palette.line,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              },
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="clock" size={13} color={palette.ink} />
            <ThemedText style={[styles.scheduleEditLabel, { color: palette.ink }]}>
              구간 시간 설정
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      {sections.map((section, sectionIndex) => {
        const isLastSection = sectionIndex === sections.length - 1;
        const addRoutineHandler = () => onPressAddRoutine(section.slot);
        const lastItemKey =
          section.items.length > 0 ? section.items[section.items.length - 1]?.key : null;

        return (
          <View key={section.slot}>
            <SlotAnchorRow
              section={section}
              palette={palette}
              isDark={isDark}
              isLastSection={isLastSection}
              onAddRoutine={section.items.length === 0 ? addRoutineHandler : undefined}
            />
            {section.items.map((item) => (
              <RoutineSpineRow
                key={item.key}
                item={item}
                palette={palette}
                isDark={isDark}
                completed={isItemCompleted(item.key)}
                reorderEnabled={reorderEnabled}
                onToggleComplete={() => onToggleItemComplete(item.key)}
                onSettings={onOpenItemSettings ? () => onOpenItemSettings(item.key) : undefined}
                onReorderDragActiveChange={onReorderDragActiveChange}
                onReorderDragTranslationEnd={
                  onReorderItemDragEnd
                    ? (ty) => onReorderItemDragEnd(item.key, ty)
                    : undefined
                }
                onAddRoutine={item.key === lastItemKey ? addRoutineHandler : undefined}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: 4,
  },
  scheduleToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    paddingHorizontal: 2,
  },
  scheduleEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  scheduleEditLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    minHeight: 72,
  },
  railCol: {
    width: RAIL_W,
    alignItems: 'flex-end',
    paddingTop: 6,
    gap: 2,
  },
  railTime: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  spineCol: {
    width: SPINE_W,
    alignItems: 'center',
  },
  spineLine: {
    width: 2,
    height: 18,
    marginTop: 4,
    borderRadius: 1,
    opacity: 0.35,
  },
  spineAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  spineAddSlot: {
    height: 28,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  nodeDone: {
    opacity: 0.55,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '100%',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  titleText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.62,
  },
  settingsBtn: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeHit: {
    width: COMPLETE_W,
    height: COMPLETE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeSpacer: {
    width: COMPLETE_W,
  },
  pressed: {
    opacity: 0.72,
  },
});
