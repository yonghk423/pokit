import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

function SkeletonBone({
  bone,
  pulse,
  style,
}: {
  bone: string;
  pulse: Animated.Value;
  style?: object;
}) {
  return <Animated.View style={[styles.bone, { backgroundColor: bone, opacity: pulse }, style]} />;
}

function StoryCardSkeleton({
  bone,
  pulse,
  isDark,
}: {
  bone: string;
  pulse: Animated.Value;
  isDark: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff' }]}>
      <SkeletonBone bone={bone} pulse={pulse} style={styles.thumb} />
      <View style={styles.cardText}>
        <SkeletonBone bone={bone} pulse={pulse} style={styles.lineLg} />
        <SkeletonBone bone={bone} pulse={pulse} style={styles.lineMd} />
        <SkeletonBone bone={bone} pulse={pulse} style={styles.lineSm} />
      </View>
    </View>
  );
}

/** 스토리 탭 WebView 첫 로딩 — 기사 목록형 스켈레톤 */
export function PokitStoryWebViewSkeleton() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const pulse = useRef(new Animated.Value(0.45)).current;

  const { shellBg, bone } = useMemo(
    () => ({
      shellBg: isDark ? '#09090b' : '#ffffff',
      bone: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    }),
    [isDark],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.shell, { backgroundColor: shellBg, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        scrollEnabled={false}>
        <View style={styles.headerRow}>
          <SkeletonBone bone={bone} pulse={pulse} style={styles.logo} />
          <SkeletonBone bone={bone} pulse={pulse} style={styles.headerAction} />
        </View>

        <SkeletonBone bone={bone} pulse={pulse} style={styles.hero} />

        <View style={styles.chipRow}>
          <SkeletonBone bone={bone} pulse={pulse} style={styles.chip} />
          <SkeletonBone bone={bone} pulse={pulse} style={styles.chipWide} />
          <SkeletonBone bone={bone} pulse={pulse} style={styles.chip} />
        </View>

        <SkeletonBone bone={bone} pulse={pulse} style={styles.sectionTitle} />

        {Array.from({ length: 4 }, (_, index) => (
          <StoryCardSkeleton key={index} bone={bone} pulse={pulse} isDark={isDark} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 14,
  },
  bone: {
    borderRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logo: {
    width: 108,
    height: 22,
    borderRadius: 8,
  },
  headerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  hero: {
    width: '100%',
    height: 176,
    borderRadius: 18,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    width: 56,
    height: 30,
    borderRadius: 15,
  },
  chipWide: {
    width: 84,
    height: 30,
    borderRadius: 15,
  },
  sectionTitle: {
    width: '42%',
    height: 18,
    borderRadius: 6,
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 14,
  },
  cardText: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  lineLg: {
    width: '92%',
    height: 14,
    borderRadius: 6,
  },
  lineMd: {
    width: '72%',
    height: 12,
    borderRadius: 6,
  },
  lineSm: {
    width: '38%',
    height: 10,
    borderRadius: 5,
  },
});
