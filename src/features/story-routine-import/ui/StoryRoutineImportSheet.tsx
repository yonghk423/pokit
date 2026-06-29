import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SYSTEM_CATALOG_GROUP_KEYS } from '@entities/day-plan';
import {
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
} from '@shared/lib/storage';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { importStoryAsRoutine, type ImportTarget } from '../lib/importStoryAsRoutine';
import { suggestCatalogGroupKey } from '../lib/storyArticleCategoryKey';
import type { StoryRoutineArticle } from '../model/storyRoutinePayload';

type Props = {
  visible: boolean;
  article: StoryRoutineArticle | null;
  onClose: () => void;
};

type DoneState = {
  target: ImportTarget;
  created: boolean;
};

export function StoryRoutineImportSheet({ visible, article, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const [selectedGroupKey, setSelectedGroupKey] = useState('productivity');
  const [done, setDone] = useState<DoneState | null>(null);

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBg = isDark ? '#2C2C2E' : '#F5F5F5';
  const ink = isDark ? '#FAFAFA' : '#1A1A1A';
  const muted = isDark ? '#8E8E93' : '#999999';
  const chipActiveBg = ink;
  const chipActiveText = bg;

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

  const handleImport = useCallback(
    (target: ImportTarget) => {
      if (!article) return;
      const result = importStoryAsRoutine(article, target, selectedGroupKey);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone({ target, created: result.created });
    },
    [article, selectedGroupKey],
  );

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
        <Pressable style={styles.backdropTouch} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }]}>
          {done ? (
            <View style={styles.successContainer}>
              <View style={styles.successBody}>
                <ThemedText style={styles.successEmoji}>✓</ThemedText>
                <ThemedText style={[styles.successTitle, { color: ink }]}>
                  {done.target === 'today'
                    ? done.created
                      ? '오늘 일정에 담았어요'
                      : '오늘 일정에 다시 담았어요'
                    : done.created
                      ? '루틴에 저장했어요'
                      : '루틴 내용을 업데이트했어요'}
                </ThemedText>
                <ThemedText style={[styles.successSub, { color: muted }]}>
                  {done.target === 'today'
                    ? '오늘 탭에서 확인할 수 있어요'
                    : `「${selectedGroupLabel}」에서 확인할 수 있어요`}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="확인"
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: ink, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleClose}>
                <ThemedText style={[styles.primaryBtnText, { color: bg }]}>확인</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.handle} />
              <ThemedText style={[styles.title, { color: ink }]} numberOfLines={2}>
                {article.title}
              </ThemedText>
              {article.summary?.trim() ? (
                <ThemedText style={[styles.summary, { color: muted }]} numberOfLines={3}>
                  {article.summary.trim()}
                </ThemedText>
              ) : null}
              <View style={styles.meta}>
                {article.category ? (
                  <View style={[styles.chip, { backgroundColor: cardBg }]}>
                    <ThemedText style={[styles.chipText, { color: muted }]}>
                      {article.category}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={[styles.chip, { backgroundColor: cardBg }]}>
                  <ThemedText style={[styles.chipText, { color: muted }]}>
                    {durationLabel}
                  </ThemedText>
                </View>
              </View>

              {article.steps && article.steps.length > 0 ? (
                <View style={[styles.stepsCard, { backgroundColor: cardBg }]}>
                  {article.steps.slice(0, 4).map((step, i) => (
                    <ThemedText key={i} style={[styles.stepLine, { color: ink }]} numberOfLines={1}>
                      {i + 1}. {step}
                    </ThemedText>
                  ))}
                </View>
              ) : null}

              <ThemedText style={[styles.sectionLabel, { color: muted }]}>
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
                      onPress={() => setSelectedGroupKey(group.key)}
                      style={[
                        styles.groupChip,
                        {
                          backgroundColor: active ? chipActiveBg : cardBg,
                          borderColor: active
                            ? chipActiveBg
                            : isDark
                              ? 'rgba(255,255,255,0.12)'
                              : 'rgba(0,0,0,0.08)',
                        },
                      ]}>
                      <ThemedText
                        style={[
                          styles.groupChipText,
                          { color: active ? chipActiveText : ink },
                        ]}
                        numberOfLines={1}>
                        {group.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: ink, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => handleImport('today')}>
                  <ThemedText style={[styles.primaryBtnText, { color: bg }]}>
                    오늘 일정에 담기
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => handleImport('catalog')}>
                  <ThemedText style={[styles.secondaryBtnText, { color: ink }]}>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 13,
  },
  stepsCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  stepLine: {
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  groupScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },
  groupRow: {
    gap: 8,
    paddingRight: 4,
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 220,
  },
  groupChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 48,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 8,
    gap: 20,
  },
  successBody: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  successEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
