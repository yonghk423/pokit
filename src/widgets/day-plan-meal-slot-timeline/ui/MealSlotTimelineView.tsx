import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { formatHhmmClockKo } from '@entities/day-plan';
import {
  CityPopSpacing,
  CityPopTypography,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import type { DayMealSlot } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import {
  activeIconColorByCategory,
  categoryIconAccent,
} from '@widgets/day-plan-priority-order/lib/activeIconColorByCategory';

import { DAY_MEAL_SLOT_ICON, DAY_NIGHT_HEADER_ICON, DAY_NIGHT_HEADER_MOON_ICON } from '../lib/mealSlotIcons';

export type MealSlotTimelineItem = {
  key: string;
  /** 완료·드래그 식별자와 분리된 카테고리 키(구간별 복합 key 사용 시) */
  categoryKey?: string;
  label: string;
  icon: string;
  subtitle?: string;
};

function resolveTimelineItemCategoryKey(item: MealSlotTimelineItem): string {
  return item.categoryKey ?? item.key;
}

export type MealSlotTimelineSection<T extends MealSlotTimelineItem = MealSlotTimelineItem> = {
  slot: DayMealSlot;
  title: string;
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

const REORDER_LONG_PRESS_MS = 420;
const REORDER_SPRING = { damping: 22, stiffness: 250, mass: 0.95 };
/** HTML `pl-10` */
const TIMELINE_INSET = 40;
/** HTML `left-[14px]` */
const DOT_LEFT = 14;
const DOT_SIZE = 12;
/** HTML `rounded-lg` */
const CARD_RADIUS = 8;
/** HTML `thin-outline` */
const THIN_BORDER = 1;
const CHECKBOX_SIZE = 20;

type SlotBadgeTheme = {
  bg: string;
  label: string;
};

function slotBadgeTheme(slot: DayMealSlot, isDark: boolean): SlotBadgeTheme {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;

  if (isDark) {
    const dark: Record<DayMealSlot, SlotBadgeTheme> = {
      dawn: { bg: '#306163', label: c.text },
      morning: { bg: '#3A5C5E', label: c.text },
      lunch: { bg: '#5C3A48', label: c.text },
      dinner: { bg: '#4A463F', label: c.text },
      night: { bg: c.text, label: c.bg },
    };
    return dark[slot];
  }

  const light: Record<DayMealSlot, SlotBadgeTheme> = {
    dawn: { bg: '#D1F2F3', label: c.primary },
    morning: { bg: c.primaryContainer, label: c.primary },
    lunch: { bg: '#FFE2E2', label: c.text },
    dinner: { bg: '#B6D3FF', label: '#3E5B81' },
    night: { bg: c.text, label: '#FAFAFA' },
  };
  return light[slot];
}

function cardColors(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    face: isDark ? c.surfaceAlt : '#FFFFFF',
    border: isDark ? c.border : '#000000',
    shadow: c.solidShadow,
  };
}

function RoutineIconBadge({
  icon,
  categoryKey,
  isDark,
  completed,
  palette,
  size = 16,
}: {
  icon: string;
  categoryKey: string;
  isDark: boolean;
  completed: boolean;
  palette: MealSlotTimelinePalette;
  size?: number;
}) {
  const accent = categoryIconAccent(categoryKey);
  const colors = cardColors(isDark);
  const iconColor = completed
    ? palette.muted
    : activeIconColorByCategory(categoryKey);

  return (
    <View
      style={[
        styles.routineIconBadge,
        {
          borderColor: colors.border,
          backgroundColor: completed
            ? isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.04)'
            : accent.surface,
        },
      ]}>
      {categoryKey === 'medicine' ? (
        <IconSymbol name="cross.fill" size={size - 4} color="#BA1A1A" />
      ) : (
        <IconSymbol name={icon as any} size={size} color={iconColor} />
      )}
    </View>
  );
}

