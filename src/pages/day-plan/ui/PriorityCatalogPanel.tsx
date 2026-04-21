import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { PICKER_CATEGORIES, PRIMARY } from '../lib/dayPlanEditorShared';
import {
  filterCatalogPickerCategories,
  splitAvailableCatalogCategories,
  type PickerCategoryItem,
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
            { borderColor: settingsBorder, backgroundColor: settingsBg },
          ]}>
          <IconSymbol name="slider.horizontal.3" size={16} color={isDark ? '#FAFAFA' : PRIMARY} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? `${label} 우선 순위에서 빼기` : `${label} 우선 순위에 담기`}
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
  /** 사용자 저장 고정 루틴 키 순서(비어 있으면 상단 묶음은 안내·만들기만) */
  userFixedRoutineOrder: string[];
  onOpenFixedRoutineEditor: () => void;
  onCatalogTap: (key: string) => void;
  onOpenCategorySettings: (categoryKey: string) => void;
  isDark: boolean;
};

/** 오늘 우선 순위에 담을 수 있는 항목 — 매일 이어가기 루틴(필요 시 하단 보조 묶음) */
export function PriorityCatalogPanel({
  editorial,
  priorityCategoryOrder,
  isFocusStarted,
  isCatalogRowCompleted,
  userFixedRoutineOrder,
  onOpenFixedRoutineEditor,
  onCatalogTap,
  onOpenCategorySettings,
  isDark,
}: Props) {
  const visibleCatalogCategories = filterCatalogPickerCategories(PICKER_CATEGORIES);
  const { fixedFlows, healthBodyFlows, productivityTools } = splitAvailableCatalogCategories(
    visibleCatalogCategories,
    userFixedRoutineOrder,
  );

  const editBorder = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)';
  const editBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={styles.root}>
      {visibleCatalogCategories.length === 0 ? (
        <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
          <View style={styles.emptyWrap} accessibilityRole="text">
            <ThemedText style={[styles.emptyTitle, { color: editorial.ink }]}>더 담을 항목이 없어요</ThemedText>
            <ThemedText style={[styles.emptyHint, { color: editorial.muted }]}>
              고른 항목이 모두 우선 순위에 들어가 있어요. 오늘 탭에서 순서를 바꾸거나 빼낼 수 있어요.
            </ThemedText>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.sectionBlock}>
            <CatalogSectionHeader
              title="내 고정 루틴"
              subtitle="매일 이어가고 싶은 항목을 위에 모아요. 비어 있으면 아래에서 골라 넣을 수 있어요."
              ink={editorial.ink}
              muted={editorial.muted}
            />
            {userFixedRoutineOrder.length === 0 ? (
              <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
                <View style={styles.fixedEmptyInner}>
                  <ThemedText style={[styles.fixedEmptyText, { color: editorial.muted }]}>
                    아직 고정 루틴이 없어요. 아래에서 수분·약·스트레칭처럼 자주 쓰는 항목을 골라 주세요.
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="고정 루틴 만들기"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onOpenFixedRoutineEditor();
                    }}
                    style={[styles.fixedCta, { borderColor: editBorder, backgroundColor: editBg }]}>
                    <ThemedText style={[styles.fixedCtaText, { color: editorial.ink }]}>고정 루틴 만들기</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : fixedFlows.length > 0 ? (
              <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
                {renderRows(
                  fixedFlows,
                  editorial,
                  isDark,
                  priorityCategoryOrder,
                  isFocusStarted,
                  isCatalogRowCompleted,
                  onCatalogTap,
                  onOpenCategorySettings,
                )}
                <View style={styles.fixedSectionFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="고정 루틴 바꾸기"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onOpenFixedRoutineEditor();
                    }}
                    style={[styles.fixedCta, { borderColor: editBorder, backgroundColor: editBg }]}>
                    <ThemedText style={[styles.fixedCtaText, { color: editorial.ink }]}>고정 루틴 바꾸기</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
                <View style={styles.fixedEmptyInner}>
                  <ThemedText style={[styles.fixedEmptyText, { color: editorial.muted }]}>
                    고정으로 둔 항목을 모두 우선 순위에 담았어요. 오늘 탭에서 빼낸 뒤 아래에서 고정 목록을 바꿀 수 있어요.
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="고정 루틴 바꾸기"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onOpenFixedRoutineEditor();
                    }}
                    style={[styles.fixedCta, { borderColor: editBorder, backgroundColor: editBg }]}>
                    <ThemedText style={[styles.fixedCtaText, { color: editorial.ink }]}>고정 루틴 바꾸기</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {healthBodyFlows.length > 0 ? (
            <View style={[styles.sectionBlock, styles.sectionBlockFollows]}>
              <CatalogSectionHeader
                title="건강·몸 관리"
                subtitle="수분·복약·체중과 스트레칭·허리·목 자세를 오늘 몸에 맞게 골라 담아요. 약은 필요할 때만 써도 괜찮아요."
                ink={editorial.ink}
                muted={editorial.muted}
              />
              <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
                {renderRows(
                  healthBodyFlows,
                  editorial,
                  isDark,
                  priorityCategoryOrder,
                  isFocusStarted,
                  isCatalogRowCompleted,
                  onCatalogTap,
                  onOpenCategorySettings,
                )}
              </View>
            </View>
          ) : null}

          {productivityTools.length > 0 ? (
            <View style={[styles.sectionBlock, styles.sectionBlockFollows]}>
              <CatalogSectionHeader
                title="생산성을 높이는 도구"
                subtitle="독서·공부·정리·창작 등 집중에 쓸 항목을 골라 담아요."
                ink={editorial.ink}
                muted={editorial.muted}
              />
              <View style={[styles.listShell, { borderTopColor: editorial.line }]}>
                {renderRows(
                  productivityTools,
                  editorial,
                  isDark,
                  priorityCategoryOrder,
                  isFocusStarted,
                  isCatalogRowCompleted,
                  onCatalogTap,
                  onOpenCategorySettings,
                )}
              </View>
            </View>
          ) : null}
        </>
      )}
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
  fixedSectionFooter: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 14,
  },
  fixedEmptyInner: {
    paddingVertical: 18,
    paddingHorizontal: 4,
    gap: 14,
  },
  fixedEmptyText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  fixedCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  fixedCtaText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.25,
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
