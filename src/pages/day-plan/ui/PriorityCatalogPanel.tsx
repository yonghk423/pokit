import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  formatMinuteOfDayKo,
  isNonDeletableCatalogKey,
  resolveCategoryCatalogIcon,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { DAY_MEAL_SLOT_LABEL, type CustomCatalogGroup, type CustomFlowCatalogEntry, type DayMealSlot } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { getPickerCategoryLabel, PICKER_CATEGORIES, PRIMARY } from '../lib/dayPlanEditorShared';
import {
  buildPriorityCatalogSections,
  filterCatalogPickerCategories,
  type PickerCategoryItem,
  type PriorityCatalogGroupSection,
} from '../lib/priorityCatalogSections';
import {
  CatalogRowMealSlotChips,
  CatalogRowMealSlotSelectedIcons,
  mealSlotPickerBtnWidth,
} from './CatalogRowMealSlotChips';
import { CatalogRowSpineTimePanel } from './CatalogRowSpineTimePanel';

export type PriorityCatalogEditorial = {
  ink: string;
  muted: string;
  line: string;
};

const MEAL_SLOT_PANEL_HEIGHT = 56;

function CatalogListRow({
  categoryKey,
  icon,
  label,
  subtitle,
  selected,
  ink,
  muted,
  line,
  isDark,
  isFocusStarted,
  onAddPress,
  onOpenSettings,
  onMoveGroup,
  onDeleteItem,
  showMealSlotPicker,
  selectedMealSlots,
  mealSlotPickerDisabled,
  isMealSlotExpanded,
  onToggleMealSlotExpand,
  onToggleMealSlot,
  showSpineTimePicker,
  spineStartMinutes,
  spineEndMinutes,
  spineTimePickerDisabled,
  isSpineTimeExpanded,
  onToggleSpineTimeExpand,
  onChangeSpineTime,
  priorityStart,
  priorityEnd,
  manageOnly = false,
}: {
  categoryKey: string;
  icon: string;
  label: string;
  subtitle?: string | null;
  selected: boolean;
  ink: string;
  muted: string;
  line: string;
  isDark: boolean;
  isFocusStarted: boolean;
  onAddPress: () => void;
  onOpenSettings: () => void;
  onMoveGroup?: () => void;
  onDeleteItem?: () => void;
  showMealSlotPicker?: boolean;
  selectedMealSlots?: readonly DayMealSlot[];
  mealSlotPickerDisabled?: boolean;
  isMealSlotExpanded?: boolean;
  onToggleMealSlotExpand?: () => void;
  onToggleMealSlot?: (slot: DayMealSlot) => void;
  showSpineTimePicker?: boolean;
  spineStartMinutes?: number;
  spineEndMinutes?: number;
  spineTimePickerDisabled?: boolean;
  isSpineTimeExpanded?: boolean;
  onToggleSpineTimeExpand?: () => void;
  onChangeSpineTime?: (startMinutes: number, endMinutes: number) => void;
  priorityStart?: string;
  priorityEnd?: string;
  manageOnly?: boolean;
}) {
  const settingsBorder = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)';
  const settingsBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const settingsLocked = !manageOnly && isFocusStarted && selected;
  const shouldPulse = !manageOnly && Boolean(selected && isFocusStarted);
  const pulse = useRef(new Animated.Value(1)).current;

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

  const labelColor = manageOnly ? ink : selected ? ink : muted;
  const categoryIconColor = activeIconColorByCategory(categoryKey);
  const iconColor = shouldPulse
    ? categoryIconColor
    : manageOnly
      ? categoryIconColor
      : selected
        ? categoryIconColor
        : muted;

  const mealSlotActive = Boolean(selectedMealSlots && selectedMealSlots.length > 0);
  const mealSlotIconHighlighted = mealSlotActive || isMealSlotExpanded;
  const expandProgress = useSharedValue(isMealSlotExpanded ? 1 : 0);

  useEffect(() => {
    expandProgress.value = withTiming(isMealSlotExpanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [expandProgress, isMealSlotExpanded]);

  const mealSlotPanelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    maxHeight: expandProgress.value * MEAL_SLOT_PANEL_HEIGHT,
    transform: [
      { translateY: (1 - expandProgress.value) * -8 },
      { scale: 0.96 + expandProgress.value * 0.04 },
    ],
  }));

  const mealSlotIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + expandProgress.value * 0.08 }],
  }));

  const spineTimeIconHighlighted = selected || Boolean(isSpineTimeExpanded);
  const spineExpandProgress = useSharedValue(isSpineTimeExpanded ? 1 : 0);

  useEffect(() => {
    spineExpandProgress.value = withTiming(isSpineTimeExpanded ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isSpineTimeExpanded, spineExpandProgress]);

  const spineTimeIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + spineExpandProgress.value * 0.08 }],
  }));

  return (
    <View style={[styles.catalogRowWrap, { borderBottomColor: line }]}>
      <View style={styles.catalogRow}>
        <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: manageOnly ? undefined : selected }}
        accessibilityLabel={
          manageOnly
            ? subtitle
              ? `${label}. ${subtitle}, 설정 열기`
              : `${label}, 설정 열기`
            : subtitle
              ? `${label}. ${subtitle}, 우선 순위에 ${selected ? '담김' : '담기'}`
              : `${label}, 우선 순위에 ${selected ? '담김' : '담기'}`
        }
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (manageOnly) {
            onOpenSettings();
            return;
          }
          onAddPress();
        }}
        style={styles.catalogRowMainHit}>
        <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
          <IconSymbol
            key={`${categoryKey}-${icon}-${iconColor}`}
            name={icon as any}
            size={22}
            color={iconColor}
          />
        </Animated.View>
        <View style={styles.catalogRowTextCol}>
          <ThemedText
            style={[styles.catalogRowLabel, { color: labelColor }]}
            lightColor={labelColor}
            darkColor={labelColor}
            numberOfLines={1}>
            {label}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              style={[styles.catalogRowSubtitle, { color: muted }]}
              lightColor={muted}
              darkColor={muted}
              numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.catalogRowActions}>
        {onDeleteItem ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} 삭제`}
            hitSlop={10}
            disabled={settingsLocked}
            onPress={() => {
              if (settingsLocked) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDeleteItem();
            }}
            style={[
              styles.catalogSettingsBtn,
              {
                borderColor: settingsLocked
                  ? isDark
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.08)'
                  : settingsBorder,
                backgroundColor: settingsLocked
                  ? isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.02)'
                  : settingsBg,
                opacity: settingsLocked ? 0.55 : 1,
              },
            ]}>
            <IconSymbol
              name="trash"
              size={15}
              color={settingsLocked ? muted : isDark ? '#FAFAFA' : PRIMARY}
            />
          </Pressable>
        ) : null}
        {onMoveGroup ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} 묶음 옮기기`}
            hitSlop={10}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMoveGroup();
            }}
            style={[
              styles.catalogSettingsBtn,
              {
                borderColor: settingsBorder,
                backgroundColor: settingsBg,
              },
            ]}>
            <IconSymbol name="arrow.left.arrow.right" size={15} color={isDark ? '#FAFAFA' : PRIMARY} />
          </Pressable>
        ) : null}
        {showMealSlotPicker && !manageOnly && onToggleMealSlotExpand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: mealSlotIconHighlighted,
              expanded: isMealSlotExpanded,
              disabled: mealSlotPickerDisabled,
            }}
            accessibilityLabel={
              mealSlotActive
                ? `${label} 시간대 ${selectedMealSlots!.map((slot) => DAY_MEAL_SLOT_LABEL[slot]).join(', ')}`
                : `${label} 시간대 선택`
            }
            disabled={mealSlotPickerDisabled}
            hitSlop={mealSlotPickerDisabled ? 0 : 10}
            onPress={() => {
              if (mealSlotPickerDisabled) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleMealSlotExpand();
            }}
            style={[
              styles.catalogSettingsBtn,
              {
                width: mealSlotPickerBtnWidth(selectedMealSlots ?? []),
                borderColor: mealSlotIconHighlighted ? ink : settingsBorder,
                backgroundColor: mealSlotIconHighlighted
                  ? isDark
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.06)'
                  : settingsBg,
                opacity: mealSlotPickerDisabled ? 0.55 : 1,
              },
            ]}>
            <Reanimated.View style={mealSlotIconAnimatedStyle}>
              <CatalogRowMealSlotSelectedIcons
                selectedSlots={selectedMealSlots ?? []}
                color={
                  mealSlotIconHighlighted
                    ? ink
                    : mealSlotPickerDisabled
                      ? muted
                      : isDark
                        ? '#FAFAFA'
                        : PRIMARY
                }
                mutedColor={mealSlotPickerDisabled ? muted : isDark ? '#FAFAFA' : PRIMARY}
                size={15}
                compactSize={9}
              />
            </Reanimated.View>
          </Pressable>
        ) : null}
        {showSpineTimePicker && !manageOnly && onToggleSpineTimeExpand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: spineTimeIconHighlighted,
              expanded: isSpineTimeExpanded,
              disabled: spineTimePickerDisabled,
            }}
            accessibilityLabel={
              spineStartMinutes != null && spineEndMinutes != null
                ? `${label} 시간 ${formatMinuteOfDayKo(spineStartMinutes)}~${formatMinuteOfDayKo(spineEndMinutes)}`
                : `${label} 시간 선택`
            }
            disabled={spineTimePickerDisabled}
            hitSlop={spineTimePickerDisabled ? 0 : 10}
            onPress={() => {
              if (spineTimePickerDisabled) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleSpineTimeExpand();
            }}
            style={[
              styles.catalogSettingsBtn,
              {
                borderColor: spineTimeIconHighlighted ? ink : settingsBorder,
                backgroundColor: spineTimeIconHighlighted
                  ? isDark
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.06)'
                  : settingsBg,
                opacity: spineTimePickerDisabled ? 0.55 : 1,
              },
            ]}>
            <Reanimated.View style={spineTimeIconAnimatedStyle}>
              <IconSymbol
                name="clock.fill"
                size={15}
                color={
                  spineTimeIconHighlighted
                    ? ink
                    : spineTimePickerDisabled
                      ? muted
                      : isDark
                        ? '#FAFAFA'
                        : PRIMARY
                }
              />
            </Reanimated.View>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: settingsLocked }}
          accessibilityLabel={
            settingsLocked
              ? `${label} 목표 상세 설정, 집중 실행 중에는 변경할 수 없어요`
              : `${label} 목표 상세 설정`
          }
          disabled={settingsLocked}
          hitSlop={settingsLocked ? 0 : 10}
          onPress={() => {
            if (settingsLocked) return;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSettings();
          }}
          style={[
            styles.catalogSettingsBtn,
            {
              borderColor: settingsLocked
                ? isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.08)'
                : settingsBorder,
              backgroundColor: settingsLocked
                ? isDark
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.02)'
                : settingsBg,
              opacity: settingsLocked ? 0.55 : 1,
            },
          ]}>
          <IconSymbol
            name={settingsLocked ? 'lock.fill' : 'slider.horizontal.3'}
            size={settingsLocked ? 14 : 16}
            color={settingsLocked ? muted : isDark ? '#FAFAFA' : PRIMARY}
          />
        </Pressable>
        {!manageOnly ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            selected
              ? `${label} 우선 순위에서 빼기`
              : `${label} 우선 순위에 담기`
          }
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddPress();
          }}
          style={styles.catalogAddHit}>
          {selected ? (
            <IconSymbol name="minus.circle.fill" size={22} color={categoryIconColor} />
          ) : (
            <IconSymbol name="plus.circle" size={22} color={muted} />
          )}
        </Pressable>
        ) : null}
      </View>
      </View>
      {showMealSlotPicker && !manageOnly && onToggleMealSlot ? (
        <Reanimated.View
          pointerEvents={isMealSlotExpanded ? 'auto' : 'none'}
          style={[
            styles.mealSlotPanel,
            mealSlotPanelAnimatedStyle,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
              borderTopColor: line,
            },
          ]}>
          <CatalogRowMealSlotChips
            selectedSlots={selectedMealSlots ?? []}
            ink={ink}
            muted={muted}
            line={line}
            isDark={isDark}
            disabled={mealSlotPickerDisabled}
            onToggleSlot={onToggleMealSlot}
          />
        </Reanimated.View>
      ) : null}
      {showSpineTimePicker && !manageOnly && onChangeSpineTime && priorityStart && priorityEnd && isSpineTimeExpanded ? (
        <View
          style={[
            styles.spineTimePanel,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
            },
          ]}>
          <CatalogRowSpineTimePanel
            startMinutes={spineStartMinutes ?? 9 * 60}
            endMinutes={spineEndMinutes ?? 9 * 60 + 30}
            ink={ink}
            muted={muted}
            line={line}
            isDark={isDark}
            disabled={spineTimePickerDisabled}
            priorityStart={priorityStart}
            priorityEnd={priorityEnd}
            onScheduleChange={onChangeSpineTime}
          />
        </View>
      ) : null}
    </View>
  );
}

