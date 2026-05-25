import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import type { CustomCatalogGroup, CustomFlowCatalogEntry } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { PICKER_CATEGORIES, PRIMARY } from '../lib/dayPlanEditorShared';
import {
  buildPriorityCatalogSections,
  filterCatalogPickerCategories,
  type PickerCategoryItem,
  type PriorityCatalogGroupSection,
} from '../lib/priorityCatalogSections';

export type PriorityCatalogEditorial = {
  ink: string;
  muted: string;
  line: string;
};

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
  isCompleted,
  onAddPress,
  onOpenSettings,
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
  isCompleted: boolean;
  onAddPress: () => void;
  onOpenSettings: () => void;
}) {
  const settingsBorder = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)';
  const settingsBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const shouldPulse = Boolean(selected && isFocusStarted && !isCompleted);
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

  /** 다크 모드에서 PRIMARY(검정)는 배경과 대비가 거의 없어 선택이 안 보이는 경우가 있음 */
  const selectedIconColor = isDark ? ink : PRIMARY;
  const iconColor = shouldPulse
    ? activeIconColorByCategory(categoryKey)
    : selected
      ? isCompleted
        ? muted
        : selectedIconColor
      : muted;

  const labelColor = selected && isCompleted ? muted : selected ? ink : muted;

  return (
    <View style={[styles.catalogRow, { borderBottomColor: line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={
          subtitle
            ? `${label}. ${subtitle}, 우선 순위에 ${selected ? '담김' : '담기'}`
            : `${label}, 우선 순위에 ${selected ? '담김' : '담기'}`
        }
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddPress();
        }}
        style={styles.catalogRowMainHit}>
        {shouldPulse && categoryKey === 'medicine' ? (
          <Animated.View style={[styles.catalogMedicineBadge, { opacity: pulse }]}>
            <IconSymbol name="cross.fill" size={12} color="#ef4444" />
          </Animated.View>
        ) : (
          <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
            <IconSymbol
              key={`${categoryKey}-${selected ? 1 : 0}-${isCompleted ? 1 : 0}-${iconColor}`}
              name={icon as any}
              size={22}
              color={iconColor}
            />
          </Animated.View>
        )}
        <View style={styles.catalogRowTextCol}>
          <ThemedText
            style={[
              styles.catalogRowLabel,
              { color: labelColor },
              selected && isCompleted && styles.catalogRowLabelDone,
            ]}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 목표 상세 설정`}
          hitSlop={10}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSettings();
          }}
          style={[
            styles.catalogSettingsBtn,
            {
              borderColor: settingsBorder,
              backgroundColor: settingsBg,
            },
          ]}>
          <IconSymbol
            name="slider.horizontal.3"
            size={16}
            color={isDark ? '#FAFAFA' : PRIMARY}
          />
        </Pressable>
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
            <View style={[styles.catalogRowBadge, { backgroundColor: PRIMARY }]}>
              <IconSymbol name="checkmark" size={11} color="#fff" />
            </View>
          ) : (
            <IconSymbol name="plus.circle" size={22} color={muted} />
          )}
        </Pressable>
      </View>
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

function renderRows(
  cats: PickerCategoryItem[],
  editorial: PriorityCatalogEditorial,
  isDark: boolean,
  priorityCategoryOrder: string[],
  isFocusStarted: boolean,
  isCatalogRowCompleted: (categoryKey: string) => boolean,
  onCatalogTap: (key: string) => void,
  onOpenCategorySettings: (key: string) => void,
) {
  return cats.map((cat) => (
    <CatalogListRow
      key={cat.key}
      categoryKey={cat.key}
      icon={cat.icon}
      label={cat.label}
      subtitle={null}
      selected={priorityCategoryOrder.includes(cat.key)}
      ink={editorial.ink}
      muted={editorial.muted}
      line={editorial.line}
      isDark={isDark}
      isFocusStarted={isFocusStarted}
      isCompleted={isCatalogRowCompleted(cat.key)}
      onAddPress={() => onCatalogTap(cat.key)}
      onOpenSettings={() => onOpenCategorySettings(cat.key)}
    />
  ));
}

type Props = {
  editorial: PriorityCatalogEditorial;
  priorityCategoryOrder: string[];
  /** 집중 구간 시작 후 — 담긴 항목 아이콘 색·펄스 */
  isFocusStarted: boolean;
  /** 오늘 탭 `OrderRow`와 동일한 완료 판별 */
  isCatalogRowCompleted: (categoryKey: string) => boolean;
  onCatalogTap: (key: string) => void;
  onOpenCategorySettings: (categoryKey: string) => void;
  /** 저장된 사용자 플로우(picker용 메타) — 라벨/아이콘 해석에 사용 */
  customFlowPickerItems: PickerCategoryItem[];
  /** 사용자 플로우 ↔ 그룹 매핑(저장소) */
  customFlowEntries: CustomFlowCatalogEntry[];
  /** 사용자 정의 그룹 목록 */
  customGroups: CustomCatalogGroup[];
  isDark: boolean;
  /** 사용자 정의 상위 묶음 — 이름 편집 시트 열기 */
  onRenameCustomGroup?: (groupKey: string, currentLabel: string) => void;
  /** 사용자 정의 상위 묶음 — 삭제 확인 후 처리 */
  onDeleteCustomGroup?: (groupKey: string, currentLabel: string) => void;
};

function GroupSectionBlock({
  section,
  editorial,
  isDark,
  priorityCategoryOrder,
  isFocusStarted,
  isCatalogRowCompleted,
  onCatalogTap,
  onOpenCategorySettings,
  onRenameCustomGroup,
  onDeleteCustomGroup,
  isFirst,
}: {
  section: PriorityCatalogGroupSection;
  editorial: PriorityCatalogEditorial;
  isDark: boolean;
  priorityCategoryOrder: string[];
  isFocusStarted: boolean;
  isCatalogRowCompleted: (categoryKey: string) => boolean;
  onCatalogTap: (key: string) => void;
  onOpenCategorySettings: (key: string) => void;
  onRenameCustomGroup?: (groupKey: string, currentLabel: string) => void;
  onDeleteCustomGroup?: (groupKey: string, currentLabel: string) => void;
  isFirst: boolean;
}) {
  const groupHeaderTrailing =
    section.isCustomGroup && onRenameCustomGroup && onDeleteCustomGroup ? (
      <View style={styles.customGroupHeaderActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="묶음 이름 바꾸기"
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRenameCustomGroup(section.groupKey, section.title);
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="묶음 삭제"
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDeleteCustomGroup(section.groupKey, section.title);
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
      </View>
    ) : undefined;

  return (
    <View style={[styles.sectionBlock, !isFirst && styles.sectionBlockFollows]}>
      <CatalogSectionHeader
        title={section.title}
        subtitle={
          section.subtitle ??
          (section.isCustomGroup
            ? '직접 만든 묶음이에요. 아래에 두고 싶은 루틴을 오른쪽 아래 + 버튼으로 추가할 수 있어요.'
            : '')
        }
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
              isCatalogRowCompleted,
              onCatalogTap,
              onOpenCategorySettings,
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
  isCatalogRowCompleted,
  onCatalogTap,
  onOpenCategorySettings,
  customFlowPickerItems,
  customFlowEntries,
  customGroups,
  isDark,
  onRenameCustomGroup,
  onDeleteCustomGroup,
}: Props) {
  const [catalogLabelTick, setCatalogLabelTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setCatalogLabelTick((n) => n + 1);
    }, []),
  );

  const visibleCatalogCategories = useMemo(() => {
    void catalogLabelTick;
    return filterCatalogPickerCategories(PICKER_CATEGORIES);
  }, [catalogLabelTick]);

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
          isCatalogRowCompleted={isCatalogRowCompleted}
          onCatalogTap={onCatalogTap}
          onOpenCategorySettings={onOpenCategorySettings}
          onRenameCustomGroup={onRenameCustomGroup}
          onDeleteCustomGroup={onDeleteCustomGroup}
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
    borderWidth: 1,
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
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  catalogRowLabelDone: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.52,
  },
  catalogRowSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  catalogRowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
