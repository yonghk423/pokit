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
import { PrimaryColor } from '@shared/config/theme';
import { contrastingForeground } from '@shared/lib/colorMath';
import {
  CUSTOM_FLOW_ACCENT_COLOR_OPTIONS,
  CUSTOM_FLOW_ICON_CATEGORY_IDS,
  CUSTOM_FLOW_ICON_CATEGORY_I18N_KEYS,
  CUSTOM_FLOW_ICON_OPTIONS,
  filterCustomFlowIcons,
  type CustomFlowIconCategoryId,
  type CustomFlowIconOption,
} from '@shared/lib/customFlowAppearanceCatalog';
import { useTranslation } from '@shared/lib/i18n';
import { HsvColorPicker } from '@shared/ui/hsv-color-picker';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

const CHIP_SHADOW = 2;
const ICON_LIST_MAX_H = 220;
const ICON_COLS = 8;
/** 색상 칩은 아이콘보다 작게 — 열을 늘려 셀 폭을 줄인다 */
const COLOR_COLS = 9;
/** 한 번에 그리는 아이콘 수 (8열 × 5행) */
const ICON_PAGE_SIZE = 40;
const SKELETON_COUNT = ICON_COLS * 2;
const LOAD_MORE_DELAY_MS = 140;
/** 설정 탭과 같은 옅은 솔리드 음영 — 순검정 대신 */
const SOFT_SHADOW_LIGHT = 'rgba(24, 26, 46, 0.22)';
const SOFT_SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';