function CardHeadingWithIcon({
  item,
  palette,
  isDark,
  completed = false,
}: {
  item: MealSlotTimelineItem;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  completed?: boolean;
}) {
  return (
    <View style={styles.cardHeadingRow}>
      <RoutineIconBadge
        icon={item.icon}
        categoryKey={resolveTimelineItemCategoryKey(item)}
        isDark={isDark}
        completed={completed}
        palette={palette}
        size={17}
      />
      <ThemedText
        style={[
          styles.cardHeading,
          cityPopFont('700'),
          { color: completed ? palette.muted : palette.ink },
          completed && styles.checkboxLabelDone,
        ]}
        numberOfLines={2}>
        {item.label}
      </ThemedText>
    </View>
  );
}

function BrutalistCard({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  const colors = cardColors(isDark);
  return (
    <View style={styles.cardShell}>
      <View
        style={[
          styles.cardShadow,
          { backgroundColor: colors.shadow, borderColor: colors.border },
        ]}
      />
      <View
        style={[
          styles.cardFace,
          { backgroundColor: colors.face, borderColor: colors.border },
        ]}>
        {children}
      </View>
    </View>
  );
}

function CustomCheckbox({
  checked,
  isDark,
  onPress,
}: {
  checked: boolean;
  isDark: boolean;
  onPress?: () => void;
}) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.checkbox,
        {
          borderColor: c.border,
          backgroundColor: checked ? c.tertiary : pressed ? c.surfaceContainer : 'transparent',
        },
      ]}>
      {checked ? <MaterialIcons name="check" size={14} color={c.primaryContainer} /> : null}
    </Pressable>
  );
}

function TimelineGreeting({
  dateLabel,
  palette,
  isDark,
  onPressEditSchedule,
}: {
  dateLabel?: string;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  onPressEditSchedule?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const primary = isDark ? RetroFlatColors.dark.primary : RetroFlatColors.light.primary;
  const colors = cardColors(isDark);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.greetingBlock}>
      <View style={styles.greetingTitleRow}>
        <View style={styles.greetingDayNightIcons}>
          <IconSymbol name={DAY_NIGHT_HEADER_ICON as 'sun.and.horizon.fill'} size={20} color={primary} />
          <IconSymbol name={DAY_NIGHT_HEADER_MOON_ICON as 'moon.fill'} size={20} color={primary} />
        </View>
        <ThemedText style={[styles.greetingTitle, cityPopFont('700'), { color: palette.ink }]}>
          오늘의 주야
        </ThemedText>
      </View>
      <View style={styles.greetingSubRow}>
        <View style={styles.greetingSubLeft}>
          {dateLabel ? (
            <>
              <Animated.View
                style={[styles.greetingPulseDot, { backgroundColor: primary, opacity: pulse }]}
              />
              <ThemedText style={[styles.greetingSub, cityPopFont('500'), { color: palette.muted }]}>
                오늘은{' '}
                <ThemedText style={[cityPopFont('700'), { color: primary }]}>{dateLabel}</ThemedText>
              </ThemedText>
            </>
          ) : null}
        </View>
        {onPressEditSchedule ? (
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
                borderColor: colors.border,
                backgroundColor: colors.face,
              },
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="clock" size={13} color={palette.ink} />
            <ThemedText style={[styles.scheduleEditLabel, cityPopFont('700'), { color: palette.ink }]}>
              구간 시간 설정
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}


function CheckboxRow({
  item,
  palette,
  isDark,
  completed,
  labelHidden = false,
  onToggleComplete,
  onOpenSettings,
}: {
  item: MealSlotTimelineItem;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  completed: boolean;
  labelHidden?: boolean;
  onToggleComplete?: () => void;
  onOpenSettings?: () => void;
}) {
  const primary = isDark ? RetroFlatColors.dark.primary : RetroFlatColors.light.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleComplete?.();
      }}
      onLongPress={
        onOpenSettings
          ? () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onOpenSettings();
            }
          : undefined
      }
      style={({ pressed: rowPressed }) => [styles.checkboxRow, rowPressed && styles.pressed]}>
      {({ pressed }) => (
        <>
          <CustomCheckbox
            checked={completed}
            isDark={isDark}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleComplete?.();
            }}
          />
          {labelHidden ? null : (
            <>
              <RoutineIconBadge
                icon={item.icon}
                categoryKey={resolveTimelineItemCategoryKey(item)}
                isDark={isDark}
                completed={completed}
                palette={palette}
              />
              <ThemedText
                style={[
                  styles.checkboxLabel,
                  cityPopFont('400'),
                  { color: completed ? palette.muted : palette.ink },
                  completed && styles.checkboxLabelDone,
                  !completed && pressed && { color: primary },
                ]}
                numberOfLines={2}>
                {item.label}
              </ThemedText>
            </>
          )}
        </>
      )}
    </Pressable>
  );
}

