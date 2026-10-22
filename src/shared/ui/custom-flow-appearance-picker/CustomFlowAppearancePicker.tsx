import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import {
  CUSTOM_FLOW_ICON_CATEGORY_IDS,
  CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS,
  CUSTOM_FLOW_ICON_OPTIONS,
  filterCustomFlowIcons,
  type CustomFlowIconCategoryId,
  type CustomFlowIconOption,
} from '@shared/lib/customFlowAppearanceCatalog';
import { getRoutineIllustration } from '@shared/lib/routineIllustrationCatalog';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

const ICON_LIST_MAX_H = 220;
const ICON_COLS = 8;
/** 한 번에 그리는 아이콘 수 (8열 × 5행) */
const ICON_PAGE_SIZE = 40;
const AVAILABLE_ICON_CATEGORIES = CUSTOM_FLOW_ICON_CATEGORY_IDS.filter(
  (category) => category === 'recommended' || category === 'all' ||
    CUSTOM_FLOW_ICON_OPTIONS.some((id) => getRoutineIllustration(id)?.category === category),
);
const SKELETON_COUNT = ICON_COLS * 2;
const LOAD_MORE_DELAY_MS = 140;
const PENCIL_LIGHT = '#9BA491';
const PENCIL_DARK = '#A3AE9C';
const MINT_WASH = '#C8EBDD';

export type CustomFlowAppearancePickerProps = {
  icon: CustomFlowIconOption;
  onChangeIcon: (icon: CustomFlowIconOption) => void;
  previewLabel?: string;
  onChangePreviewLabel?: (next: string) => void;
  onPreviewLabelFocus?: () => void;
  onPreviewLabelBlur?: () => void;
  isDark: boolean;
  ink: string;
  muted: string;
  line?: string;
  hint?: string;
  /** 목표 상세 등 좁은 화면 — 패딩·여백 축소 */
  compact?: boolean;
};

