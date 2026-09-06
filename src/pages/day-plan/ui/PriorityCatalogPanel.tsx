import { useTranslation } from '@shared/lib/i18n/hooks/useTranslation';
import * as Haptics from 'expo-haptics';
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
  formatSpineScheduleRangeLabel,
  isNonDeletableCatalogKey,
  resolveCategoryCatalogIcon,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
import {
  DEFAULT_POST_IT_FACE_COLOR_ID,
  getDayMealSlotLabel,
  loadPostItFaceColorByGroup,
  postItFaceUsesLightInk,
  resolvePostItFaceColor,
  resolvePostItFaceInk,
  resolvePostItFaceMuted,
  savePostItFaceColorForGroup,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
  type DayMealSlot,
  type PostItFaceColorByGroup,
  type PostItFaceColorId,
} from '@shared/lib/storage';import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory, categoryAccentColorPastel } from '@widgets/day-plan-priority-order';

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
import { PostItFaceColorChips } from './PostItFaceColorChips';

export type PriorityCatalogEditorial = {
  ink: string;
  muted: string;
  line: string;
  /** 시안 액션 버튼용 (manageOnly) */
  actionBg?: string;
  actionHoverBg?: string;
  shadow?: string;
};

const MEAL_SLOT_PANEL_HEIGHT = 56;
const BRUTAL_SHADOW_SM = 3;

/** 시안 `w-10 h-10 border border-black bg-white brutal-shadow-sm` */
function BrutalActionButton({
  accessibilityLabel,
  disabled,
  borderColor,
  backgroundColor,
  pressedBg,
  shadowColor,
  onPress,
  soft = false,
  children,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  borderColor: string;
  backgroundColor: string;
  pressedBg: string;
  shadowColor: string;
  onPress: () => void;
  soft?: boolean;
  children: ReactNode;
}) {
  const shadow = soft ? 2 : BRUTAL_SHADOW_SM;
  return (
    <View
      style={[
        styles.brutalBtnShell,
        shadow > 0 && { marginRight: shadow, marginBottom: shadow },
      ]}>
      {shadow > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.brutalBtnShadow,
            {
              backgroundColor: shadowColor,
              borderColor: soft ? 'transparent' : borderColor,
              borderWidth: soft ? 0 : StyleSheet.hairlineWidth,
              transform: [{ translateX: shadow }, { translateY: shadow }],
            },
          ]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        hitSlop={disabled ? 0 : 8}
        onPress={onPress}
        style={({ pressed }) => [
          soft ? styles.catalogSettingsBtnManageSoft : styles.catalogSettingsBtnManage,
          {
            borderColor: soft ? 'transparent' : borderColor,
            borderWidth: soft ? 0 : StyleSheet.hairlineWidth,
            backgroundColor: pressed && !disabled ? pressedBg : backgroundColor,
            opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
          },
        ]}>
        {children}
      </Pressable>
    </View>
  );
}