function ReorderableCheckboxRow({
  item,
  palette,
  isDark,
  completed,
  labelHidden = false,
  reorderEnabled,
  onToggleComplete,
  onOpenSettings,
  onReorderDragActiveChange,
  onReorderDragTranslationEnd,
}: {
  item: MealSlotTimelineItem;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  completed: boolean;
  labelHidden?: boolean;
  reorderEnabled: boolean;
  onToggleComplete?: () => void;
  onOpenSettings?: () => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderDragTranslationEnd?: (translationY: number) => void;
}) {
  const translateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);

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
    reorderEnabled,
    reorderDragging,
    triggerReorderEnd,
    triggerReorderStart,
    translateY,
  ]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: reorderDragging.value ? 220 : 0,
  }));

  const row = (
    <CheckboxRow
      item={item}
      palette={palette}
      isDark={isDark}
      completed={completed}
      labelHidden={labelHidden}
      onToggleComplete={onToggleComplete}
      onOpenSettings={onOpenSettings}
    />
  );

  if (!reorderGesture) return row;

  return (
    <GestureDetector gesture={reorderGesture}>
      <Reanimated.View style={rowAnimatedStyle}>{row}</Reanimated.View>
    </GestureDetector>
  );
}

function SectionSlotCard<T extends MealSlotTimelineItem>({
  section,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled,
  onPressAddRoutine,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onReorderItemDragEnd,
}: {
  section: MealSlotTimelineSection<T>;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isItemCompleted: (key: string) => boolean;
  reorderEnabled: boolean;
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderItemDragEnd?: (key: string, translationY: number, fromSlot?: DayMealSlot) => void;
}) {
  const { items } = section;
  const colors = cardColors(isDark);

  if (items.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="루틴 연결"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPressAddRoutine(section.slot);
        }}
        style={({ pressed }) => [styles.cardShell, pressed && styles.pressed]}>
        <View
          style={[
            styles.cardShadow,
            { backgroundColor: colors.shadow, borderColor: colors.border },
          ]}
        />
        <View
          style={[
            styles.cardFace,
            styles.emptyCardFace,
            { backgroundColor: colors.face, borderColor: colors.border },
          ]}>
          <IconSymbol name="plus" size={15} color={palette.muted} />
          <ThemedText style={[styles.emptyCardLabel, cityPopFont('600'), { color: palette.muted }]}>
            루틴 연결
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  const single = items.length === 1 ? items[0] : null;
  const dawnStyle = single && single.subtitle && section.slot === 'dawn';

  return (
    <BrutalistCard isDark={isDark}>
      <View style={styles.cardBody}>
        {dawnStyle && single ? (
          <>
            <CardHeadingWithIcon item={single} palette={palette} isDark={isDark} />
            <ThemedText
              style={[styles.cardDescription, cityPopFont('400'), { color: palette.muted }]}
              numberOfLines={4}>
              {single.subtitle}
            </ThemedText>
          </>
        ) : single && single.subtitle ? (
          <>
            <CardHeadingWithIcon
              item={single}
              palette={palette}
              isDark={isDark}
              completed={isItemCompleted(single.key)}
            />
            <ThemedText
              style={[styles.cardDescription, cityPopFont('400'), { color: palette.muted }]}
              numberOfLines={3}>
              {single.subtitle}
            </ThemedText>
            <View style={styles.checkboxListTight}>
              <ReorderableCheckboxRow
                item={single}
                palette={palette}
                isDark={isDark}
                completed={isItemCompleted(single.key)}
                labelHidden
                reorderEnabled={reorderEnabled}
                onToggleComplete={() => onToggleItemComplete(single.key)}
                onOpenSettings={
                  onOpenItemSettings ? () => onOpenItemSettings(single.key) : undefined
                }
                onReorderDragActiveChange={onReorderDragActiveChange}
                onReorderDragTranslationEnd={
                  onReorderItemDragEnd
                    ? (ty) => onReorderItemDragEnd(single.key, ty, section.slot)
                    : undefined
                }
              />
            </View>
          </>
        ) : single ? (
          <>
            <CardHeadingWithIcon
              item={single}
              palette={palette}
              isDark={isDark}
              completed={isItemCompleted(single.key)}
            />
            <View style={styles.checkboxList}>
              <ReorderableCheckboxRow
                item={single}
                palette={palette}
                isDark={isDark}
                completed={isItemCompleted(single.key)}
                labelHidden
                reorderEnabled={reorderEnabled}
                onToggleComplete={() => onToggleItemComplete(single.key)}
                onOpenSettings={
                  onOpenItemSettings ? () => onOpenItemSettings(single.key) : undefined
                }
                onReorderDragActiveChange={onReorderDragActiveChange}
                onReorderDragTranslationEnd={
                  onReorderItemDragEnd
                    ? (ty) => onReorderItemDragEnd(single.key, ty, section.slot)
                    : undefined
                }
              />
            </View>
          </>
        ) : (
          <View style={styles.checkboxList}>
            {items.map((item) => (
              <ReorderableCheckboxRow
                key={item.key}
                item={item}
                palette={palette}
                isDark={isDark}
                completed={isItemCompleted(item.key)}
                reorderEnabled={reorderEnabled}
                onToggleComplete={() => onToggleItemComplete(item.key)}
                onOpenSettings={onOpenItemSettings ? () => onOpenItemSettings(item.key) : undefined}
                onReorderDragActiveChange={onReorderDragActiveChange}
                onReorderDragTranslationEnd={
                  onReorderItemDragEnd
                    ? (ty) => onReorderItemDragEnd(item.key, ty, section.slot)
                    : undefined
                }
              />
            ))}
          </View>
        )}

        {items.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="루틴 더 연결"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressAddRoutine(section.slot);
            }}
            style={({ pressed }) => [styles.addLinkRow, pressed && styles.pressed]}>
            <IconSymbol name="plus" size={13} color={palette.muted} />
            <ThemedText style={[styles.addLinkLabel, cityPopFont('600'), { color: palette.muted }]}>
              루틴 더 연결
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </BrutalistCard>
  );
}