function CatalogSectionHeader({
  title,
  subtitle,
  ink,
  muted,
  trailing,
}: {
  title: string;
  subtitle: string;
  ink: string;
  muted: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <View style={styles.sectionHeaderTop}>
        <View style={styles.sectionHeaderTextCol}>
          <ThemedText style={[styles.sectionTitle, { color: ink }]}>{title}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: muted }]}>{subtitle}</ThemedText>
        </View>
        {trailing ? <View style={styles.sectionHeaderTrailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

function resolveCatalogRowMealSlots(
  key: string,
  inOrder: boolean,
  slotsByKey: Record<string, DayMealSlot[]>,
  fallbackSlot: DayMealSlot,
  overridesByKey: Record<string, DayMealSlot> = {},
): DayMealSlot[] {
  if (!inOrder) {
    const override = overridesByKey[key];
    return override ? [override] : [];
  }
  const explicit = slotsByKey[key];
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;
  return [fallbackSlot];
}

function renderRows(
  cats: PickerCategoryItem[],
  editorial: PriorityCatalogEditorial,
  isDark: boolean,
  priorityCategoryOrder: string[],
  isFocusStarted: boolean,
  onCatalogTap: (key: string) => void,
  onOpenCategorySettings: (key: string) => void,
  onMoveCustomFlow?: (key: string, label: string) => void,
  onDeleteCatalogItem?: (key: string, label: string) => void,
  sectionsCatalogOptions?: {
    prioritySectionsMealSlots: Record<string, DayMealSlot[]>;
    priorityMealSlotOverrides: Record<string, DayMealSlot>;
    defaultMealSlot: DayMealSlot;
    expandedMealSlotKey: string | null;
    onToggleMealSlotExpand: (categoryKey: string) => void;
    onToggleCatalogMealSlot: (categoryKey: string, slot: DayMealSlot) => void;
  },
  spineCatalogOptions?: {
    priorityStart: string;
    priorityEnd: string;
    expandedSpineTimeKey: string | null;
    onToggleSpineTimeExpand: (categoryKey: string) => void;
    onChangeSpineTime: (categoryKey: string, startMinutes: number, endMinutes: number) => void;
    resolveSpineSchedule: (categoryKey: string) => {
      startMinutes: number;
      endMinutes: number;
    };
  },
  manageOnly = false,
) {
  return cats.map((cat) => {
    const selected = priorityCategoryOrder.includes(cat.key);
    const slotPickerLocked = isFocusStarted && selected;
    const spineSchedule = spineCatalogOptions?.resolveSpineSchedule(cat.key);
    return (
    <CatalogListRow
      key={cat.key}
      categoryKey={cat.key}
      icon={cat.icon}
      label={cat.label}
      subtitle={null}
      selected={selected}
      ink={editorial.ink}
      muted={editorial.muted}
      line={editorial.line}
      isDark={isDark}
      isFocusStarted={isFocusStarted}
      onAddPress={() => onCatalogTap(cat.key)}
      onOpenSettings={() => onOpenCategorySettings(cat.key)}
      onMoveGroup={
        onMoveCustomFlow ? () => onMoveCustomFlow(cat.key, cat.label) : undefined
      }
      onDeleteItem={
        onDeleteCatalogItem && !isNonDeletableCatalogKey(cat.key)
          ? () => onDeleteCatalogItem(cat.key, cat.label)
          : undefined
      }
      showMealSlotPicker={Boolean(sectionsCatalogOptions)}
      selectedMealSlots={
        sectionsCatalogOptions
          ? resolveCatalogRowMealSlots(
              cat.key,
              selected,
              sectionsCatalogOptions.prioritySectionsMealSlots,
              sectionsCatalogOptions.defaultMealSlot,
              sectionsCatalogOptions.priorityMealSlotOverrides,
            )
          : undefined
      }
      mealSlotPickerDisabled={slotPickerLocked}
      isMealSlotExpanded={sectionsCatalogOptions?.expandedMealSlotKey === cat.key}
      onToggleMealSlotExpand={
        sectionsCatalogOptions
          ? () => sectionsCatalogOptions.onToggleMealSlotExpand(cat.key)
          : undefined
      }
      onToggleMealSlot={
        sectionsCatalogOptions
          ? (slot) => sectionsCatalogOptions.onToggleCatalogMealSlot(cat.key, slot)
          : undefined
      }
      showSpineTimePicker={Boolean(spineCatalogOptions)}
      spineStartMinutes={spineSchedule?.startMinutes}
      spineEndMinutes={spineSchedule?.endMinutes}
      spineTimePickerDisabled={slotPickerLocked}
      isSpineTimeExpanded={spineCatalogOptions?.expandedSpineTimeKey === cat.key}
      onToggleSpineTimeExpand={
        spineCatalogOptions
          ? () => spineCatalogOptions.onToggleSpineTimeExpand(cat.key)
          : undefined
      }
      onChangeSpineTime={
        spineCatalogOptions
          ? (startMinutes, endMinutes) =>
              spineCatalogOptions.onChangeSpineTime(cat.key, startMinutes, endMinutes)
          : undefined
      }
      priorityStart={spineCatalogOptions?.priorityStart}
      priorityEnd={spineCatalogOptions?.priorityEnd}
      manageOnly={manageOnly}
    />
  );
  });
}

type Props = {
  editorial: PriorityCatalogEditorial;
  priorityCategoryOrder: string[];
  /** 집중 구간 시작 후 — 담긴 항목 아이콘 색·펄스 */
  isFocusStarted: boolean;
  onCatalogTap: (key: string) => void;
  onOpenCategorySettings: (categoryKey: string) => void;
  /** 저장된 사용자 플로우(picker용 메타) — 라벨/아이콘 해석에 사용 */
  customFlowPickerItems: PickerCategoryItem[];
  /** 사용자 플로우 ↔ 그룹 매핑(저장소) */
  customFlowEntries: CustomFlowCatalogEntry[];
  /** 사용자 정의 그룹 목록 */
  customGroups: CustomCatalogGroup[];
  isDark: boolean;
  /** 상위 묶음 — 이름 편집 시트 열기 */
  onRenameCustomGroup?: (groupKey: string, currentLabel: string, currentSubtitle: string) => void;
  /** 상위 묶음 — 삭제 확인 후 처리 */
  onDeleteCatalogGroup?: (groupKey: string, currentLabel: string) => void;
  /** 사용자 루틴 — 다른 상위 묶음으로 옮기기 */
  onMoveCustomFlow?: (categoryKey: string, label: string) => void;
  /** 담기 항목 — 삭제(사용자 플로우) 또는 목록에서 숨기기(표준) */
  onDeleteCatalogItem?: (categoryKey: string, label: string) => void;
  /** 시간대 보기 — 행별 구간 선택 */
  sectionsCatalogEnabled?: boolean;
  prioritySectionsMealSlots?: Record<string, DayMealSlot[]>;
  priorityMealSlotOverrides?: Record<string, DayMealSlot>;
  defaultMealSlot?: DayMealSlot;
  onToggleCatalogMealSlot?: (categoryKey: string, slot: DayMealSlot) => void;
  /** 타임라인 보기 — 행별 시작·종료 시각 */
  spineCatalogEnabled?: boolean;
  priorityStart?: string;
  priorityEnd?: string;
  resolveSpineSchedule?: (categoryKey: string) => {
    startMinutes: number;
    endMinutes: number;
  };
  onChangeCatalogSpineTime?: (
    categoryKey: string,
    startMinutes: number,
    endMinutes: number,
  ) => void;
  /** 담기·시간 설정 없이 루틴 목록만 관리 */
  manageOnly?: boolean;
};

function GroupSectionBlock({
  section,
  editorial,
  isDark,
  priorityCategoryOrder,
  isFocusStarted,
  onCatalogTap,
  onOpenCategorySettings,
  onRenameCustomGroup,
  onDeleteCatalogGroup,
  onMoveCustomFlow,
  onDeleteCatalogItem,
  isFirst,
  sectionsCatalogOptions,
  spineCatalogOptions,
  manageOnly = false,
}: {
  section: PriorityCatalogGroupSection;
  editorial: PriorityCatalogEditorial;
  isDark: boolean;
  priorityCategoryOrder: string[];
  isFocusStarted: boolean;
  onCatalogTap: (key: string) => void;
  onOpenCategorySettings: (key: string) => void;
  onRenameCustomGroup?: (groupKey: string, currentLabel: string, currentSubtitle: string) => void;
  onDeleteCatalogGroup?: (groupKey: string, currentLabel: string) => void;
  onMoveCustomFlow?: (categoryKey: string, label: string) => void;
  onDeleteCatalogItem?: (categoryKey: string, label: string) => void;
  isFirst: boolean;
  sectionsCatalogOptions?: {
    prioritySectionsMealSlots: Record<string, DayMealSlot[]>;
    priorityMealSlotOverrides: Record<string, DayMealSlot>;
    defaultMealSlot: DayMealSlot;
    expandedMealSlotKey: string | null;
    onToggleMealSlotExpand: (categoryKey: string) => void;
    onToggleCatalogMealSlot: (categoryKey: string, slot: DayMealSlot) => void;
  };
  spineCatalogOptions?: {
    priorityStart: string;
    priorityEnd: string;
    expandedSpineTimeKey: string | null;
    onToggleSpineTimeExpand: (categoryKey: string) => void;
    onChangeSpineTime: (categoryKey: string, startMinutes: number, endMinutes: number) => void;
    resolveSpineSchedule: (categoryKey: string) => {
      startMinutes: number;
      endMinutes: number;
    };
  };
  manageOnly?: boolean;
}) {
  const groupHeaderTrailing =
    onRenameCustomGroup || onDeleteCatalogGroup ? (
      <View style={styles.customGroupHeaderActions}>
        {onRenameCustomGroup ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="묶음 편집"
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRenameCustomGroup(
                section.groupKey,
                section.title,
                section.subtitle ?? '',
              );
            }}
            style={[
              styles.customGroupHeaderIconBtn,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
            ]}>
            <IconSymbol name="pencil" size={16} color={isDark ? '#FAFAFA' : PRIMARY} />
          </Pressable>
        ) : null}
        {onDeleteCatalogGroup ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="묶음 삭제"
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDeleteCatalogGroup(section.groupKey, section.title);
            }}
            style={[
              styles.customGroupHeaderIconBtn,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
            ]}>
            <IconSymbol name="trash" size={16} color={isDark ? '#FAFAFA' : PRIMARY} />
          </Pressable>
        ) : null}
      </View>
    ) : undefined;

  return (
    <View style={[styles.sectionBlock, !isFirst && styles.sectionBlockFollows]}>
      <CatalogSectionHeader
        title={section.title}
        subtitle={section.subtitle ?? ''}
        ink={editorial.ink}
        muted={editorial.muted}
        trailing={groupHeaderTrailing}
      />
      <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
        {section.items.length > 0
          ? renderRows(
            section.items,
            editorial,
            isDark,
            priorityCategoryOrder,
            isFocusStarted,
            onCatalogTap,
            onOpenCategorySettings,
            onMoveCustomFlow,
            onDeleteCatalogItem,
            sectionsCatalogOptions,
            spineCatalogOptions,
            manageOnly,
          )
          : null}
      </View>
    </View>
  );
}

