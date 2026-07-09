import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SYSTEM_CATALOG_GROUP_KEYS } from '@entities/day-plan';
import {
  CityPopSpacing,
  CityPopTypography,
  RetroFlatColors,
  RETRO_BORDER_WIDTH,
  retroBorderFor,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { importStoryAsRoutine } from '../lib/importStoryAsRoutine';
import { suggestCatalogGroupKey } from '../lib/storyArticleCategoryKey';
import type { StoryRoutineArticle } from '../model/storyRoutinePayload';

type Props = {
  visible: boolean;
  article: StoryRoutineArticle | null;
  onClose: () => void;
};

type DoneState = {
  created: boolean;
};

function sheetPalette(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: c.bg,
    surface: c.surface,
    surfaceAlt: c.surfaceAlt,
    ink: c.text,
    muted: c.textMuted,
    border: c.border,
    primary: c.primary,
    primaryOn: c.primaryOn,
    chipBg: isDark ? c.surfaceContainer : c.primaryContainer,
  };
}

export function StoryRoutineImportSheet({ visible, article, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const palette = sheetPalette(isDark);
  const [selectedGroupKey, setSelectedGroupKey] = useState('productivity');
  const [done, setDone] = useState<DoneState | null>(null);

  const groupOptions = useMemo(() => {
    const system = (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).map((key) => ({
      key,
      label: resolveSystemCatalogGroupLabel(key),
    }));
    const custom = listCustomCatalogGroups().map((g) => ({
      key: g.key,
      label: g.label,
    }));
    return [...system, ...custom];
  }, [visible]);

  useEffect(() => {
    if (!visible || !article) return;
    setDone(null);
    setSelectedGroupKey(suggestCatalogGroupKey(article));
  }, [visible, article]);

  const handleImport = useCallback(() => {
    if (!article) return;
    const result = importStoryAsRoutine(article, selectedGroupKey);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone({ created: result.created });
  }, [article, selectedGroupKey]);

  const handleClose = useCallback(() => {
    setDone(null);
    onClose();
  }, [onClose]);

  if (!article) return null;

  const durationLabel = `${article.durationMinutes}분`;
  const selectedGroupLabel =
    groupOptions.find((g) => g.key === selectedGroupKey)?.label ?? '루틴';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={handleClose} accessibilityLabel="닫기" />
        <View
          style={[
            styles.sheet,
            retroBorderFor(isDark),
            {
              backgroundColor: palette.bg,
              borderBottomWidth: 0,
              paddingBottom: insets.bottom + CityPopSpacing.sm,
            },
          ]}>
          {done ? (
            <View style={styles.successContainer}>
              <View style={[styles.successIconWrap, retroBorderFor(isDark), { backgroundColor: palette.surface }]}>
                <IconSymbol name="checkmark" size={22} color={palette.ink} />
              </View>
              <ThemedText style={[styles.successTitle, { color: palette.ink }]}>
                {done.created ? '루틴에 저장했어요' : '루틴 내용을 업데이트했어요'}
              </ThemedText>
              <ThemedText style={[styles.successSub, { color: palette.muted }]}>
                {`「${selectedGroupLabel}」에서 확인할 수 있어요`}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="확인"
                style={({ pressed }) => [
                  styles.primaryBtn,
                  retroBorderFor(isDark),
                  {
                    backgroundColor: palette.ink,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
                onPress={handleClose}>
                <ThemedText style={[styles.primaryBtnText, { color: palette.bg }]}>확인</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <View style={[styles.handle, { backgroundColor: palette.muted }]} />
              </View>

              <View style={styles.titleRow}>
                <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={3}>
                  {article.title}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                  hitSlop={12}
                  onPress={handleClose}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
                  <IconSymbol name="xmark" size={18} color={palette.ink} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {article.summary?.trim() ? (
                  <ThemedText style={[styles.summary, { color: palette.muted }]} numberOfLines={4}>
                    {article.summary.trim()}
                  </ThemedText>
                ) : null}

                <View style={styles.metaRow}>
                  {article.category ? (
                    <View
                      style={[
                        styles.metaChip,
                        retroBorderFor(isDark),
                        { backgroundColor: palette.chipBg },
                      ]}>
                      <ThemedText style={[styles.metaChipText, { color: palette.ink }]}>
                        {article.category}
                      </ThemedText>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.metaChip,
                      retroBorderFor(isDark),
                      { backgroundColor: palette.surface },
                    ]}>
                    <IconSymbol name="clock" size={11} color={palette.muted} />
                    <ThemedText style={[styles.metaChipText, { color: palette.ink }]}>
                      {durationLabel}
                    </ThemedText>
                  </View>
                </View>

                {article.steps && article.steps.length > 0 ? (
                  <View
                    style={[
                      styles.stepsCard,
                      retroBorderFor(isDark),
                      { backgroundColor: palette.surfaceAlt },
                    ]}>
                    {article.steps.slice(0, 4).map((step, i) => (
                      <View key={i} style={styles.stepRow}>
                        <ThemedText style={[styles.stepIndex, { color: palette.muted }]}>
                          {String(i + 1).padStart(2, '0')}
                        </ThemedText>
                        <ThemedText style={[styles.stepLine, { color: palette.ink }]} numberOfLines={2}>
                          {step}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
                  저장할 카테고리
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupRow}
                  style={styles.groupScroll}>
                  {groupOptions.map((group) => {
                    const active = group.key === selectedGroupKey;
                    return (
                      <Pressable
                        key={group.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setSelectedGroupKey(group.key);
                        }}
                        style={[
                          styles.groupChip,
                          retroBorderFor(isDark),
                          {
                            backgroundColor: active ? palette.ink : palette.surface,
                            borderColor: active ? palette.ink : palette.border,
                          },
                        ]}>
                        <ThemedText
                          style={[
                            styles.groupChipText,
                            { color: active ? palette.bg : palette.ink },
                          ]}
                          numberOfLines={1}>
                          {group.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </ScrollView>

              <View style={[styles.actions, { borderTopColor: palette.border }]}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    retroBorderFor(isDark),
                    {
                      backgroundColor: palette.ink,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                  onPress={handleImport}>
                  <ThemedText style={[styles.primaryBtnText, { color: palette.bg }]}>
                    루틴에 저장
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    maxHeight: '88%',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: CityPopSpacing.sm,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingBottom: CityPopSpacing.xs,
  },
  handle: {
    width: 40,
    height: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingBottom: CityPopSpacing.sm,
    zIndex: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: -4,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingBottom: CityPopSpacing.sm,
    gap: CityPopSpacing.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.35,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CityPopSpacing.base,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  stepsCard: {
    padding: CityPopSpacing.sm,
    gap: CityPopSpacing.base,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepIndex: {
    width: 22,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 18,
  },
  stepLine: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  sectionLabel: {
    ...CityPopTypography.labelMd,
    marginTop: CityPopSpacing.xs,
  },
  groupScroll: {
    flexGrow: 0,
    marginHorizontal: -CityPopSpacing.marginMobile,
  },
  groupRow: {
    gap: CityPopSpacing.base,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingBottom: 2,
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 220,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  actions: {
    gap: CityPopSpacing.base,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: CityPopSpacing.sm,
    borderTopWidth: RETRO_BORDER_WIDTH,
  },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: CityPopSpacing.gutter,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  successContainer: {
    alignItems: 'center',
    gap: CityPopSpacing.sm,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: CityPopSpacing.md,
    paddingBottom: CityPopSpacing.sm,
  },
  successIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: CityPopSpacing.xs,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: CityPopSpacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
});