function TimelineSectionBlock<T extends MealSlotTimelineItem>({
  section,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled,
  onPressAddRoutine,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onReorderItemDragEnd,
}: {
  section: MealSlotTimelineSection<T>;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isItemCompleted: (key: string) => boolean;
  reorderEnabled: boolean;
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderItemDragEnd?: (key: string, translationY: number, fromSlot?: DayMealSlot) => void;
}) {
  const badge = slotBadgeTheme(section.slot, isDark);
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const colors = cardColors(isDark);

  return (
    <View style={styles.sectionBlock}>
      <View
        style={[
          styles.sectionDot,
          {
            borderColor: palette.line,
            backgroundColor: section.isCurrent ? c.primary : 'transparent',
          },
        ]}
      />

      <View style={styles.sectionContent}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.slotBadge,
              {
                backgroundColor: badge.bg,
                borderColor: colors.border,
              },
            ]}>
            <IconSymbol
              name={DAY_MEAL_SLOT_ICON[section.slot] as 'moon.fill'}
              size={11}
              color={badge.label}
            />
            <ThemedText
              style={[styles.slotBadgeLabel, cityPopFont('800'), { color: badge.label }]}
              numberOfLines={1}>
              {section.title}
            </ThemedText>
          </View>
          <ThemedText style={[styles.slotTimeLabel, cityPopFont('800'), { color: palette.muted }]}>
            {formatHhmmClockKo(section.hintTime)}
          </ThemedText>
        </View>

        <SectionSlotCard
          section={section}
          palette={palette}
          isDark={isDark}
          isItemCompleted={isItemCompleted}
          reorderEnabled={reorderEnabled}
          onPressAddRoutine={onPressAddRoutine}
          onToggleItemComplete={onToggleItemComplete}
          onOpenItemSettings={onOpenItemSettings}
          onReorderDragActiveChange={onReorderDragActiveChange}
          onReorderItemDragEnd={onReorderItemDragEnd}
        />
      </View>
    </View>
  );
}

