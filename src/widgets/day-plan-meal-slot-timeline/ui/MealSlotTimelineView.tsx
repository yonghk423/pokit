import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, View, type View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { formatHhmmClockKo, dayPlanAnchorIconColor, dayPlanAnchorNodeBackground } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import {
  CityPopSpacing,
  RetroFlatColors,
  RETRO_BORDER_WIDTH,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import type { DayMealSlot } from '@shared/lib/storage';
import { CompletionRadioButton, COMPLETION_CHECKED_COLOR_DARK, COMPLETION_CHECKED_COLOR_LIGHT } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import {
  activeIconColorByCategory,
  categoryIconAccent,
} from '@widgets/day-plan-priority-order/lib/activeIconColorByCategory';

import { DAY_MEAL_SLOT_ICON, dayMealSlotIconColor } from '../lib/mealSlotIcons';

import {
  resolveMealSlotFromTimelineY,
  type MealSlotSectionBounds,
} from '../lib/resolveMealSlotFromTimelineY';

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
  /** 현재 구간 → 다음 구간 진행률(0~1) */
  progressToNext?: number;
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
/** 타임라인 축 열 너비 — HTML `pl-10` */
const SPINE_COL_WIDTH = 40;
const SPINE_WIDTH = 2;
const DOT_SIZE = 12;
const CURRENT_DOT_SIZE = 14;
/** 현재 구간 카드 — 조금 더 깊은 solid shadow */
const EMPHASIZED_SHADOW_OFFSET = 6;
/** 구간 배지 행과 도트 수직 정렬 */
const SECTION_DOT_TOP = 10;
const timelineAxisLeft = SPINE_COL_WIDTH / 2 - SPINE_WIDTH / 2;
const timelineSpineTop = SECTION_DOT_TOP + DOT_SIZE / 2;
/** Flat Brutalism Lite — radius 0 */
const CARD_RADIUS = 0;
/** 카드·체크박스 외곽선 */
const CARD_BORDER = RETRO_BORDER_WIDTH;
/** 소형 배지·설정 버튼 */
const THIN_BORDER = RETRO_BORDER_WIDTH;
const ICON_SHADOW_SM = 2;

type SlotBadgeTheme = {
  bg: string;
  label: string;
};

function slotBadgeTheme(_slot: DayMealSlot, isDark: boolean): SlotBadgeTheme {
  return {
    bg: dayPlanAnchorNodeBackground(isDark),
    label: dayPlanAnchorIconColor(isDark),
  };
}

function cardColors(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    face: isDark ? c.surfaceAlt : '#FFFFFF',
    border: isDark ? c.border : '#000000',
    /** 라이트: 예시 UI처럼 잉크 톤 solid shadow / 다크: 민트 톤 */
    shadow: isDark ? c.solidShadow : c.text,
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
  const iconColor = activeIconColorByCategory(categoryKey);

  return (
    <View
      style={[
        styles.routineIconBadgeShell,
        { marginRight: ICON_SHADOW_SM, marginBottom: ICON_SHADOW_SM },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.routineIconBadgeShadow,
          {
            backgroundColor: colors.shadow,
            borderColor: colors.border,
            transform: [{ translateX: ICON_SHADOW_SM }, { translateY: ICON_SHADOW_SM }],
          },
        ]}
      />
      <View
        style={[
          styles.routineIconBadge,
          {
            borderColor: colors.border,
            backgroundColor: accent.surface,
          },
        ]}>
        <View style={completed ? { opacity: 0.5 } : undefined}>
          <IconSymbol name={icon as any} size={size} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

function BrutalistCardShell({
  isDark,
  emphasized = false,
  children,
  faceStyle,
}: {
  isDark: boolean;
  emphasized?: boolean;
  children: ReactNode;
  faceStyle?: object;
}) {
  const colors = cardColors(isDark);
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowOffset = emphasized ? EMPHASIZED_SHADOW_OFFSET : SOLID_SHADOW_OFFSET;
  return (
    <View
      style={[
        styles.cardShell,
        { marginRight: shadowOffset, marginBottom: shadowOffset },
      ]}>
      <View
        style={[
          styles.cardShadow,
          {
            backgroundColor: emphasized ? (isDark ? c.solidShadow : c.primary) : colors.shadow,
            borderColor: emphasized ? c.primary : colors.border,
            transform: [{ translateX: shadowOffset }, { translateY: shadowOffset }],
          },
        ]}
      />
      <View
        style={[
          styles.cardFace,
          {
            backgroundColor: emphasized ? c.primaryContainer : colors.face,
            borderColor: emphasized ? c.primary : colors.border,
            borderWidth: emphasized ? CARD_BORDER + 1 : CARD_BORDER,
          },
          faceStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

function BrutalistCard({
  isDark,
  emphasized = false,
  children,
}: {
  isDark: boolean;
  emphasized?: boolean;
  children: ReactNode;
}) {
  return (
    <BrutalistCardShell isDark={isDark} emphasized={emphasized}>
      {children}
    </BrutalistCardShell>
  );
}

function TimelineSectionDot({
  isCurrent,
  isPast,
  isDark,
  palette,
}: {
  isCurrent: boolean;
  isPast: boolean;
  isDark: boolean;
  palette: MealSlotTimelinePalette;
}) {
  const pageBg = isDark ? RetroFlatColors.dark.bg : RetroFlatColors.light.bg;
  const filled = isCurrent || isPast;

  return (
    <View
      style={[
        styles.sectionDot,
        filled && styles.sectionDotCurrent,
        {
          borderColor: filled ? palette.ink : palette.line,
          backgroundColor: filled ? palette.ink : pageBg,
          zIndex: 2,
        },
      ]}
    />
  );
}

function resolveSpineGaugeFrame(
  sections: readonly { slot: DayMealSlot; progressToNext?: number }[],
  bounds: Partial<Record<DayMealSlot, MealSlotSectionBounds>>,
  currentIndex: number,
): { top: number; height: number } | null {
  if (currentIndex < 0 || sections.length === 0) return null;
  const firstBounds = bounds[sections[0]!.slot];
  const current = sections[currentIndex];
  const currentBounds = current ? bounds[current.slot] : undefined;
  if (!firstBounds || !current || !currentBounds) return null;

  const dotOffset = SECTION_DOT_TOP + CURRENT_DOT_SIZE / 2;
  const top = firstBounds.y + dotOffset;
  const currentDotY = currentBounds.y + dotOffset;
  const progress = Math.max(0, Math.min(1, current.progressToNext ?? 0));

  let endY = currentDotY;
  const next = sections[currentIndex + 1];
  if (next) {
    const nextBounds = bounds[next.slot];
    if (nextBounds) {
      const nextDotY = nextBounds.y + SECTION_DOT_TOP + DOT_SIZE / 2;
      endY = currentDotY + (nextDotY - currentDotY) * progress;
    } else {
      endY = currentDotY + Math.max(0, currentBounds.height - dotOffset) * progress;
    }
  } else {
    endY = currentDotY + Math.max(0, currentBounds.height - dotOffset) * progress;
  }

  return { top, height: Math.max(0, endY - top) };
}

function RoutineRowSettingsButton({
  label,
  isDark,
  onPress,
}: {
  label: string;
  isDark: boolean;
  onPress: () => void;
}) {
  const colors = cardColors(isDark);
  const primary = isDark ? RetroFlatColors.dark.primary : PrimaryColor.rgb;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 상세 설정`}
      hitSlop={10}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.settingsBtn,
        {
          borderColor: colors.border,
          backgroundColor: colors.face,
        },
      ]}>
      <IconSymbol name="slider.horizontal.3" size={13} color={isDark ? '#FAFAFA' : primary} />
    </Pressable>
  );
}

function CheckboxRowContent({
  item,
  palette,
  isDark,
  completed,
  labelHidden = false,
  pressed = false,
  onToggleComplete,
}: {
  item: MealSlotTimelineItem;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  completed: boolean;
  labelHidden?: boolean;
  pressed?: boolean;
  onToggleComplete?: () => void;
}) {
  const pressedLabelColor = isDark ? RetroFlatColors.dark.primary : RetroFlatColors.light.text;

  return (
    <>
      <CompletionRadioButton
        checked={completed}
        isDark={isDark}
        shape="square"
        checkedColor={isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT}
        accessibilityLabel={completed ? `${item.label} 완료 취소` : `${item.label} 완료`}
        onPress={onToggleComplete}
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
              !completed && pressed && { color: pressedLabelColor },
            ]}
            numberOfLines={2}>
            {item.label}
          </ThemedText>
        </>
      )}
    </>
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
  return (
    <View style={styles.checkboxRowOuter}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleComplete?.();
        }}
        style={({ pressed: rowPressed }) => [
          styles.checkboxRow,
          styles.checkboxRowFlex,
          rowPressed && styles.pressed,
        ]}>
        {({ pressed }) => (
          <CheckboxRowContent
            item={item}
            palette={palette}
            isDark={isDark}
            completed={completed}
            labelHidden={labelHidden}
            pressed={pressed}
            onToggleComplete={onToggleComplete}
          />
        )}
      </Pressable>
      {onOpenSettings ? (
        <RoutineRowSettingsButton
          label={item.label}
          isDark={isDark}
          onPress={onOpenSettings}
        />
      ) : null}
    </View>
  );
}

function ReorderableCheckboxRow({
  item,
  palette,
  isDark,
  completed,
  labelHidden = false,
  reorderEnabled,
  fromSlot,
  timelineTrackRef,
  onToggleComplete,
  onOpenSettings,
  onReorderDragActiveChange,
  onRowDragEnd,
}: {
  item: MealSlotTimelineItem;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  completed: boolean;
  labelHidden?: boolean;
  reorderEnabled: boolean;
  fromSlot: DayMealSlot;
  timelineTrackRef: RefObject<RNView | null>;
  onToggleComplete?: () => void;
  onOpenSettings?: () => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onRowDragEnd?: (
    itemKey: string,
    translationY: number,
    fromSlot: DayMealSlot,
    rowAnchorY: number,
  ) => void;
}) {
  const rowRef = useRef<RNView>(null);
  const rowAnchorYRef = useRef(0);
  const itemKeyRef = useRef(item.key);
  const fromSlotRef = useRef(fromSlot);
  const onReorderDragActiveChangeRef = useRef(onReorderDragActiveChange);
  const onRowDragEndRef = useRef(onRowDragEnd);
  const onToggleCompleteRef = useRef(onToggleComplete);
  const measureRowAnchorRef = useRef<() => void>(() => {});
  const translateY = useSharedValue(0);
  const reorderDragging = useSharedValue(0);

  itemKeyRef.current = item.key;
  fromSlotRef.current = fromSlot;
  onReorderDragActiveChangeRef.current = onReorderDragActiveChange;
  onRowDragEndRef.current = onRowDragEnd;
  onToggleCompleteRef.current = onToggleComplete;

  const measureRowAnchor = useCallback(() => {
    const row = rowRef.current;
    const track = timelineTrackRef.current;
    if (!row || !track) return;
    row.measureLayout(track, (_x, y, _w, h) => {
      rowAnchorYRef.current = y + h / 2;
    });
  }, [timelineTrackRef]);

  measureRowAnchorRef.current = measureRowAnchor;

  const gestureBridgeRef = useRef({
    start: () => {},
    end: (_translationY: number) => {},
    clear: () => {},
  });

  gestureBridgeRef.current = {
    start: () => {
      measureRowAnchorRef.current();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onReorderDragActiveChangeRef.current?.(itemKeyRef.current, true);
    },
    end: (translationYValue: number) => {
      onRowDragEndRef.current?.(
        itemKeyRef.current,
        translationYValue,
        fromSlotRef.current,
        rowAnchorYRef.current,
      );
    },
    clear: () => {
      onReorderDragActiveChangeRef.current?.(itemKeyRef.current, false);
    },
  };

  const bridgeReorderStart = useCallback(() => {
    gestureBridgeRef.current.start();
  }, []);

  const bridgeReorderEnd = useCallback((translationYValue: number) => {
    gestureBridgeRef.current.end(translationYValue);
  }, []);

  const bridgeReorderClear = useCallback(() => {
    gestureBridgeRef.current.clear();
  }, []);

  const reorderGesture = useMemo(() => {
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
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        runOnJS(bridgeReorderEnd)(e.translationY);
      })
      .onFinalize(() => {
        translateY.value = withSpring(0, REORDER_SPRING);
        reorderDragging.value = 0;
        runOnJS(bridgeReorderClear)();
      });
  }, [bridgeReorderClear, bridgeReorderEnd, bridgeReorderStart, reorderDragging, reorderEnabled, translateY]);

  const rowAnimatedStyle = useAnimatedStyle(() => {
    const dragging = reorderDragging.value > 0;
    return {
      transform: [{ translateY: translateY.value }, { scale: dragging ? 1.015 : 1 }],
      zIndex: dragging ? 600 : 0,
      elevation: dragging ? 24 : 0,
      shadowOpacity: 0,
    };
  });

  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: reorderDragging.value ? 0.45 : 0,
  }));

  const settingsButton = onOpenSettings ? (
    <RoutineRowSettingsButton
      label={item.label}
      isDark={isDark}
      onPress={onOpenSettings}
    />
  ) : null;

  if (!reorderGesture) {
    return (
      <View ref={rowRef} collapsable={false} style={styles.reorderRowShell}>
        <CheckboxRow
          item={item}
          palette={palette}
          isDark={isDark}
          completed={completed}
          labelHidden={labelHidden}
          onToggleComplete={onToggleComplete}
          onOpenSettings={onOpenSettings}
        />
      </View>
    );
  }

  return (
    <View ref={rowRef} collapsable={false} style={styles.reorderRowShell}>
      <Reanimated.View style={[styles.reorderDragShell, rowAnimatedStyle]}>
        <Reanimated.View
          pointerEvents="none"
          style={[styles.reorderPlaceholder, placeholderStyle]}
        />
        <View style={styles.checkboxRowOuter}>
          <GestureDetector gesture={reorderGesture}>
            <View
              style={[styles.checkboxRow, styles.checkboxRowFlex]}
              accessibilityRole="adjustable"
              accessibilityLabel={`${item.label}, 길게 눌러 순서를 바꿀 수 있어요`}>
              <CheckboxRowContent
                item={item}
                palette={palette}
                isDark={isDark}
                completed={completed}
                labelHidden={labelHidden}
                onToggleComplete={() => onToggleCompleteRef.current?.()}
              />
            </View>
          </GestureDetector>
          {settingsButton}
        </View>
      </Reanimated.View>
    </View>
  );
}

function SectionSlotCard<T extends MealSlotTimelineItem>({
  section,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled,
  timelineTrackRef,
  onPressAddRoutine,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onRowDragEnd,
}: {
  section: MealSlotTimelineSection<T>;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isItemCompleted: (key: string) => boolean;
  reorderEnabled: boolean;
  timelineTrackRef: RefObject<RNView | null>;
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onRowDragEnd?: (
    itemKey: string,
    translationY: number,
    fromSlot: DayMealSlot,
    rowAnchorY: number,
  ) => void;
}) {
  const { items } = section;

  if (items.length === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="루틴 연결"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPressAddRoutine(section.slot);
        }}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <BrutalistCardShell isDark={isDark} faceStyle={styles.emptyCardFace}>
          <IconSymbol name="plus" size={15} color={palette.muted} />
          <ThemedText
            style={[
              styles.emptyCardLabel,
              cityPopFont('600'),
              { color: palette.muted },
            ]}>
            루틴 연결
          </ThemedText>
        </BrutalistCardShell>
      </Pressable>
    );
  }

  return (
    <BrutalistCard isDark={isDark}>
      <View style={styles.cardBody}>
        <View style={styles.checkboxList}>
          {items.map((item, index) => (
            <ReorderableCheckboxRow
              key={`${item.key}#${index}`}
              item={item}
              palette={palette}
              isDark={isDark}
              completed={isItemCompleted(item.key)}
              reorderEnabled={reorderEnabled}
              fromSlot={section.slot}
              timelineTrackRef={timelineTrackRef}
              onToggleComplete={() => onToggleItemComplete(item.key)}
              onOpenSettings={onOpenItemSettings ? () => onOpenItemSettings(item.key) : undefined}
              onReorderDragActiveChange={onReorderDragActiveChange}
              onRowDragEnd={onRowDragEnd}
            />
          ))}
        </View>

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
  isPast,
  isFuture,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled,
  timelineTrackRef,
  onSectionLayout,
  onPressAddRoutine,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onRowDragEnd,
}: {
  section: MealSlotTimelineSection<T>;
  isPast: boolean;
  isFuture: boolean;
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  isItemCompleted: (key: string) => boolean;
  reorderEnabled: boolean;
  timelineTrackRef: RefObject<RNView | null>;
  onSectionLayout: (slot: DayMealSlot, y: number, height: number) => void;
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onRowDragEnd?: (
    itemKey: string,
    translationY: number,
    fromSlot: DayMealSlot,
    rowAnchorY: number,
  ) => void;
}) {
  const badge = slotBadgeTheme(section.slot, isDark);
  const isCurrent = section.isCurrent;
  const timeEmphasis = isCurrent || isPast;

  return (
    <View
      style={[
        styles.sectionBlock,
        isFuture && styles.sectionBlockInactive,
      ]}
      collapsable={false}
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        onSectionLayout(section.slot, y, height);
      }}>
      <View style={styles.spineCol}>
        <TimelineSectionDot
          isCurrent={isCurrent}
          isPast={isPast}
          isDark={isDark}
          palette={palette}
        />
      </View>

      <View style={styles.sectionContent}>
        <View style={styles.badgeRow}>
          <View style={styles.badgeRowLeft}>
            <View
              style={[
                styles.slotBadge,
                {
                  backgroundColor: badge.bg,
                  borderColor: '#000000',
                },
              ]}>
              <IconSymbol
                name={DAY_MEAL_SLOT_ICON[section.slot] as 'moon.fill'}
                size={12}
                color={dayMealSlotIconColor(section.slot, isDark)}
                weight="semibold"
              />
              <ThemedText
                style={[styles.slotBadgeLabel, cityPopFont('800'), { color: badge.label }]}
                numberOfLines={1}>
                {section.title}
              </ThemedText>
            </View>
          </View>
          <ThemedText
            style={[
              styles.slotTimeLabel,
              cityPopFont('800'),
              { color: timeEmphasis ? palette.ink : palette.muted },
            ]}>
            {formatHhmmClockKo(section.hintTime)}
          </ThemedText>
        </View>

        <SectionSlotCard
          section={section}
          palette={palette}
          isDark={isDark}
          isItemCompleted={isItemCompleted}
          reorderEnabled={reorderEnabled}
          timelineTrackRef={timelineTrackRef}
          onPressAddRoutine={onPressAddRoutine}
          onToggleItemComplete={onToggleItemComplete}
          onOpenItemSettings={onOpenItemSettings}
          onReorderDragActiveChange={onReorderDragActiveChange}
          onRowDragEnd={onRowDragEnd}
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
  onPressAddRoutine: (slot: DayMealSlot) => void;
  onToggleItemComplete: (key: string) => void;
  onOpenItemSettings?: (key: string) => void;
  onReorderDragActiveChange?: (key: string, active: boolean) => void;
  onReorderItemDragEnd?: (
    key: string,
    translationY: number,
    fromSlot: DayMealSlot,
    targetSlot: DayMealSlot,
  ) => void;
};

export function MealSlotTimelineView<T extends MealSlotTimelineItem>({
  sections,
  palette,
  isDark,
  isItemCompleted,
  reorderEnabled = false,
  onPressAddRoutine,
  onToggleItemComplete,
  onOpenItemSettings,
  onReorderDragActiveChange,
  onReorderItemDragEnd,
}: Props<T>) {
  const timelineTrackRef = useRef<RNView>(null);
  const sectionBoundsRef = useRef<Partial<Record<DayMealSlot, MealSlotSectionBounds>>>({});
  const [sectionBounds, setSectionBounds] = useState<
    Partial<Record<DayMealSlot, MealSlotSectionBounds>>
  >({});

  const handleSectionLayout = useCallback((slot: DayMealSlot, y: number, height: number) => {
    sectionBoundsRef.current[slot] = { y, height };
    setSectionBounds((prev) => {
      const existing = prev[slot];
      if (existing && existing.y === y && existing.height === height) return prev;
      return { ...prev, [slot]: { y, height } };
    });
  }, []);

  const handleRowDragEnd = useCallback(
    (itemKey: string, translationY: number, fromSlot: DayMealSlot, rowAnchorY: number) => {
      if (!onReorderItemDragEnd) return;
      const targetSlot = resolveMealSlotFromTimelineY(
        rowAnchorY + translationY,
        sectionBoundsRef.current,
        fromSlot,
      );
      onReorderItemDragEnd(itemKey, translationY, fromSlot, targetSlot);
    },
    [onReorderItemDragEnd],
  );

  const currentIndex = useMemo(
    () => sections.findIndex((section) => section.isCurrent),
    [sections],
  );

  const gaugeFrame = useMemo(
    () => resolveSpineGaugeFrame(sections, sectionBounds, currentIndex),
    [sections, sectionBounds, currentIndex],
  );

  return (
    <View style={styles.root}>
      <View ref={timelineTrackRef} style={styles.timelineTrack} collapsable={false}>
        <View style={[styles.spineLineAbsolute, { backgroundColor: palette.line }]} />
        {gaugeFrame && gaugeFrame.height > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.spineGaugeAbsolute,
              {
                backgroundColor: palette.ink,
                top: gaugeFrame.top,
                height: gaugeFrame.height,
              },
            ]}
          />
        ) : null}

        {sections.map((section, index) => {
          const isPast = currentIndex >= 0 && index < currentIndex;
          const isFuture = currentIndex >= 0 && index > currentIndex;
          return (
            <TimelineSectionBlock
              key={section.slot}
              section={section}
              isPast={isPast}
              isFuture={isFuture}
              palette={palette}
              isDark={isDark}
              isItemCompleted={isItemCompleted}
              reorderEnabled={reorderEnabled}
              timelineTrackRef={timelineTrackRef}
              onSectionLayout={handleSectionLayout}
              onPressAddRoutine={onPressAddRoutine}
              onToggleItemComplete={onToggleItemComplete}
              onOpenItemSettings={onOpenItemSettings}
              onReorderDragActiveChange={onReorderDragActiveChange}
              onRowDragEnd={handleRowDragEnd}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: 4,
    overflow: 'visible',
  },
  timelineTrack: {
    position: 'relative',
    gap: CityPopSpacing.lg,
    overflow: 'visible',
  },
  spineLineAbsolute: {
    position: 'absolute',
    left: timelineAxisLeft,
    top: timelineSpineTop,
    bottom: 32,
    width: SPINE_WIDTH,
    opacity: 0.4,
    zIndex: 0,
  },
  spineGaugeAbsolute: {
    position: 'absolute',
    left: timelineAxisLeft - 1,
    width: SPINE_WIDTH + 2,
    borderRadius: 1,
    zIndex: 1,
  },
  sectionBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  sectionBlockInactive: {
    opacity: 0.88,
  },
  spineCol: {
    width: SPINE_COL_WIDTH,
    alignItems: 'center',
    paddingTop: SECTION_DOT_TOP,
    zIndex: 2,
  },
  sectionDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: SPINE_WIDTH,
  },
  sectionDotCurrent: {
    width: CURRENT_DOT_SIZE,
    height: CURRENT_DOT_SIZE,
    borderRadius: CURRENT_DOT_SIZE / 2,
  },
  sectionContent: {
    flex: 1,
    minWidth: 0,
    gap: CityPopSpacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badgeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: THIN_BORDER,
  },
  slotBadgeLabel: {
    fontSize: 10,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  slotTimeLabel: {
    fontSize: 10,
    letterSpacing: -0.1,
  },
  cardShell: {
    position: 'relative',
    overflow: 'visible',
  },
  cardShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: CARD_BORDER,
    borderRadius: CARD_RADIUS,
  },
  cardFace: {
    position: 'relative',
    zIndex: 1,
    borderWidth: CARD_BORDER,
    borderRadius: CARD_RADIUS,
    overflow: 'visible',
  },
  cardBody: {
    padding: CityPopSpacing.md,
    gap: CityPopSpacing.sm,
    overflow: 'visible',
  },
  routineIconBadgeShell: {
    position: 'relative',
    flexShrink: 0,
  },
  routineIconBadgeShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  routineIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  checkboxList: {
    gap: 12,
    overflow: 'visible',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CityPopSpacing.sm,
  },
  checkboxRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  checkboxRowFlex: {
    flex: 1,
    minWidth: 0,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: THIN_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reorderRowShell: {
    position: 'relative',
    overflow: 'visible',
    minHeight: 36,
  },
  reorderDragShell: {
    position: 'relative',
    overflow: 'visible',
    width: '100%',
  },
  reorderPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  checkboxLabelDone: {
    textDecorationLine: 'line-through',
    opacity: 0.4,
  },
  emptyCardFace: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: CityPopSpacing.md,
  },
  emptyCardLabel: {
    fontSize: 12,
  },
  addLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  addLinkLabel: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.72,
  },
});
