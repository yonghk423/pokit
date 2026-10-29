import { PaperGrain } from '@shared/ui/paper-grain';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { IconSymbol } from '@shared/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { getPuzzleGuideSlides } from '../lib/puzzleGuideContent';

const SWIPE_THRESHOLD = 56;
/** 오늘 탭 상단 아이콘(SettingsTopBarButton)과 동일 오프셋·톤 */
const SOFT_SHADOW = 2;
const SOFT_SHADOW_LIGHT = 'rgba(24, 26, 46, 0.22)';
const SOFT_SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';

/** 퍼즐 설명서 — 짧은 설명. 넘김은 즉시 전환(흔들림 애니메이션 없음). */
export function PuzzleGuidePage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const slides = useMemo(() => getPuzzleGuideSlides(locale), [locale]);
  const [index, setIndex] = useState(0);
  const last = index >= slides.length - 1;
  const item = slides[index]!;
  const softShadow = isDark ? SOFT_SHADOW_DARK : SOFT_SHADOW_LIGHT;
  const progressRatio = index / Math.max(1, slides.length - 1);

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
        <View style={styles.copyCardShell}>
          <View
            pointerEvents="none"
            style={[
              styles.copyCardShadow,
              {
                backgroundColor: 'transparent',
                transform: [{ translateX: SOFT_SHADOW }, { translateY: SOFT_SHADOW }],
              },
            ]}
          />
          <View
            style={[
              styles.copyCard,
              {
                backgroundColor: isDark ? '#292929' : '#FFFFFF',
              },
            ]}>
            <PaperGrain />
            <HanddrawnFrame color={isDark ? '#CCCCCC' : '#555555'} />
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
        </GestureDetector>

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
                      width: active ? 16 : 6,
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
                  backgroundColor: 'transparent',
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
                  backgroundColor: isDark ? '#292929' : '#FFFFFF',
                  transform: [
                    { translateX: pressed ? SOFT_SHADOW : 0 },
                    { translateY: pressed ? SOFT_SHADOW : 0 },
                  ],
                },
              ]}>
              <PaperGrain />
              <HanddrawnFrame color={isDark ? '#DDDDDD' : '#333333'} />
              <ThemedText
                style={[styles.ctaLabel, { color: isDark ? '#F5F5F5' : '#202020' }, cityPopFont('800')]}
                lightColor="#202020"
                darkColor="#F5F5F5">
                {last ? t('puzzleGuide.doneBtn') : t('puzzleGuide.nextBtn')}
              </ThemedText>
              {!last ? <IconSymbol name="chevron.right" size={15} color={isDark ? '#EEEEEE' : '#333333'} /> : null}
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
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  stageSkeleton: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  skeletonFill: {
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
  },
  copyCard: {
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
    zIndex: 1,
  },
  copyTitle: { fontSize: 17, letterSpacing: -0.2, lineHeight: 24 },
  copyBody: { fontSize: 14, lineHeight: 22, letterSpacing: -0.1 },
  swipeHint: { fontSize: 12, lineHeight: 17, marginTop: 4, letterSpacing: -0.05 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    height: 5,
  },
  ctaWrap: {
    minWidth: 96,
    maxWidth: 160,
    position: 'relative',
  },
  ctaShadow: {
    ...StyleSheet.absoluteFill,
  },
  cta: {
    borderWidth: 0,
    minHeight: 42,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ctaLabel: { fontSize: 14, lineHeight: 20, letterSpacing: -0.2 },
});
