import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CityPopSpacing,
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  getWidgetGuideImage,
  prefetchWidgetGuideAssets,
  WIDGET_GUIDE_STAGE_CREAM,
  WIDGET_GUIDE_STAGE_CREAM_DARK,
} from '@shared/lib/widget-guide-assets';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { getWidgetGuideSlides } from '../lib/widgetGuideContent';

const SWIPE_THRESHOLD = 56;

/** 위젯 설명서 — 사진·짧은 설명. 넘김은 즉시 전환(흔들림 애니메이션 없음). */
export function WidgetGuidePage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const slides = useMemo(() => getWidgetGuideSlides(locale), [locale]);
  const [index, setIndex] = useState(0);
  const [loadedIds, setLoadedIds] = useState<Record<string, true>>({});
  const last = index >= slides.length - 1;
  const item = slides[index]!;
  const shadowInk = isDark ? rf.solidShadow : '#000000';
  const progressRatio = index / Math.max(1, slides.length - 1);
  const stageCream = isDark ? WIDGET_GUIDE_STAGE_CREAM_DARK : WIDGET_GUIDE_STAGE_CREAM;
  const currentLoaded = Boolean(loadedIds[item.id]);

  const mountedIndexes = useMemo(() => {
    const next = new Set<number>([index]);
    if (index > 0) next.add(index - 1);
    if (index < slides.length - 1) next.add(index + 1);
    // 첫 진입 시 다음 장까지 미리 마운트
    if (index === 0 && slides.length > 2) next.add(2);
    return [...next].sort((a, b) => a - b);
  }, [index, slides.length]);

  useEffect(() => {
    void prefetchWidgetGuideAssets(locale);
  }, [locale]);

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
        style={[styles.accentWash, { backgroundColor: accentFace, borderColor: rf.border }]}
      />

      <View style={[styles.column, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <ThemedText
              style={[styles.pageLabel, { color: rf.textMuted }, cityPopFont('700')]}
              lightColor={rf.textMuted}
              darkColor={rf.textMuted}>
              {t('widgetGuide.pageLabel', { current: index + 1, total: slides.length })}
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
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              close();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('widgetGuide.closeA11y')}
            hitSlop={12}
            style={[styles.closeBtn, { borderColor: rf.border, backgroundColor: rf.surface }]}>
            <ThemedText
              style={[styles.closeLabel, { color: rf.text }, cityPopFont('700')]}
              lightColor={rf.text}
              darkColor={rf.text}>
              {t('common.close')}
            </ThemedText>
          </Pressable>
        </View>

        <GestureDetector gesture={swipe}>
          <View style={styles.stageArea}>
            <View style={[styles.stageShadow, { backgroundColor: shadowInk }]} />
            <View
              style={[
                styles.stage,
                {
                  borderColor: rf.border,
                  backgroundColor: stageCream,
                },
              ]}>
              <View style={[styles.stepChip, { borderColor: rf.border, backgroundColor: accentFace }]}>
                <ThemedText
                  style={[styles.stepChipText, { color: chipInk }, cityPopFont('800')]}
                  lightColor={chipInk}
                  darkColor={chipInk}>
                  {String(index + 1).padStart(2, '0')}
                </ThemedText>
              </View>

              {mountedIndexes.map((i) => {
                const slide = slides[i]!;
                const active = i === index;
                return (
                  <Image
                    key={`${locale}-${slide.id}`}
                    source={getWidgetGuideImage(slide.id, locale)}
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
                    recyclingKey={`widget-guide-${locale}-${slide.id}`}
                    accessibilityLabel={slide.title}
                    accessibilityIgnoresInvertColors
                    pointerEvents={active ? 'auto' : 'none'}
                    onLoad={() => markLoaded(slide.id)}
                  />
                );
              })}

              {!currentLoaded ? (
                <View style={styles.stageLoading} pointerEvents="none">
                  <ActivityIndicator color={rf.textMuted} />
                </View>
              ) : null}
            </View>
          </View>
        </GestureDetector>

        <View
          style={[
            styles.copyCard,
            {
              borderColor: rf.border,
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
              {t('widgetGuide.swipeHint')}
            </ThemedText>
          ) : null}
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
            <View style={[styles.ctaShadow, { backgroundColor: shadowInk }]} />
            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel={last ? t('widgetGuide.doneBtn') : t('widgetGuide.nextBtn')}
              style={({ pressed }) => [
                styles.cta,
                {
                  borderColor: rf.border,
                  backgroundColor: rf.primaryContainer,
                  transform: [
                    { translateX: pressed ? SOLID_SHADOW_OFFSET : 0 },
                    { translateY: pressed ? SOLID_SHADOW_OFFSET : 0 },
                  ],
                },
              ]}>
              <ThemedText
                style={[styles.ctaLabel, { color: rf.primary }, cityPopFont('800')]}
                lightColor={rf.primary}
                darkColor={rf.primary}>
                {last ? t('widgetGuide.doneBtn') : t('widgetGuide.nextBtn')}
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
    borderWidth: RETRO_BORDER_WIDTH,
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
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  closeLabel: { fontSize: 14 },
  stageArea: {
    flex: 1,
    marginHorizontal: CityPopSpacing.gutter,
    marginBottom: 12,
  },
  stageShadow: {
    ...StyleSheet.absoluteFillObject,
    top: SOLID_SHADOW_OFFSET + 2,
    left: SOLID_SHADOW_OFFSET + 2,
  },
  stage: {
    flex: 1,
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'hidden',
  },
  stepChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
  },
  stepChipText: { fontSize: 14, letterSpacing: 0.6 },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  stageLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  copyCard: {
    marginHorizontal: CityPopSpacing.gutter,
    marginBottom: 10,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 4,
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
    top: SOLID_SHADOW_OFFSET,
    left: SOLID_SHADOW_OFFSET,
  },
  cta: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
});