type Props<T extends MealSlotTimelineItem> = {
  sections: MealSlotTimelineSection<T>[];
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isFocusStarted: boolean;
  isItemCompleted: (key: string) => boolean;
  reorderEnabled?: boolean;
  dateLabel?: string;
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onPressEditSchedule?: () => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderItemDragEnd?: (key: string, translationY: number, fromSlot?: DayMealSlot) => void;
};

export function MealSlotTimelineView<T extends MealSlotTimelineItem>({
  sections,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled = false,
  dateLabel,
  onPressAddRoutine,
  onPressEditSchedule,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onReorderItemDragEnd,
}: Props<T>) {
  return (
    <View style={styles.root}>
      {dateLabel || onPressEditSchedule ? (
        <TimelineGreeting
          dateLabel={dateLabel}
          palette={palette}
          isDark={isDark}
          onPressEditSchedule={onPressEditSchedule}
        />
      ) : null}

      <View style={styles.timelineTrack}>
        <View style={[styles.spineLineAbsolute, { backgroundColor: palette.line }]} />

        {sections.map((section) => (
          <TimelineSectionBlock
            key={section.slot}
            section={section}
            palette={palette}
            isDark={isDark}
            isItemCompleted={isItemCompleted}
            reorderEnabled={reorderEnabled}
            onPressAddRoutine={onPressAddRoutine}
            onToggleItemComplete={onToggleItemComplete}
            onOpenItemSettings={onOpenItemSettings}
            onReorderDragActiveChange={onReorderDragActiveChange}
            onReorderItemDragEnd={onReorderItemDragEnd}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: 4,
    gap: CityPopSpacing.md,
  },
  greetingBlock: {
    gap: CityPopSpacing.xs,
    paddingHorizontal: 2,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingDayNightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greetingTitle: {
    ...CityPopTypography.headlineLgMobile,
  },
  greetingSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  greetingSubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  greetingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  greetingSub: {
    ...CityPopTypography.bodyLg,
  },
  scheduleEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CARD_RADIUS,
    borderWidth: THIN_BORDER,
  },
  scheduleEditLabel: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  timelineTrack: {
    position: 'relative',
    gap: CityPopSpacing.lg,
  },
  spineLineAbsolute: {
    position: 'absolute',
    left: DOT_LEFT + DOT_SIZE / 2 - THIN_BORDER / 2,
    top: DOT_SIZE,
    bottom: 32,
    width: THIN_BORDER,
    opacity: 0.45,
  },
  sectionBlock: {
    position: 'relative',
    paddingLeft: TIMELINE_INSET,
  },
  sectionDot: {
    position: 'absolute',
    left: DOT_LEFT,
    top: 8,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: THIN_BORDER,
  },
  sectionContent: {
    gap: CityPopSpacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: CARD_RADIUS,
    borderWidth: THIN_BORDER,
  },
  slotBadgeLabel: {
    fontSize: 11,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  slotTimeLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  cardShell: {
    position: 'relative',
    marginRight: SOLID_SHADOW_OFFSET,
    marginBottom: SOLID_SHADOW_OFFSET,
  },
  cardShadow: {
    position: 'absolute',
    top: SOLID_SHADOW_OFFSET,
    left: SOLID_SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderWidth: THIN_BORDER,
    borderRadius: CARD_RADIUS,
  },
  cardFace: {
    borderWidth: THIN_BORDER,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  cardBody: {
    padding: CityPopSpacing.md,
    gap: CityPopSpacing.sm,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardHeading: {
    flex: 1,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 16,
    lineHeight: 24,
    paddingLeft: 38,
  },
  routineIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 0,
    borderWidth: THIN_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxList: {
    gap: 12,
  },
  checkboxListTight: {
    gap: 12,
    paddingTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CityPopSpacing.sm,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 0,
    borderWidth: THIN_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  checkboxLabelDone: {
    textDecorationLine: 'line-through',
    opacity: 0.4,
  },
  emptyCardFace: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: CityPopSpacing.md,
  },
  emptyCardLabel: {
    fontSize: 13,
  },
  addLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  addLinkLabel: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.72,
  },
});
