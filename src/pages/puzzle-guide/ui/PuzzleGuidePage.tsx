import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CityPopSpacing,
  RetroFlatColors,
  cityPopFont,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  getPuzzleGuideImage,
  prefetchPuzzleGuideAssets,
  PUZZLE_GUIDE_STAGE_CREAM,
  PUZZLE_GUIDE_STAGE_CREAM_DARK,
} from '@shared/lib/puzzle-guide-assets';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { getPuzzleGuideSlides } from '../lib/puzzleGuideContent';

const SWIPE_THRESHOLD = 56;
/** 오늘 탭 상단 아이콘(SettingsTopBarButton)과 동일 오프셋·톤 */
const SOFT_SHADOW = 2;
const SOFT_SHADOW_LIGHT = 'rgba(24, 26, 46, 0.22)';
const SOFT_SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';

/** 퍼즐 설명서 — 사진·짧은 설명. 넘김은 즉시 전환(흔들림 애니메이션 없음). */
export function PuzzleGuidePage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const slides = useMemo(() => getPuzzleGuideSlides(locale), [locale]);
  const [index, setIndex] = useState(0);
  const [loadedIds, setLoadedIds] = useState<Record<string, true>>({});
  const last = index >= slides.length - 1;
  const item = slides[index]!;
  const softShadow = isDark ? SOFT_SHADOW_DARK : SOFT_SHADOW_LIGHT;
  const progressRatio = index / Math.max(1, slides.length - 1);
  const stageCream = isDark ? PUZZLE_GUIDE_STAGE_CREAM_DARK : PUZZLE_GUIDE_STAGE_CREAM;
  const currentLoaded = Boolean(loadedIds[item.id]);
  const skeletonPulse = useRef(new Animated.Value(0.55)).current;
  const skeletonFace = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const skeletonBlock = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    if (currentLoaded) {
      skeletonPulse.stopAnimation();
      skeletonPulse.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [currentLoaded, skeletonPulse]);

  const mountedIndexes = useMemo(() => {
    const next = new Set<number>([index]);
    if (index > 0) next.add(index - 1);
    if (index < slides.length - 1) next.add(index + 1);
    // 첫 진입 시 다음 장까지 미리 마운트
    if (index === 0 && slides.length > 2) next.add(2);
    return [...next].sort((a, b) => a - b);
  }, [index, slides.length]);

  useEffect(() => {
    void prefetchPuzzleGuideAssets();
  }, []);

  const markLoaded = useCallback((id: string) => {
    setLoadedIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const finish = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    close();
  }, [close]);

  const goNext = useCallback(() => {
    if (last) {
      finish();
      return;
    }
    setIndex((i) => Math.min(i + 1, slides.length - 1));
    void Haptics.selectionAsync();
  }, [finish, last, slides.length]);

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    setIndex((i) => Math.max(i - 1, 0));
    void Haptics.selectionAsync();
  }, [index]);

  const swipe = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-28, 28])
    .onEnd((e) => {
      const shouldNext = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -650;
      const shouldPrev = e.translationX > SWIPE_THRESHOLD || e.velocityX > 650;
      if (shouldNext) {
        runOnJS(goNext)();
      } else if (shouldPrev) {
        runOnJS(goPrev)();
      }
    });

  const accentFace = isDark ? item.accentDark : item.accent;
  const chipInk = isDark ? '#F1EFFF' : rf.text;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: rf.bg }]} lightColor={rf.bg} darkColor={rf.bg}>
      <View
        pointerEvents="none"
        style={[styles.accentWash, { backgroundColor: accentFace }]}
      />

      <View style={[styles.column, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <ThemedText
              style={[styles.pageLabel, { color: rf.textMuted }, cityPopFont('700')]}
              lightColor={rf.textMuted}
              darkColor={rf.textMuted}>
              {t('puzzleGuide.pageLabel', { current: index + 1, total: slides.length })}
            </ThemedText>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' },
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(8, progressRatio * 100)}%`,
                    backgroundColor: rf.text,
                  },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.closeShell,
              { marginRight: SOFT_SHADOW, marginBottom: SOFT_SHADOW },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.closeShadow,
                {
                  backgroundColor: softShadow,
                  transform: [{ translateX: SOFT_SHADOW }, { translateY: SOFT_SHADOW }],
                },
              ]}
            />
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                close();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('puzzleGuide.closeA11y')}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: rf.surface,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                },
              ]}>
              <ThemedText
                style={[styles.closeLabel, { color: rf.text }, cityPopFont('700')]}
                lightColor={rf.text}
                darkColor={rf.text}>
                {t('common.close')}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <GestureDetector gesture={swipe}>
          <View style={styles.stageArea}>
            <View
              pointerEvents="none"
              style={[
                styles.stageShadow,
                {
                  backgroundColor: softShadow,
                  transform: [{ translateX: SOFT_SHADOW }, { translateY: SOFT_SHADOW }],
                },
              ]}
            />
            <View style={[styles.stage, { backgroundColor: stageCream }]}>
              <View
                style={[
                  styles.stepChipShell,
                  { marginRight: SOFT_SHADOW, marginBottom: SOFT_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.stepChipShadow,
                    {
                      backgroundColor: softShadow,
                      transform: [{ translateX: SOFT_SHADOW }, { translateY: SOFT_SHADOW }],
                    },
                  ]}
                />
                <View style={[styles.stepChip, { backgroundColor: accentFace }]}>
                  <ThemedText
                    style={[styles.stepChipText, { color: chipInk }, cityPopFont('800')]}
                    lightColor={chipInk}
                    darkColor={chipInk}>
                    {String(index + 1).padStart(2, '0')}
                  </ThemedText>
                </View>
              </View>

              {mountedIndexes.map((i) => {
                const slide = slides[i]!;
                const active = i === index;
                return (
                  <Image
                    key={slide.id}
                    source={getPuzzleGuideImage(slide.id)}
                    style={[
                      styles.photo,
                      {
                        opacity: active && loadedIds[slide.id] ? 1 : 0,
                      },
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority={active || i === index + 1 ? 'high' : 'low'}
                    transition={0}
                    recyclingKey={`puzzle-guide-${slide.id}`}
                    accessibilityLabel={slide.title}
                    accessibilityIgnoresInvertColors
                    pointerEvents={active ? 'auto' : 'none'}
                    onLoad={() => markLoaded(slide.id)}
                  />
                );
              })}

              {!currentLoaded ? (
                <Animated.View
                  style={[styles.stageSkeleton, { opacity: skeletonPulse }]}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants">
                  <View style={[styles.skeletonFill, { backgroundColor: skeletonFace }]} />
                  <View style={styles.skeletonBlocks}>
                    <View style={[styles.skeletonBarWide, { backgroundColor: skeletonBlock }]} />
                    <View style={[styles.skeletonBarMid, { backgroundColor: skeletonBlock }]} />
                    <View style={styles.skeletonCards}>
                      <View style={[styles.skeletonCard, { backgroundColor: skeletonBlock }]} />
                      <View style={[styles.skeletonCard, { backgroundColor: skeletonBlock }]} />
                      <View style={[styles.skeletonCard, { backgroundColor: skeletonBlock }]} />
                    </View>
                  </View>
                </Animated.View>
              ) : null}
            </View>
          </View>
        </GestureDetector>

        <View style={styles.copyCardShell}>
          <View
            pointerEvents="none"
            style={[
              styles.copyCardShadow,
              {
                backgroundColor: softShadow,
                transform: [{ translateX: SOFT_SHADOW }, { translateY: SOFT_SHADOW }],
              },
            ]}
          />
          <View
            style={[
              styles.copyCard,
              {
                backgroundColor: isDark ? rf.surfaceAlt : stageCream,
              },
            ]}>
            <ThemedText
              style={[styles.copyTitle, { color: rf.text }, cityPopFont('800')]}
              lightColor={rf.text}
              darkColor={rf.text}>
              {item.title}
            </ThemedText>
            <ThemedText
              style={[styles.copyBody, { color: rf.textMuted }, cityPopFont('500')]}
              lightColor={rf.textMuted}
              darkColor={rf.textMuted}>
              {item.body}
            </ThemedText>
            {index === 0 ? (
              <ThemedText
                style={[styles.swipeHint, { color: rf.textMuted }, cityPopFont('600')]}
                lightColor={rf.textMuted}
                darkColor={rf.textMuted}>
                {t('puzzleGuide.swipeHint')}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 14) + 4,
            },
          ]}>
          <View style={styles.dots}>
            {slides.map((slide, i) => {
              const active = i === index;
              return (
                <View
                  key={slide.id}
                  style={[
                    styles.dot,
                    {
                      width: active ? 22 : 8,
                      backgroundColor: active ? rf.text : rf.borderMuted,
                      opacity: active ? 1 : 0.4,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.ctaWrap}>
            <View
              pointerEvents="none"
              style={[
                styles.ctaShadow,
                {
                  backgroundColor: softShadow,
                  transform: [{ translateX: SOFT_SHADOW }, { translateY: SOFT_SHADOW }],
                },
              ]}
            />
            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel={last ? t('puzzleGuide.doneBtn') : t('puzzleGuide.nextBtn')}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: rf.primaryContainer,
                  transform: [
                    { translateX: pressed ? SOFT_SHADOW : 0 },
                    { translateY: pressed ? SOFT_SHADOW : 0 },
                  ],
                },
              ]}>
              <ThemedText
                style={[styles.ctaLabel, { color: rf.primary }, cityPopFont('800')]}
                lightColor={rf.primary}
                darkColor={rf.primary}>
                {last ? t('puzzleGuide.doneBtn') : t('puzzleGuide.nextBtn')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  accentWash: {
    position: 'absolute',
    top: -40,
    right: -48,
    width: 220,
    height: 220,
    transform: [{ rotate: '18deg' }],
  },
  column: { flex: 1 },
  topBar: {
    paddingHorizontal: CityPopSpacing.gutter,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: { flex: 1, gap: 8, paddingTop: 2 },
  pageLabel: { fontSize: 13, letterSpacing: 0.35 },
  progressTrack: {
    height: 6,
    width: '100%',
    maxWidth: 160,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  closeShell: {
    position: 'relative',
  },
  closeShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 0,
    zIndex: 1,
  },
  closeLabel: { fontSize: 14 },
  stageArea: {
    flex: 1,
    marginHorizontal: CityPopSpacing.gutter,
    marginBottom: 12,
    position: 'relative',
  },
  stageShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    flex: 1,
    borderWidth: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  stepChipShell: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
  },
  stepChipShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  stepChip: {
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  stepChipText: { fontSize: 14, letterSpacing: 0.6 },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  stageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  skeletonFill: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonBlocks: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 28,
    gap: 14,
    justifyContent: 'center',
  },
  skeletonBarWide: {
    height: 18,
    width: '62%',
    borderRadius: 4,
  },
  skeletonBarMid: {
    height: 12,
    width: '44%',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonCards: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  skeletonCard: {
    flex: 1,
    aspectRatio: 0.62,
    borderRadius: 6,
    maxHeight: 160,
  },
  copyCardShell: {
    marginHorizontal: CityPopSpacing.gutter,
    marginBottom: 10,
    position: 'relative',
  },
  copyCardShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  copyCard: {
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 4,
    zIndex: 1,
  },
  copyTitle: { fontSize: 20, letterSpacing: -0.35, lineHeight: 26 },
  copyBody: { fontSize: 14, lineHeight: 21, letterSpacing: -0.1 },
  swipeHint: { fontSize: 12, lineHeight: 17, marginTop: 4, letterSpacing: -0.05 },
  footer: {
    paddingHorizontal: CityPopSpacing.gutter,
    paddingTop: 4,
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 10,
  },
  dot: {
    height: 8,
  },
  ctaWrap: {
    position: 'relative',
  },
  ctaShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  cta: {
    borderWidth: 0,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ctaLabel: { fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
});
