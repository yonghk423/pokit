import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  categoryReminderLabelKo,
  resolvePriorityRoutineCategoryKey,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import {
  PUZZLE_HISTORY_TARGETS,
  type PuzzleHistoryTarget,
  usePuzzleHistoryStore,
} from '@entities/puzzle-history';
import {
  countCompletionsByCategory,
  countLinkedCompletions,
  syncPuzzleHistoryFromDailyStats,
} from '@features/puzzle-history-sync';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { pickPuzzleHistoryImage } from '@shared/lib/media/pickPuzzleHistoryImage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button/BrutalConfirmButton';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { ThemedView } from '@shared/ui/themed-view';

const PUZZLE_TITLE_MAX_LEN = 24;

/** 루틴 → 사진 → 목표 횟수 → 미리보기 */
type Step = 'routines' | 'photo' | 'target' | 'preview';

/**
 * 오늘 탭 담기에 있고 아직 완료하지 않은 루틴만.
 * (카탈로그 전체가 아니라 「지금 진행 중」인 항목)
 */
function collectTodayInProgressRoutineKeys(
  priorityCategoryOrder: readonly string[],
  completedFocusCategoryKeys: readonly string[],
): string[] {
  /** 담기 완료 체크 — 정확 키만 (구간 키 `category@slot`은 부분 완료로 둠) */
  const completedExact = new Set(
    completedFocusCategoryKeys.map((k) => k.trim()).filter(Boolean),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of priorityCategoryOrder) {
    const trimmed = raw.trim();
    const key = resolvePriorityRoutineCategoryKey(trimmed);
    if (!key || seen.has(key)) continue;
    if (completedExact.has(trimmed) || completedExact.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function PuzzleHistoryStartPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const params = useLocalSearchParams<{ mode?: string; id?: string }>();
  const replaceImage = params.mode === 'replace-image';

  const hydrate = usePuzzleHistoryStore((s) => s.hydrate);
  const startHistory = usePuzzleHistoryStore((s) => s.startHistory);
  const replaceHistoryImage = usePuzzleHistoryStore((s) => s.replaceHistoryImage);
  const replaceActiveImage = usePuzzleHistoryStore((s) => s.replaceActiveImage);
  const replaceHistoryId =
    typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;

  const categoryLabelEpoch = useDayPlanDraftStore((s) => s.categoryLabelEpoch);
  const priorityCategoryOrder = useDayPlanDraftStore((s) => s.priorityCategoryOrder);
  const completedFocusCategoryKeys = useDayPlanDraftStore((s) => s.completedFocusCategoryKeys);

  const [step, setStep] = useState<Step>(() => (replaceImage ? 'photo' : 'routines'));
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [targetCount, setTargetCount] = useState<PuzzleHistoryTarget>(1);
  const [linkedKeys, setLinkedKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const defaultTitle = t('history.puzzle.defaultTitle', { count: targetCount });

  const selectableKeys = useMemo(() => {
    void categoryLabelEpoch;
    return collectTodayInProgressRoutineKeys(priorityCategoryOrder, completedFocusCategoryKeys);
  }, [categoryLabelEpoch, completedFocusCategoryKeys, priorityCategoryOrder]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setLinkedKeys((prev) => {
      const kept = prev.filter((k) => selectableKeys.includes(k));
      if (kept.length > 0) return kept;
      return selectableKeys.slice(0, 1);
    });
  }, [selectableKeys]);

  const linkedLabels = useMemo(
    () => linkedKeys.map((key) => categoryReminderLabelKo(key)),
    [linkedKeys],
  );

  const toggleLinked = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setLinkedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const pickPhoto = useCallback(async () => {
    if (busy) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      const result = await pickPuzzleHistoryImage();
      if (!result.ok) {
        if (result.reason === 'permission_denied') {
          Alert.alert(
            t('history.puzzle.permissionTitle'),
            t('history.puzzle.permissionBody'),
          );
        } else if (result.reason === 'error' || result.reason === 'module_unavailable') {
          Alert.alert(t('history.puzzle.pickErrorTitle'), t('history.puzzle.pickErrorBody'));
        }
        // cancelled — 조용히 유지
        return;
      }
      setImageUri(result.uri);
      setThumbnailUri(result.thumbnailUri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (replaceImage) {
        if (replaceHistoryId) {
          replaceHistoryImage(replaceHistoryId, result.uri, result.thumbnailUri);
        } else {
          replaceActiveImage(result.uri, result.thumbnailUri);
        }
        router.back();
        return;
      }
      // 사진 확정 후 목표 단계로 이동
      setStep('target');
    } catch {
      Alert.alert(t('history.puzzle.pickErrorTitle'), t('history.puzzle.pickErrorBody'));
    } finally {
      setBusy(false);
    }
  }, [busy, replaceActiveImage, replaceHistoryId, replaceHistoryImage, replaceImage, t]);

  const confirmStart = useCallback(() => {
    if (!imageUri) return;
    if (linkedKeys.length === 0) {
      Alert.alert(t('history.puzzle.routinesNeedOne'));
      setStep('routines');
      return;
    }
    const history = useHistoryStore.getState();
    if (!history.isHydrated) history.hydrate();
    const completionBaselineByCategory = countCompletionsByCategory(
      linkedKeys,
      history.dailyStatsByDate,
    );
    const completionBaseline = countLinkedCompletions(
      linkedKeys,
      history.dailyStatsByDate,
    );
    const title = titleDraft.trim() || defaultTitle;
    const created = startHistory({
      title,
      imageUri,
      thumbnailUri: thumbnailUri ?? imageUri,
      targetCount,
      linkedCategoryKeys: linkedKeys,
      completionBaseline,
      completionBaselineByCategory,
    });
    if (!created) {
      Alert.alert(t('history.puzzle.pickErrorTitle'), t('history.puzzle.pickErrorBody'));
      return;
    }
    syncPuzzleHistoryFromDailyStats();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/puzzle-history');
  }, [defaultTitle, imageUri, linkedKeys, startHistory, t, targetCount, thumbnailUri, titleDraft]);

  return (
    <ThemedView style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={10}
          onPress={() => {
            void Haptics.selectionAsync();
            if (step === 'preview') setStep('target');
            else if (step === 'target') setStep('photo');
            else if (step === 'photo' && !replaceImage) setStep('routines');
            else if (router.canGoBack()) router.back();
            else router.replace('/puzzle-history');
          }}
          style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={18} color={c.text} />
        </Pressable>
        <ThemedText style={[styles.topTitle, { color: c.text }]}>
          {replaceImage ? t('history.puzzle.reselectPhoto') : t('history.puzzle.startTitle')}
        </ThemedText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        {step === 'routines' ? (
          <View style={styles.section}>
            <ThemedText style={[styles.headline, { color: c.text }]}>
              {t('history.puzzle.routinesHeadline')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: c.textMuted }]}>
              {t('history.puzzle.routinesBody')}
            </ThemedText>
            {selectableKeys.length === 0 ? (
              <ThemedText style={[styles.sub, { color: c.textMuted }]}>
                {t('history.puzzle.routinesEmpty')}
              </ThemedText>
            ) : (
              <View style={styles.routineList}>
                {selectableKeys.map((key) => {
                  const selected = linkedKeys.includes(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={categoryReminderLabelKo(key)}
                      onPress={() => toggleLinked(key)}
                      style={[
                        styles.routineRow,
                        {
                          backgroundColor: selected
                            ? isDark
                              ? RetroFlatColors.dark.bgMint
                              : RetroFlatColors.light.bgMint
                            : c.surfaceAlt,
                          borderColor: selected ? c.text : 'transparent',
                        },
                      ]}>
                      <ThemedText style={[styles.routineLabel, { color: c.text }]} numberOfLines={2}>
                        {categoryReminderLabelKo(key)}
                      </ThemedText>
                      <ThemedText style={[styles.routineCheck, { color: c.text }]}>
                        {selected ? '✓' : ''}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <BrutalConfirmButton
              align="stretch"
              label={t('history.puzzle.nextPhoto')}
              disabled={linkedKeys.length === 0}
              onPress={() => {
                if (linkedKeys.length === 0) {
                  Alert.alert(t('history.puzzle.routinesNeedOne'));
                  return;
                }
                void Haptics.selectionAsync();
                setStep('photo');
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {step === 'photo' ? (
          <View style={styles.section}>
            <ThemedText style={[styles.headline, { color: c.text }]}>
              {t('history.puzzle.pickPhotoHeadline')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: c.textMuted }]}>
              {t('history.puzzle.pickPhotoBody')}
            </ThemedText>
            {!replaceImage ? (
              <View style={styles.titleField}>
                <ThemedText style={[styles.titleLabel, { color: c.text }]}>
                  {t('history.puzzle.titleLabel')}
                </ThemedText>
                <ThemedTextInput
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  maxLength={PUZZLE_TITLE_MAX_LEN}
                  placeholder={t('history.puzzle.titlePlaceholder')}
                  placeholderTextColor={c.textMuted}
                  returnKeyType="done"
                  accessibilityLabel={t('history.puzzle.titleLabel')}
                  style={[
                    styles.titleInput,
                    {
                      color: c.text,
                      backgroundColor: isDark ? c.surfaceAlt : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
                    },
                  ]}
                />
              </View>
            ) : null}
            {imageUri ? (
              <Image
                source={{ uri: thumbnailUri ?? imageUri }}
                style={styles.preview}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.previewPlaceholder, { backgroundColor: c.surfaceAlt }]}>
                <IconSymbol name="photo" size={36} color={c.textMuted} />
              </View>
            )}
            <BrutalConfirmButton
              align="stretch"
              label={busy ? t('history.puzzle.picking') : t('history.puzzle.pickPhotoCta')}
              disabled={busy}
              onPress={() => {
                void pickPhoto();
              }}
            />
            {imageUri && !replaceImage && !busy ? (
              <BrutalConfirmButton
                align="stretch"
                label={t('history.puzzle.nextTarget')}
                fill={isDark ? RetroFlatColors.dark.surfaceAlt : RetroFlatColors.light.surfaceAlt}
                labelColor={c.text}
                shadowColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setStep('target');
                }}
                style={{ marginTop: 4 }}
              />
            ) : null}
            {busy ? <ActivityIndicator color={c.text} style={{ marginTop: 12 }} /> : null}
          </View>
        ) : null}

        {step === 'target' ? (
          <View style={styles.section}>
            <ThemedText style={[styles.headline, { color: c.text }]}>
              {t('history.puzzle.targetHeadline')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: c.textMuted }]}>
              {t('history.puzzle.targetBody')}
            </ThemedText>
            <View style={styles.durationGrid}>
              {PUZZLE_HISTORY_TARGETS.map((count) => {
                const selected = targetCount === count;
                return (
                  <Pressable
                    key={count}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t('history.puzzle.targetOption', { count })}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setTargetCount(count);
                    }}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: selected
                          ? isDark
                            ? c.primary
                            : c.primaryContainer
                          : c.surfaceAlt,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.durationChipText,
                        { color: selected ? (isDark ? c.primaryOn : '#000') : c.text },
                      ]}>
                      {t('history.puzzle.targetOption', { count })}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <BrutalConfirmButton
              align="stretch"
              label={t('history.puzzle.nextPreview')}
              onPress={() => {
                void Haptics.selectionAsync();
                setStep('preview');
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : null}

        {step === 'preview' && imageUri ? (
          <View style={styles.section}>
            <ThemedText style={[styles.headline, { color: c.text }]}>
              {t('history.puzzle.previewHeadline')}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: c.textMuted }]}>
              {t('history.puzzle.previewBody', { count: targetCount })}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: c.textMuted }]}>
              {t('history.puzzle.previewRoutines', {
                labels: linkedLabels.join(', '),
              })}
            </ThemedText>
            <View style={styles.titleField}>
              <ThemedText style={[styles.titleLabel, { color: c.text }]}>
                {t('history.puzzle.titleLabel')}
              </ThemedText>
              <ThemedTextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                maxLength={PUZZLE_TITLE_MAX_LEN}
                placeholder={defaultTitle}
                placeholderTextColor={c.textMuted}
                returnKeyType="done"
                accessibilityLabel={t('history.puzzle.titleLabel')}
                style={[
                  styles.titleInput,
                  {
                    color: c.text,
                    backgroundColor: isDark ? c.surfaceAlt : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
                  },
                ]}
              />
            </View>
            <Image
              source={{ uri: thumbnailUri ?? imageUri }}
              style={styles.preview}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <BrutalConfirmButton
              align="stretch"
              label={t('history.puzzle.confirmStart')}
              onPress={confirmStart}
            />
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  section: { gap: 12 },
  headline: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  sub: { fontSize: 14, lineHeight: 20 },
  titleField: { gap: 6 },
  titleLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginVertical: 8,
  },
  previewPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  durationChip: {
    width: '47%',
    flexGrow: 0,
    paddingVertical: 16,
    borderRadius: 0,
    alignItems: 'center',
  },
  durationChipText: { fontSize: 16, fontWeight: '700' },
  routineList: { gap: 8, marginTop: 4 },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 10,
  },
  routineLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  routineCheck: { fontSize: 16, fontWeight: '800', minWidth: 18, textAlign: 'right' },
});