function CatalogListRow({
  categoryKey,
  icon,
  label,
  subtitle,
  selected,
  ink,
  muted,
  line,
  actionBg,
  actionHoverBg,
  shadow,
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
  actionBg?: string;
  actionHoverBg?: string;
  shadow?: string;
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
  const { t } = useTranslation();
  const settingsBorder = manageOnly
    ? isDark
      ? 'rgba(241,239,255,0.28)'
      : 'rgba(24,26,46,0.14)'
    : isDark
      ? 'rgba(255,255,255,0.28)'
      : 'rgba(0,0,0,0.2)';
  const settingsBg = manageOnly
    ? (actionBg ?? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.72)'))
    : isDark
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.05)';
  const settingsHoverBg = actionHoverBg ?? settingsBg;
  const brutalShadow = shadow ?? '#000000';
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
  const iconBoxBg = manageOnly
    ? categoryAccentColorPastel(categoryKey)
    : undefined;

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
    <View
      style={[
        styles.catalogRowWrap,
        manageOnly && styles.catalogRowWrapManage,
        {
          borderBottomColor: line,
        },
      ]}>
      <View style={[styles.catalogRow, manageOnly && styles.catalogRowManage]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: manageOnly ? undefined : selected }}
          accessibilityLabel={
            manageOnly
              ? subtitle
                ? t('catalog.settingsOpenA11y', { label, subtitle: t('catalog.settingsOpenSubtitleA11y', { subtitle }) })
                : t('catalog.settingsOpenA11y', { label, subtitle: '' })
              : subtitle
                ? t('catalog.priorityToggleA11y', { label, subtitle: t('catalog.settingsOpenSubtitleA11y', { subtitle }), state: selected ? t('catalog.priorityAdded') : t('catalog.priorityAdd') })
                : t('catalog.priorityToggleA11y', { label, subtitle: '', state: selected ? t('catalog.priorityAdded') : t('catalog.priorityAdd') })
          }
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (manageOnly) {
              onOpenSettings();
              return;
            }
            onAddPress();
          }}
          style={({ pressed }) => [
            styles.catalogRowMainHit,
            manageOnly && styles.catalogRowMainHitManage,
            manageOnly &&
            pressed && {
              backgroundColor: 'rgba(168, 218, 220, 0.1)',
            },
          ]}>
          <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
            {manageOnly ? (
              <View
                style={[
                  styles.catalogIconBoxShell,
                  { marginRight: 2, marginBottom: 2 },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.catalogIconBoxShadow,
                    {
                      backgroundColor: brutalShadow,
                      transform: [{ translateX: 2 }, { translateY: 2 }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.catalogIconBox,
                    styles.catalogIconBoxManageSoft,
                    {
                      backgroundColor: iconBoxBg ?? 'rgba(255,255,255,0.85)',
                    },
                  ]}>
                  <IconSymbol
                    key={`${categoryKey}-${icon}-${iconColor}`}
                    name={icon as any}
                    size={16}
                    color={iconColor}
                  />
                </View>
              </View>
            ) : (
              <IconSymbol
                key={`${categoryKey}-${icon}-${iconColor}`}
                name={icon as any}
                size={18}
                color={iconColor}
              />
            )}
          </Animated.View>
          <View style={styles.catalogRowTextCol}>
            <ThemedText
              style={[
                styles.catalogRowLabel,
                manageOnly && styles.catalogRowLabelManage,
                { color: labelColor },
              ]}
              lightColor={labelColor}
              darkColor={labelColor}
              numberOfLines={1}>
              {label}
            </ThemedText>
            {subtitle ? (
              <ThemedText
                style={[
                  styles.catalogRowSubtitle,
                  manageOnly && styles.catalogRowSubtitleManage,
                  { color: muted },
                ]}
                lightColor={muted}
                darkColor={muted}
                numberOfLines={1}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>

        <View style={[styles.catalogRowActions, manageOnly && styles.catalogRowActionsManage]}>
          {onDeleteItem ? (
            manageOnly ? (
              <BrutalActionButton
                accessibilityLabel={t('catalog.deleteA11y', { label })}
                disabled={settingsLocked}
                borderColor={settingsLocked ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : settingsBorder}
                backgroundColor={settingsLocked ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : settingsBg}
                pressedBg={settingsHoverBg}
                shadowColor={brutalShadow}
                soft={manageOnly}
                onPress={() => {
                  if (settingsLocked) return;
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDeleteItem();
                }}>
                <IconSymbol
                  name="trash"
                  size={14}
                  color={settingsLocked ? muted : isDark ? '#FAFAFA' : '#000000'}
                />
              </BrutalActionButton>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('catalog.deleteA11y', { label })}
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
                  size={14}
                  color={settingsLocked ? muted : isDark ? '#FAFAFA' : '#000000'}
                />
              </Pressable>
            )
          ) : null}
          {onMoveGroup ? (
            manageOnly ? (
              <BrutalActionButton
                accessibilityLabel={t('catalog.moveGroupA11y', { label })}
                borderColor={settingsBorder}
                backgroundColor={settingsBg}
                pressedBg={settingsHoverBg}
                shadowColor={brutalShadow}
                soft={manageOnly}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onMoveGroup();
                }}>
                <IconSymbol
                  name="arrow.left.arrow.right"
                  size={14}
                  color={isDark ? '#FAFAFA' : '#000000'}
                />
              </BrutalActionButton>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('catalog.moveGroupA11y', { label })}
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
                <IconSymbol name="arrow.left.arrow.right" size={15} color={isDark ? '#FAFAFA' : '#000000'} />
              </Pressable>
            )
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
                  ? t('fixedRoutine.mealSlotA11y', { label, slots: selectedMealSlots!.map((slot) => getDayMealSlotLabel(slot)).join(', ') })
                  : t('fixedRoutine.mealSlotPickA11y', { label })
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
                  ? t('fixedRoutine.timeA11y', {
                    label,
                    time: formatSpineScheduleRangeLabel({
                      startMinutes: spineStartMinutes,
                      endMinutes: spineEndMinutes,
                    }),
                  })
                  : t('fixedRoutine.timePickA11y', { label })
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
          {manageOnly ? (
            <BrutalActionButton
              accessibilityLabel={
                settingsLocked
                  ? t('catalog.goalSettingsLockedA11y', { label })
                  : t('catalog.goalSettingsA11y', { label })
              }
              disabled={settingsLocked}
              borderColor={
                settingsLocked
                  ? isDark
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.08)'
                  : settingsBorder
              }
              backgroundColor={
                settingsLocked
                  ? isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.02)'
                  : settingsBg
              }
              pressedBg={settingsHoverBg}
              shadowColor={brutalShadow}
              soft={manageOnly}
              onPress={() => {
                if (settingsLocked) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenSettings();
              }}>
              <IconSymbol
                name={settingsLocked ? 'lock.fill' : 'slider.horizontal.3'}
                size={settingsLocked ? 13 : 14}
                color={settingsLocked ? muted : isDark ? '#FAFAFA' : '#000000'}
              />
            </BrutalActionButton>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: settingsLocked }}
              accessibilityLabel={
                settingsLocked
                  ? t('catalog.goalSettingsLockedA11y', { label })
                  : t('catalog.goalSettingsA11y', { label })
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
                size={settingsLocked ? 13 : 14}
                color={settingsLocked ? muted : isDark ? '#FAFAFA' : '#000000'}
              />
            </Pressable>
          )}
          {!manageOnly ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                selected
                  ? t('catalog.removeFromPriorityA11y', { label })
                  : t('catalog.addToPriorityA11y', { label })
              }
              hitSlop={10}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddPress();
              }}
              style={styles.catalogAddHit}>
              {selected ? (
                <IconSymbol name="minus.circle.fill" size={18} color={categoryIconColor} />
              ) : (
                <IconSymbol name="plus.circle" size={18} color={muted} />
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
  itemCount,
  ink,
  muted,
  trailing,
  manageOnly = false,
  isDark = false,
}: {
  title: string;
  itemCount: number;
  ink: string;
  muted: string;
  trailing?: ReactNode;
  manageOnly?: boolean;
  isDark?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.sectionHeader,
        manageOnly && styles.sectionHeaderManage,
        manageOnly && {
          backgroundColor: 'transparent',
        },
      ]}
      accessibilityRole="header"
      accessibilityLabel={t('catalog.groupA11y', { title, count: itemCount })}>
      <View style={styles.sectionHeaderTop}>
        <View style={styles.sectionHeaderTextCol}>
          <View style={styles.sectionHeaderTitleRow}>
            <ThemedText
              style={[
                styles.sectionTitle,
                manageOnly && styles.sectionTitleManage,
                { color: ink },
              ]}
              numberOfLines={1}>
              {title}
            </ThemedText>
            <ThemedText style={[styles.sectionMeta, { color: muted }]} numberOfLines={1}>
              {t('catalog.groupCount', { count: itemCount })}
            </ThemedText>
          </View>
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
        actionBg={editorial.actionBg}
        actionHoverBg={editorial.actionHoverBg}
        shadow={editorial.shadow}
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
  postItFaceColorId = DEFAULT_POST_IT_FACE_COLOR_ID,
  onSelectPostItFaceColor,
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
  /** manageOnly: 이 그룹 포스트잇 면 색 */
  postItFaceColorId?: PostItFaceColorId;
  onSelectPostItFaceColor?: (id: PostItFaceColorId) => void;
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
  const { t } = useTranslation();
  const faceUsesLightInk = manageOnly && postItFaceUsesLightInk(postItFaceColorId);
  const faceInk = manageOnly
    ? resolvePostItFaceInk(postItFaceColorId, editorial.ink)
    : editorial.ink;
  const faceMuted = manageOnly
    ? resolvePostItFaceMuted(postItFaceColorId, editorial.muted)
    : editorial.muted;
  const faceEditorial: PriorityCatalogEditorial = manageOnly
    ? {
        ...editorial,
        ink: faceInk,
        muted: faceMuted,
        line: faceUsesLightInk ? 'rgba(255,255,255,0.22)' : editorial.line,
      }
    : editorial;
  const headerIconColor = faceUsesLightInk ? '#FFFFFF' : isDark ? '#FAFAFA' : '#000000';
  const headerBtnBorder = faceUsesLightInk
    ? 'rgba(255,255,255,0.32)'
    : manageOnly
      ? isDark
        ? 'rgba(241,239,255,0.28)'
        : 'rgba(24,26,46,0.14)'
      : isDark
        ? 'rgba(255,255,255,0.28)'
        : 'rgba(0,0,0,0.2)';
  const headerBtnBg = faceUsesLightInk
    ? 'rgba(255,255,255,0.14)'
    : manageOnly
      ? isDark
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.72)'
      : isDark
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.05)';

  const groupHeaderTrailing =
    onRenameCustomGroup || onDeleteCatalogGroup ? (
      <View style={styles.customGroupHeaderActions}>
        {onRenameCustomGroup ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('catalog.editGroupA11y')}
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRenameCustomGroup(
                section.groupKey,
                section.title,
                section.subtitle ?? '',
              );
            }}
            style={({ pressed }) => [
              manageOnly ? styles.customGroupHeaderIconBtnManage : styles.customGroupHeaderIconBtn,
              {
                borderColor: headerBtnBorder,
                backgroundColor: headerBtnBg,
              },
              manageOnly && pressed && { opacity: 0.92 },
            ]}>
            <IconSymbol name="pencil" size={13} color={headerIconColor} />
          </Pressable>
        ) : null}
        {onDeleteCatalogGroup ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('catalog.deleteGroupA11y')}
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDeleteCatalogGroup(section.groupKey, section.title);
            }}
            style={({ pressed }) => [
              manageOnly ? styles.customGroupHeaderIconBtnManage : styles.customGroupHeaderIconBtn,
              {
                borderColor: headerBtnBorder,
                backgroundColor: headerBtnBg,
              },
              manageOnly && pressed && { opacity: 0.92 },
            ]}>
            <IconSymbol name="trash" size={13} color={headerIconColor} />
          </Pressable>
        ) : null}
      </View>
    ) : undefined;

  const postItFaceColor = resolvePostItFaceColor(postItFaceColorId, isDark);

  return (
    <View style={[styles.sectionBlock, !isFirst && styles.sectionBlockFollows]}>
      {manageOnly ? (
        <PostItCardShell isDark={isDark} faceColor={postItFaceColor}>
          <CatalogSectionHeader
            title={section.title}
            itemCount={section.items.length}
            ink={faceInk}
            muted={faceMuted}
            manageOnly={manageOnly}
            isDark={isDark}
            trailing={groupHeaderTrailing}
          />
          {onSelectPostItFaceColor ? (
            <PostItFaceColorChips
              compact
              selectedId={postItFaceColorId}
              isDark={isDark}
              ink={faceInk}
              shadowColor={faceEditorial.shadow ?? '#000000'}
              onSelect={onSelectPostItFaceColor}
            />
          ) : null}
          <View
            style={[
              styles.listShell,
              styles.listShellManage,
              {
                borderTopColor: faceUsesLightInk
                  ? 'rgba(255,255,255,0.22)'
                  : isDark
                    ? 'rgba(241,239,255,0.22)'
                    : 'rgba(24,26,46,0.12)',
              },
            ]}>
            {section.items.length > 0
              ? renderRows(
                section.items,
                faceEditorial,
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
        </PostItCardShell>
      ) : (
        <>
          <CatalogSectionHeader
            title={section.title}
            itemCount={section.items.length}
            ink={editorial.ink}
            muted={editorial.muted}
            manageOnly={manageOnly}
            isDark={isDark}
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
        </>
      )}
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
  const [postItFaceByGroup, setPostItFaceByGroup] = useState<PostItFaceColorByGroup>(
    () => loadPostItFaceColorByGroup(),
  );

  const onSelectPostItFaceColor = useCallback((groupKey: string, id: PostItFaceColorId) => {
    setPostItFaceByGroup(savePostItFaceColorForGroup(groupKey, id));
  }, []);

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
  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);

  const visibleCatalogCategories = useMemo(() => {
    void categoryLabelEpoch;
    return filterCatalogPickerCategories(PICKER_CATEGORIES).map((item) => ({
      ...item,
      label: getPickerCategoryLabel(item.key),
      icon: resolveCategoryCatalogIcon(item.key),
    }));
  }, [categoryLabelEpoch]);

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
          postItFaceColorId={
            manageOnly
              ? (postItFaceByGroup[section.groupKey] ?? DEFAULT_POST_IT_FACE_COLOR_ID)
              : undefined
          }
          onSelectPostItFaceColor={
            manageOnly
              ? (id) => onSelectPostItFaceColor(section.groupKey, id)
              : undefined
          }
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
    marginTop: 22,
  },
  sectionGroupShell: {
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'hidden',
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderManage: {
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'nowrap',
  },
  sectionHeaderTrailing: {
    paddingTop: 0,
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
  customGroupHeaderIconBtnManage: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionMeta: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.28,
    lineHeight: 18,
  },
  sectionTitleManage: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.28,
    lineHeight: 18,
    textTransform: 'none',
  },
  listShell: {
    width: '100%',
    borderTopWidth: 1,
    paddingBottom: 2,
  },
  listShellManage: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
  },
  catalogRowWrap: {
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  catalogRowWrapManage: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 0,
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
  catalogRowManage: {
    paddingVertical: 0,
  },
  catalogRowMainHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    paddingVertical: 10,
  },
  catalogRowMainHitManage: {
    paddingVertical: 10,
    gap: 10,
  },
  catalogIconBoxShell: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  catalogIconBoxShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  catalogIconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  catalogIconBoxManageSoft: {
    borderRadius: 0,
    borderWidth: 0,
  },
  catalogRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 2,
  },
  catalogRowActionsManage: {
    gap: 8,
    paddingLeft: 4,
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
  brutalBtnShell: {
    position: 'relative',
  },
  catalogSettingsBtnManage: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  catalogSettingsBtnManageSoft: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  brutalBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
  },
  catalogAddHit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogRowTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  catalogRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  catalogRowLabelManage: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  catalogRowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 14,
  },
  catalogRowSubtitleManage: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 13,
    marginTop: 1,
  },
  catalogMedicineBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 8,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
  },
});
