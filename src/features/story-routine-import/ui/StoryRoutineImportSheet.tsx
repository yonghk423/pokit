import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CityPopSpacing,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { importStoryAsRoutine } from '../lib/importStoryAsRoutine';
import type { StoryRoutineArticle } from '../model/storyRoutinePayload';

type Props = {
  visible: boolean;
  article: StoryRoutineArticle | null;
  onClose: () => void;
};

type DoneState = {
  created: boolean;
};

const CHIP_SHADOW = 2;

function sheetPalette(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: isDark ? c.surface : '#FFFFFF',
    surface: isDark ? c.surfaceAlt : '#FFFFFF',
    surfaceAlt: isDark ? c.surfaceContainer : c.bg,
    ink: c.text,
    muted: c.textMuted,
    primary: c.primary,
    primaryContainer: isDark ? c.bgMint : c.primaryContainer,
    closeBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    shadowInk: isDark ? c.solidShadow : '#000000',
    handle: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
  };
}

export function StoryRoutineImportSheet({ visible, article, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const palette = sheetPalette(isDark);
  const [done, setDone] = useState<DoneState | null>(null);

  useEffect(() => {
    if (!visible || !article) return;
    setDone(null);
  }, [visible, article]);

  const handleImport = useCallback(() => {
    if (!article) return;
    const result = importStoryAsRoutine(article);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDone({ created: result.created });
  }, [article]);

  const handleClose = useCallback(() => {
    setDone(null);
    onClose();
  }, [onClose]);

  if (!article) return null;

  const durationLabel = t('common.durationMinutes', { count: article.durationMinutes });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropTouch}
          onPress={handleClose}
          accessibilityLabel={t('storyImport.closeA11y')}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.bg,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}>
          {done ? (
            <View style={styles.successContainer}>
              <View
                style={[
                  styles.successIconShell,
                  { marginRight: SOLID_SHADOW_OFFSET, marginBottom: SOLID_SHADOW_OFFSET },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.successIconShadow,
                    {
                      backgroundColor: palette.shadowInk,
                      transform: [
                        { translateX: SOLID_SHADOW_OFFSET },
                        { translateY: SOLID_SHADOW_OFFSET },
                      ],
                    },
                  ]}
                />
                <View style={[styles.successIconFace, { backgroundColor: palette.primaryContainer }]}>
                  <IconSymbol name="checkmark" size={22} color={palette.primary} />
                </View>
              </View>
              <ThemedText style={[styles.successTitle, { color: palette.ink }]}>
                {done.created ? t('storyImport.savedCreate') : t('storyImport.savedUpdate')}
              </ThemedText>
              <ThemedText style={[styles.successSub, { color: palette.muted }]}>
                {t('storyImport.savedHint')}
              </ThemedText>
              <BrutalConfirmButton
                align="stretch"
                onPress={handleClose}
                style={styles.successConfirm}
              />
            </View>
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <View style={[styles.handle, { backgroundColor: palette.handle }]} />
              </View>

              <View style={styles.titleRow}>
                <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={3}>
                  {article.title}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('storyImport.closeA11y')}
                  hitSlop={12}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    handleClose();
                  }}
                  style={[styles.closeBtn, { backgroundColor: palette.closeBg }]}>
                  <IconSymbol name="xmark" size={13} color={palette.muted} />
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
                        styles.metaChipShell,
                        { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                      ]}>
                      <View
                        pointerEvents="none"
                        style={[
                          styles.metaChipShadow,
                          {
                            backgroundColor: palette.shadowInk,
                            transform: [{ translateX: CHIP_SHADOW }, { translateY: CHIP_SHADOW }],
                          },
                        ]}
                      />
                      <View
                        style={[styles.metaChipFace, { backgroundColor: palette.primaryContainer }]}>
                        <ThemedText style={[styles.metaChipText, { color: palette.primary }]}>
                          {article.category}
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.metaChipShell,
                      { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                    ]}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.metaChipShadow,
                        {
                          backgroundColor: palette.shadowInk,
                          transform: [{ translateX: CHIP_SHADOW }, { translateY: CHIP_SHADOW }],
                        },
                      ]}
                    />
                    <View style={[styles.metaChipFace, { backgroundColor: palette.surface }]}>
                      <IconSymbol name="clock" size={11} color={palette.muted} />
                      <ThemedText style={[styles.metaChipText, { color: palette.ink }]}>
                        {durationLabel}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {article.steps && article.steps.length > 0 ? (
                  <View style={[styles.stepsCard, { backgroundColor: palette.surfaceAlt }]}>
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
              </ScrollView>

              <View style={styles.actions}>
                <BrutalConfirmButton
                  align="stretch"
                  label={t('storyImport.saveToRoutine')}
                  accessibilityLabel={t('storyImport.saveToRoutine')}
                  onPress={handleImport}
                />
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
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingBottom: CityPopSpacing.sm,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
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
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.1,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CityPopSpacing.base,
  },
  metaChipShell: {
    position: 'relative',
  },
  metaChipShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  metaChipFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 1,
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
  actions: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: CityPopSpacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    gap: CityPopSpacing.sm,
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: CityPopSpacing.md,
    paddingBottom: CityPopSpacing.sm,
  },
  successConfirm: {
    alignSelf: 'stretch',
    marginTop: CityPopSpacing.xs,
  },
  successIconShell: {
    width: 48,
    height: 48,
    position: 'relative',
    marginBottom: CityPopSpacing.xs,
  },
  successIconShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  successIconFace: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
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
});