/** 오늘 우선 순위에 담을 수 있는 항목 — 상위 그룹별 카탈로그 */
export function PriorityCatalogPanel({
  editorial,
  priorityCategoryOrder,
  isFocusStarted,
  onCatalogTap,
  onOpenCategorySettings,
  customFlowPickerItems,
  customFlowEntries,
  customGroups,
  isDark,
  onRenameCustomGroup,
  onDeleteCatalogGroup,
  onMoveCustomFlow,
  onDeleteCatalogItem,
  sectionsCatalogEnabled = false,
  prioritySectionsMealSlots = {},
  priorityMealSlotOverrides = {},
  defaultMealSlot = 'morning',
  onToggleCatalogMealSlot,
  spineCatalogEnabled = false,
  priorityStart = '09:00',
  priorityEnd = '22:00',
  resolveSpineSchedule,
  onChangeCatalogSpineTime,
  manageOnly = false,
}: Props) {
  const [expandedMealSlotKey, setExpandedMealSlotKey] = useState<string | null>(null);
  const [expandedSpineTimeKey, setExpandedSpineTimeKey] = useState<string | null>(null);

  const onToggleMealSlotExpand = useCallback((categoryKey: string) => {
    setExpandedMealSlotKey((prev) => (prev === categoryKey ? null : categoryKey));
    setExpandedSpineTimeKey(null);
  }, []);

  const handleToggleCatalogMealSlot = useCallback(
    (categoryKey: string, slot: DayMealSlot) => {
      onToggleCatalogMealSlot?.(categoryKey, slot);
      setExpandedMealSlotKey(null);
    },
    [onToggleCatalogMealSlot],
  );

  const onToggleSpineTimeExpand = useCallback((categoryKey: string) => {
    setExpandedSpineTimeKey((prev) => (prev === categoryKey ? null : categoryKey));
    setExpandedMealSlotKey(null);
  }, []);
  const [catalogLabelTick, setCatalogLabelTick] = useState(0);
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  useFocusEffect(
    useCallback(() => {
      setCatalogLabelTick((n) => n + 1);
    }, []),
  );

  const visibleCatalogCategories = useMemo(() => {
    void catalogLabelTick;
    void categoryLabelEpoch;
    return filterCatalogPickerCategories(PICKER_CATEGORIES).map((item) => ({
      ...item,
      label: getPickerCategoryLabel(item.key),
      icon: resolveCategoryCatalogIcon(item.key),
    }));
  }, [catalogLabelTick, categoryLabelEpoch]);

  const { groupSections } = useMemo(
    () =>
      buildPriorityCatalogSections({
        available: visibleCatalogCategories,
        customFlowPickerItems,
        customFlowEntries,
        customGroups,
      }),
    [visibleCatalogCategories, customFlowPickerItems, customFlowEntries, customGroups],
  );

  const sectionsCatalogOptions = useMemo(
    () =>
      sectionsCatalogEnabled && onToggleCatalogMealSlot
        ? {
            prioritySectionsMealSlots,
            priorityMealSlotOverrides,
            defaultMealSlot,
            expandedMealSlotKey,
            onToggleMealSlotExpand,
            onToggleCatalogMealSlot: handleToggleCatalogMealSlot,
          }
        : undefined,
    [
      defaultMealSlot,
      expandedMealSlotKey,
      handleToggleCatalogMealSlot,
      onToggleCatalogMealSlot,
      onToggleMealSlotExpand,
      priorityMealSlotOverrides,
      prioritySectionsMealSlots,
      sectionsCatalogEnabled,
    ],
  );

  const spineCatalogOptions = useMemo(
    () =>
      spineCatalogEnabled && resolveSpineSchedule && onChangeCatalogSpineTime
        ? {
            priorityStart,
            priorityEnd,
            expandedSpineTimeKey,
            onToggleSpineTimeExpand,
            onChangeSpineTime: onChangeCatalogSpineTime,
            resolveSpineSchedule,
          }
        : undefined,
    [
      expandedSpineTimeKey,
      onChangeCatalogSpineTime,
      onToggleSpineTimeExpand,
      priorityEnd,
      priorityStart,
      resolveSpineSchedule,
      spineCatalogEnabled,
    ],
  );

  return (
    <View style={styles.root}>
      {groupSections.map((section, index) => (
        <GroupSectionBlock
          key={section.groupKey}
          section={section}
          editorial={editorial}
          isDark={isDark}
          priorityCategoryOrder={priorityCategoryOrder}
          isFocusStarted={isFocusStarted}
          onCatalogTap={onCatalogTap}
          onOpenCategorySettings={onOpenCategorySettings}
          onRenameCustomGroup={onRenameCustomGroup}
          onDeleteCatalogGroup={onDeleteCatalogGroup}
          onMoveCustomFlow={onMoveCustomFlow}
          onDeleteCatalogItem={onDeleteCatalogItem}
          sectionsCatalogOptions={sectionsCatalogOptions}
          spineCatalogOptions={spineCatalogOptions}
          manageOnly={manageOnly}
          isFirst={index === 0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  sectionBlock: {
    width: '100%',
  },
  sectionBlockFollows: {
    marginTop: 28,
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionHeaderTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sectionHeaderTrailing: {
    paddingTop: 2,
  },
  customGroupHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customGroupHeaderIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  listShell: {
    width: '100%',
    borderTopWidth: 1,
    paddingBottom: 2,
  },
  catalogRowWrap: {
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  mealSlotPanel: {
    marginTop: -2,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  spineTimePanel: {
    marginTop: -2,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  catalogRowMainHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    paddingVertical: 10,
  },
  catalogRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 2,
  },
  catalogSettingsBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  catalogAddHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogRowTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  catalogRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  catalogRowSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  catalogMedicineBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 28,
    paddingHorizontal: 8,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
});