export function CustomFlowAppearancePicker({
  icon,
  onChangeIcon,
  previewLabel,
  onChangePreviewLabel,
  onPreviewLabelFocus,
  onPreviewLabelBlur,
  isDark,
  ink,
  muted,
  line: _line,
  hint,
  compact = false,
}: CustomFlowAppearancePickerProps) {
  const { t, locale } = useTranslation();
  const [iconQuery, setIconQuery] = useState('');
  const [iconCategory, setIconCategory] = useState<CustomFlowIconCategoryId>('all');
  const [visibleCount, setVisibleCount] = useState(ICON_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedPreviewLabel = previewLabel ?? '';
  /** 기본은 라벨·힌트 없음 — 필요 시 `hint`만 명시적으로 넘긴다. */
  const resolvedHint = (hint ?? '').trim();
  const showPreviewLabel = resolvedPreviewLabel.trim().length > 0;
  const paperBg = isDark ? '#30362E' : '#FAF9F4';
  const faceBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const controlInk = isDark ? '#FAFAFA' : '#252525';
  const controlMuted = isDark ? 'rgba(250,250,250,0.62)' : 'rgba(37,37,37,0.6)';
  const pencil = isDark ? PENCIL_DARK : PENCIL_LIGHT;
  const skeletonFace = isDark ? RetroFlatColors.dark.surfaceAlt : '#F3F3F5';
  const filteredIcons = useMemo(
    () => filterCustomFlowIcons(iconQuery, { category: iconCategory }),
    [iconQuery, iconCategory],
  );
  const hasSearchQuery = iconQuery.trim().length > 0;
  const categoryLabel = t(CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS[iconCategory]);
  const visibleIcons = useMemo(
    () => filteredIcons.slice(0, visibleCount),
    [filteredIcons, visibleCount],
  );
  const hasMoreIcons = visibleCount < filteredIcons.length;

  // Reset pagination in the user event so a filter change cannot retain an old timer.
  const resetIconPagination = useCallback(() => {
    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current);
      loadMoreTimerRef.current = null;
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setVisibleCount(ICON_PAGE_SIZE);
  }, []);

  useEffect(
    () => () => {
      if (loadMoreTimerRef.current) clearTimeout(loadMoreTimerRef.current);
    },
    [],
  );

  const handleSelectIcon = useCallback(
    (iconName: CustomFlowIconOption) => {
      void Haptics.selectionAsync();
      onChangeIcon(iconName);
    },
    [onChangeIcon],
  );

  const loadMoreIcons = useCallback(() => {
    if (!hasMoreIcons || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    loadMoreTimerRef.current = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + ICON_PAGE_SIZE, filteredIcons.length));
      setLoadingMore(false);
      loadingMoreRef.current = false;
      loadMoreTimerRef.current = null;
    }, LOAD_MORE_DELAY_MS);
  }, [filteredIcons.length, hasMoreIcons]);

  const handleIconScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 56) {
        loadMoreIcons();
      }
    },
    [loadMoreIcons],
  );

  const handleIconContentSizeChange = useCallback(
    (_w: number, contentHeight: number) => {
      if (contentHeight <= ICON_LIST_MAX_H + 8 && hasMoreIcons) {
        loadMoreIcons();
      }
    },
    [hasMoreIcons, loadMoreIcons],
  );

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      {resolvedHint.length > 0 ? (
        <ThemedText style={[styles.fieldHint, { color: muted }]}>{resolvedHint}</ThemedText>
      ) : null}

      <View
        style={[
          styles.previewCard,
          compact && styles.previewCardCompact,
          !showPreviewLabel && !onChangePreviewLabel && styles.previewCardIconOnly,
          { backgroundColor: paperBg },
        ]}>
        <PaperGrain opacity={0.28} />
        <HanddrawnFrame color={pencil} />
        <View
          style={[
            styles.previewIconWrap,
            compact && styles.previewIconWrapCompact,
            { backgroundColor: faceBg },
          ]}>
          <PaperGrain opacity={0.2} />
          <HanddrawnFrame color={pencil} />
          <IconSymbol name={icon} size={compact ? 18 : 22} color={controlInk} />
        </View>
        {onChangePreviewLabel ? (
          <ThemedTextInput
            value={resolvedPreviewLabel}
            onChangeText={onChangePreviewLabel}
            onFocus={onPreviewLabelFocus}
            onBlur={onPreviewLabelBlur}
            accessibilityLabel={t('appearance.renameA11y')}
            placeholder=""
            placeholderTextColor={controlMuted}
            maxLength={40}
            returnKeyType="done"
            style={[styles.previewLabel, compact && styles.previewLabelCompact, { color: controlInk }]}
          />
        ) : showPreviewLabel ? (
          <ThemedText
            style={[styles.previewLabel, compact && styles.previewLabelCompact, { color: controlInk }]}
            numberOfLines={1}>
            {resolvedPreviewLabel}
          </ThemedText>
        ) : null}
      </View>

      <View style={[styles.editorBody, compact && styles.editorBodyCompact]}>
        <View style={styles.iconSection}>
          <View style={[styles.iconSearchRow, { backgroundColor: faceBg }]}>
            <PaperGrain opacity={0.22} />
            <HanddrawnFrame color={pencil} />
            <IconSymbol name="magnifyingglass" size={16} color={controlMuted} style={styles.iconSearchGlyph} />
            <ThemedTextInput
              value={iconQuery}
              onChangeText={(query) => {
                resetIconPagination();
                setIconQuery(query);
              }}
              placeholder={t('appearance.iconSearchPlaceholder')}
              placeholderTextColor={controlMuted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={[styles.iconSearchInput, { color: controlInk }]}
              accessibilityLabel={t('appearance.iconSearchA11y')}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.categoryRow}>
            {AVAILABLE_ICON_CATEGORIES.map((categoryId) => {
              const selected = iconCategory === categoryId;
              const label = t(CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS[categoryId]);
              return (
                <Pressable
                  key={categoryId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t('appearance.iconCategoryA11y', { category: label })}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    resetIconPagination();
                    setIconCategory(categoryId);
                  }}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: selected ? MINT_WASH : faceBg },
                  ]}>
                  <PaperGrain opacity={0.2} />
                  <HanddrawnFrame color={selected ? controlInk : pencil} bold={selected} />
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      { color: selected ? controlInk : controlMuted },
                    ]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <ThemedText style={[styles.presetLabel, { color: controlMuted }]}>
            {hasSearchQuery
              ? t('appearance.iconSearchResult', {
                  shown: Math.min(visibleCount, filteredIcons.length),
                  count: filteredIcons.length,
                  total: CUSTOM_FLOW_ICON_OPTIONS.length,
                })
              : iconCategory === 'recommended'
                ? t('appearance.iconRecommended', {
                    shown: Math.min(visibleCount, filteredIcons.length),
                    total: filteredIcons.length,
                  })
                : t('appearance.iconCategoryResult', {
                    category: categoryLabel,
                    shown: Math.min(visibleCount, filteredIcons.length),
                    total: filteredIcons.length,
                  })}
          </ThemedText>
          <View style={styles.iconGridFrame}>
            <ScrollView
              style={{ maxHeight: ICON_LIST_MAX_H }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleIconScroll}
              onContentSizeChange={handleIconContentSizeChange}>
              <View style={styles.iconGrid}>
                {visibleIcons.map((iconName) => {
                  const selected = icon === iconName;
                  return (
                    <View
                      key={iconName}
                      style={[
                        styles.iconChipShell,
                        { width: `${100 / ICON_COLS}%` },
                      ]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t('appearance.pickIconA11y', { name: getRoutineIllustration(iconName)?.labels[locale] ?? iconName })}
                        onPress={() => handleSelectIcon(iconName)}
                        style={[
                          styles.iconChip,
                          {
                            backgroundColor: selected ? MINT_WASH : faceBg,
                          },
                        ]}>
                        <HanddrawnFrame color={selected ? controlInk : pencil} bold={selected} />
                        <IconSymbol
                          name={iconName}
                          size={24}
                          color={controlInk}
                        />
                      </Pressable>
                    </View>
                  );
                })}
                {loadingMore
                  ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                      <View
                        key={`skeleton-${index}`}
                        style={[
                          styles.iconChipShell,
                          { width: `${100 / ICON_COLS}%` },
                        ]}>
                        <View
                          style={[
                            styles.skeletonSlot,
                            { backgroundColor: skeletonFace },
                          ]}>
                          <HanddrawnFrame color={pencil} />
                        </View>
                      </View>
                    ))
                  : null}
              </View>
              {filteredIcons.length === 0 ? (
                <ThemedText style={[styles.emptyIcons, { color: controlMuted }]}>
                  {t('appearance.iconSearchEmpty')}
                </ThemedText>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  rootCompact: {
    gap: 6,
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: -4,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  previewCardIconOnly: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
  },
  previewCardCompact: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  previewIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewIconWrapCompact: {
    width: 34,
    height: 34,
  },
  previewLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    padding: 0,
  },
  previewLabelCompact: {
    fontSize: 14,
  },
  editorBody: {
    gap: 10,
  },
  editorBodyCompact: {
    gap: 8,
  },
  iconSection: {
    gap: 8,
  },
  iconSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 0,
    paddingHorizontal: 12,
    height: 44,
    overflow: 'hidden',
  },
  iconSearchGlyph: {
    marginTop: 1,
  },
  iconSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
    lineHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    height: 44,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingRight: 4,
  },
  categoryChip: {
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  iconGridFrame: {
    borderRadius: 0,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 2,
  },
  iconChipShell: {
    aspectRatio: 1,
    padding: 2,
  },
  skeletonSlot: {
    flex: 1,
    borderRadius: 0,
    opacity: 0.9,
    overflow: 'hidden',
  },
  iconChip: {
    flex: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyIcons: {
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 12,
    textAlign: 'center',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