export type CustomFlowAppearancePickerProps = {
  icon: CustomFlowIconOption;
  accentColor: string;
  onChangeIcon: (icon: CustomFlowIconOption) => void;
  /** 프리셋 탭·HSV 확정 시 — 영속화에 적합 */
  onChangeAccentColor: (color: string) => void;
  /** HSV 드래그 중 미리보기만 (없으면 onChangeAccentColor로 매 프레임 전달) */
  onAccentColorPreview?: (color: string) => void;
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
  accentColor,
  onChangeIcon,
  onChangeAccentColor,
  onAccentColorPreview,
  previewLabel,
  onChangePreviewLabel,
  onPreviewLabelFocus,
  onPreviewLabelBlur,
  isDark,
  ink,
  muted,
  line,
  hint,
  compact = false,
}: CustomFlowAppearancePickerProps) {
  const { t } = useTranslation();
  const [iconQuery, setIconQuery] = useState('');
  const [iconCategory, setIconCategory] = useState<CustomFlowIconCategoryId>('recommended');
  const [visibleCount, setVisibleCount] = useState(ICON_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const loadMoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedPreviewLabel = previewLabel ?? t('common.preview');
  const resolvedHint = hint ?? t('appearance.hint');
  const border = line ?? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)');
  const cardBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const chipIdleBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const shadowInk = isDark ? SOFT_SHADOW_DARK : SOFT_SHADOW_LIGHT;
  const accentOnChip = contrastingForeground(accentColor);
  const skeletonFace = isDark ? RetroFlatColors.dark.surfaceAlt : '#F3F3F5';
  const skeletonBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  const categoryChipIdleBg = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';

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

  useEffect(() => {
    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current);
      loadMoreTimerRef.current = null;
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setVisibleCount(ICON_PAGE_SIZE);
  }, [iconQuery, iconCategory]);

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
      <ThemedText style={[styles.fieldLabel, compact && styles.fieldLabelCompact, { color: ink }]}>
        {t('appearance.iconColor')}
      </ThemedText>
      {resolvedHint.length > 0 ? (
        <ThemedText style={[styles.fieldHint, { color: muted }]}>{resolvedHint}</ThemedText>
      ) : null}

      <View
        style={[
          styles.previewShell,
          { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.solidShadow,
            {
              backgroundColor: shadowInk,
              transform: [{ translateX: CHIP_SHADOW }, { translateY: CHIP_SHADOW }],
            },
          ]}
        />
        <View
          style={[
            styles.previewCard,
            compact && styles.previewCardCompact,
            { backgroundColor: cardBg },
          ]}>
          <View
            style={[
              styles.previewIconWrap,
              compact && styles.previewIconWrapCompact,
              { backgroundColor: accentColor },
            ]}>
            <IconSymbol name={icon} size={compact ? 18 : 22} color={accentOnChip} />
          </View>
          {onChangePreviewLabel ? (
            <ThemedTextInput
              value={resolvedPreviewLabel}
              onChangeText={onChangePreviewLabel}
              onFocus={onPreviewLabelFocus}
              onBlur={onPreviewLabelBlur}
              accessibilityLabel={t('appearance.renameA11y')}
              placeholder={t('appearance.renameA11y')}
              placeholderTextColor={muted}
              maxLength={40}
              returnKeyType="done"
              style={[styles.previewLabel, compact && styles.previewLabelCompact, { color: ink }]}
            />
          ) : (
            <ThemedText
              style={[styles.previewLabel, compact && styles.previewLabelCompact, { color: ink }]}
              numberOfLines={1}>
              {resolvedPreviewLabel}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={[styles.editorBody, compact && styles.editorBodyCompact]}>
        <View style={styles.iconSection}>
          <View
            style={[
              styles.iconSearchShell,
              { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.solidShadow,
                {
                  backgroundColor: shadowInk,
                  transform: [{ translateX: CHIP_SHADOW }, { translateY: CHIP_SHADOW }],
                },
              ]}
            />
            <View
              style={[
                styles.iconSearchRow,
                {
                  backgroundColor: isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF',
                },
              ]}>
              <IconSymbol name="magnifyingglass" size={16} color={muted} style={styles.iconSearchGlyph} />
              <ThemedTextInput
                value={iconQuery}
                onChangeText={setIconQuery}
                placeholder={t('appearance.iconSearchPlaceholder')}
                placeholderTextColor={muted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
                style={[styles.iconSearchInput, { color: ink }]}
                accessibilityLabel={t('appearance.iconSearchA11y')}
              />
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.categoryRow}>
            {CUSTOM_FLOW_ICON_CATEGORY_IDS.map((categoryId) => {
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
                    setIconCategory(categoryId);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? accentColor : categoryChipIdleBg,
                      borderColor: selected ? accentColor : border,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      { color: selected ? accentOnChip : muted },
                    ]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <ThemedText style={[styles.presetLabel, { color: muted }]}>
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
                      {
                        width: `${100 / ICON_COLS}%`,
                        paddingRight: CHIP_SHADOW,
                        paddingBottom: CHIP_SHADOW,
                      },
                    ]}>
                    <View style={styles.chipSlot}>
                      <View
                        pointerEvents="none"
                        style={[
                          styles.solidShadow,
                          {
                            backgroundColor: shadowInk,
                            transform: [
                              { translateX: CHIP_SHADOW },
                              { translateY: CHIP_SHADOW },
                            ],
                          },
                        ]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t('appearance.pickIconA11y', { name: iconName })}
                        onPress={() => handleSelectIcon(iconName)}
                        style={[
                          styles.iconChip,
                          {
                            backgroundColor: selected ? accentColor : chipIdleBg,
                          },
                        ]}>
                        <IconSymbol
                          name={iconName}
                          size={18}
                          color={selected ? accentOnChip : muted}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {loadingMore
                ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                    <View
                      key={`skeleton-${index}`}
                      style={[
                        styles.iconChipShell,
                        {
                          width: `${100 / ICON_COLS}%`,
                          paddingRight: CHIP_SHADOW,
                          paddingBottom: CHIP_SHADOW,
                        },
                      ]}>
                      <View
                        style={[
                          styles.chipSlot,
                          styles.skeletonSlot,
                          {
                            backgroundColor: skeletonFace,
                            borderColor: skeletonBorder,
                          },
                        ]}
                      />
                    </View>
                  ))
                : null}
            </View>
            {filteredIcons.length === 0 ? (
              <ThemedText style={[styles.emptyIcons, { color: muted }]}>
                {t('appearance.iconSearchEmpty')}
              </ThemedText>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.colorSection}>
          <ThemedText style={[styles.presetLabel, { color: muted }]}>{t('common.color')}</ThemedText>
          <View style={styles.colorGrid}>
            {CUSTOM_FLOW_ACCENT_COLOR_OPTIONS.map((color) => {
              const selected = accentColor.toLowerCase() === color;
              return (
                <View
                  key={color}
                  style={[
                    styles.swatchShell,
                    {
                      width: `${100 / COLOR_COLS}%`,
                      paddingRight: CHIP_SHADOW,
                      paddingBottom: CHIP_SHADOW,
                    },
                  ]}>
                  <View style={styles.chipSlot}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.solidShadow,
                        {
                          backgroundColor: selected ? PrimaryColor.rgb : shadowInk,
                          transform: [
                            { translateX: CHIP_SHADOW },
                            { translateY: CHIP_SHADOW },
                          ],
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t('appearance.pickColorA11y')}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        onChangeAccentColor(color);
                      }}
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor: color,
                        },
                      ]}>
                      {selected ? (
                        <IconSymbol
                          name="checkmark"
                          size={12}
                          color={contrastingForeground(color)}
                        />
                      ) : null}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <HsvColorPicker
          value={accentColor}
          onChange={onAccentColorPreview ?? onChangeAccentColor}
          onChangeEnd={onAccentColorPreview ? onChangeAccentColor : undefined}
          ink={ink}
          muted={muted}
          isDark={isDark}
          line={border}
        />
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  fieldLabelCompact: {
    fontSize: 12,
    fontWeight: '800',
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: -4,
  },
  previewShell: {
    position: 'relative',
  },
  solidShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1,
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
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  iconSearchShell: {
    position: 'relative',
  },
  iconSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 12,
    height: 44,
    zIndex: 1,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 2,
  },
  iconChipShell: {
    overflow: 'visible',
  },
  chipSlot: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  skeletonSlot: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    opacity: 0.9,
  },
  iconChip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  emptyIcons: {
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 12,
    textAlign: 'center',
  },
  colorSection: {
    gap: 8,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatchShell: {
    overflow: 'visible',
  },
  colorSwatch: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
