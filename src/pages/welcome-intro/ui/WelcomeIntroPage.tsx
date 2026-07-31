import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runOnJS } from 'react-native-reanimated';

import {
  CityPopSpacing,
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
  cityPopFont,
} from '@shared/config/retroFlat';
import { markWelcomeIntroSeenAndFlush } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

import { WELCOME_INTRO_BACKGROUNDS } from '../lib/welcomeIntroAssets';
import { WELCOME_INTRO_SLIDES } from '../lib/welcomeIntroSlides';

/** 첫 사용자용 짧은 서비스 소개 (5장 슬라이드) */
export function WelcomeIntroPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rf = RetroFlatColors.light;
  const [index, setIndex] = useState(0);
  const last = index >= WELCOME_INTRO_SLIDES.length - 1;
  const item = WELCOME_INTRO_SLIDES[index]!;
  const bg = WELCOME_INTRO_BACKGROUNDS[index] ?? WELCOME_INTRO_BACKGROUNDS[0]!;

  const finish = useCallback(() => {
    void markWelcomeIntroSeenAndFlush().finally(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/day-plan');
      }
    });
  }, [router]);

  const skip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    finish();
  }, [finish]);

  const goNext = useCallback(() => {
    if (last) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finish();
      return;
    }
    setIndex((i) => Math.min(i + 1, WELCOME_INTRO_SLIDES.length - 1));
    void Haptics.selectionAsync();
  }, [finish, last]);

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    setIndex((i) => Math.max(i - 1, 0));
    void Haptics.selectionAsync();
  }, [index]);

  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .onEnd((e) => {
      if (e.translationX < -48) {
        runOnJS(goNext)();
      } else if (e.translationX > 48) {
        runOnJS(goPrev)();
      }
    });

  return (
    <View style={styles.screen}>
      <Image
        key={item.id}
        source={bg}
        style={styles.bgImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.bgScrim} pointerEvents="none" />

      <View style={[styles.column, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topBar}>
          <ThemedText
            style={[styles.topLabel, { color: rf.textMuted }, cityPopFont('700')]}
            lightColor={rf.textMuted}
            darkColor={rf.textMuted}>
            소개 · {index + 1}/{WELCOME_INTRO_SLIDES.length}
          </ThemedText>
          <Pressable
            onPress={skip}
            accessibilityRole="button"
            accessibilityLabel="소개 건너뛰기"
            hitSlop={10}
            style={[
              styles.skipBtn,
              { borderColor: rf.border, backgroundColor: 'rgba(251,248,255,0.92)' },
            ]}>
            <ThemedText
              style={[styles.skipLabel, { color: rf.text }, cityPopFont('600')]}
              lightColor={rf.text}
              darkColor={rf.text}>
              건너뛰기
            </ThemedText>
          </Pressable>
        </View>

        <GestureDetector gesture={swipe}>
          <View style={styles.bodyArea}>
            <View style={[styles.copyCard, { borderColor: rf.border }]}>
              {item.id === 'welcome' ? (
                <ThemedText
                  style={[styles.brand, { color: rf.text }, cityPopFont('800')]}
                  lightColor={rf.text}
                  darkColor={rf.text}>
                  POKIT
                </ThemedText>
              ) : null}
              <ThemedText
                style={[styles.title, { color: rf.text }, cityPopFont('800')]}
                lightColor={rf.text}
                darkColor={rf.text}>
                {item.title}
              </ThemedText>
              <ThemedText
                style={[styles.body, { color: rf.textMuted }, cityPopFont('500')]}
                lightColor={rf.textMuted}
                darkColor={rf.textMuted}>
                {item.body}
              </ThemedText>
              {item.note ? (
                <View
                  style={[
                    styles.noteBox,
                    {
                      borderColor: rf.border,
                      backgroundColor: rf.primaryContainer,
                    },
                  ]}>
                  <ThemedText
                    style={[styles.noteText, { color: rf.text }, cityPopFont('700')]}
                    lightColor={rf.text}
                    darkColor={rf.text}>
                    {item.note}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </GestureDetector>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              backgroundColor: 'rgba(251,248,255,0.94)',
              borderTopColor: rf.border,
            },
          ]}>
          <View style={styles.dots}>
            {WELCOME_INTRO_SLIDES.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? rf.text : rf.borderMuted,
                    opacity: i === index ? 1 : 0.35,
                  },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel={last ? '시작하기' : '다음'}
            style={({ pressed }) => [
              styles.cta,
              {
                borderColor: rf.border,
                backgroundColor: rf.primaryContainer,
                opacity: pressed ? 0.92 : 1,
              },
            ]}>
            <ThemedText
              style={[styles.ctaLabel, { color: rf.text }, cityPopFont('800')]}
              lightColor={rf.text}
              darkColor={rf.text}>
              {last ? '시작하기' : '다음'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E8C4B8',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bgScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 242, 235, 0.28)',
  },
  column: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: CityPopSpacing.md,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLabel: { fontSize: 13, lineHeight: 18, letterSpacing: -0.2 },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  skipLabel: { fontSize: 14, lineHeight: 20 },
  bodyArea: {
    flex: 1,
    paddingHorizontal: CityPopSpacing.md,
    paddingBottom: 12,
    justifyContent: 'flex-end',
  },
  copyCard: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 22,
    backgroundColor: 'rgba(251, 248, 255, 0.94)',
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'visible',
  },
  brand: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.6,
    paddingTop: 2,
  },
  title: {
    fontSize: 22,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  noteBox: {
    marginTop: 4,
    borderWidth: RETRO_BORDER_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  footer: {
    paddingHorizontal: CityPopSpacing.md,
    paddingTop: 14,
    gap: 14,
    borderTopWidth: RETRO_BORDER_WIDTH,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
  },
  cta: {
    borderWidth: RETRO_BORDER_WIDTH,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
});
