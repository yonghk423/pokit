import Svg, { Path } from 'react-native-svg';
import { COMIC_SCENE_THUMBNAILS } from '../../day-plan/lib/heroSceneThumbnails';
import { saveHeroCardLayout, useHeroCardLayout } from '../../day-plan/model/heroCardLayout';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

/** 설정 → 카드 표시 방식 선택. */
export function LayoutSettingsPage() {
  const { t } = useTranslation();
  const cardLayout = useHeroCardLayout();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: p.bg }]} darkColor={p.bg} lightColor={p.bg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[chrome.header, { backgroundColor: 'transparent', borderBottomColor: p.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={chrome.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}>
            <IconSymbol name="chevron.left" size={20} color={p.title} />
          </Pressable>
          <ThemedText style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}>
            {t('settings.layoutTitle')}
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[chrome.container, styles.content]} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]}>{t('settings.layout.hint')}</ThemedText>
          <View style={styles.choices}>
            {(['stack', 'carousel'] as const).map(mode => {
              const selected = cardLayout === mode;
              return <LayoutChoice key={mode} testID={`settings-card-layout-${mode}`} selected={selected} divider={mode === 'stack'} ink={p.title} border={p.border} muted={p.desc}
                label={t(mode === 'stack' ? 'settings.layout.cardStack' : 'settings.layout.cardCarousel')}
                description={t(mode === 'stack' ? 'settings.layout.cardStackDesc' : 'settings.layout.cardCarouselDesc')}
                onPress={() => { if (!selected) { void Haptics.selectionAsync(); saveHeroCardLayout(mode); } }}>
                <View accessible={false} pointerEvents="none" style={styles.previewArea}>
                  <View style={styles.preview}>
                    {[COMIC_SCENE_THUMBNAILS['p2-01-fly-kite'], COMIC_SCENE_THUMBNAILS['p3-14-dog-walk'], COMIC_SCENE_THUMBNAILS['46-camping']].map((source, index) => <View key={index} style={[styles.previewCard, {
                      width: mode === 'stack' ? 96 : index === 1 ? 88 : 72,
                      height: mode === 'stack' ? 134 : index === 1 ? 140 : 124,
                      left: mode === 'stack' ? 68 + index * 14 : index === 0 ? 0 : index === 1 ? 82 : 180,
                      top: mode === 'stack' ? 8 - index * 3 : index === 1 ? 2 : 10,
                      transform: [{ rotate: mode === 'stack' ? `${(index - 1) * 8}deg` : '0deg' }],
                    }]}><Image source={source} resizeMode="cover" style={[styles.previewImage, { height: (mode === 'stack' ? 134 : index === 1 ? 140 : 124) - 32 }]} />
                    </View>)}
                  </View>
                </View>
              </LayoutChoice>;
            })}
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

function LayoutChoice({ selected, divider, ink, border, muted, label, description, testID, onPress, children }: {
  selected: boolean; divider: boolean; ink: string; border: string; muted: string; label: string; description: string; testID: string; onPress: () => void; children: ReactNode;
}) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const reduced = useRef(false);
  useEffect(() => {
    let alive = true;
    const update = (value: boolean) => {
      if (!alive) return;
      reduced.current = value;
      if (value) { progress.stopAnimation(); progress.setValue(selected ? 1 : 0); press.stopAnimation(); press.setValue(1); }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { alive = false; subscription.remove(); };
  }, [selected, progress, press]);
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: selected ? 1 : 0, duration: reduced.current ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [selected, progress]);
  const pressTo = (value: number) => {
    press.stopAnimation();
    Animated.timing(press, { toValue: value, duration: reduced.current ? 0 : 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  useEffect(() => () => press.stopAnimation(), [press]);
  return <Animated.View style={{ flex: 1, transform: [{ scale: press }] }}>
    <Pressable testID={testID} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label}
      onPress={onPress} onPressIn={() => pressTo(0.985)} onPressOut={() => pressTo(1)} style={[styles.choice, { borderBottomColor: border, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0 }]}>
      <View style={styles.choiceHeading}>
        <Animated.View accessible={false} style={{ width: 24, opacity: progress }}>
          <Svg width={20} height={22} viewBox="0 0 24 24"><Path d="M4 12.5 9.2 18 20 5.5" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Animated.View>
        <ThemedText style={{ color: ink, fontSize: 19 }}>{label}</ThemedText>
      </View>
      {children}
      <ThemedText style={{ color: muted, fontSize: 13, textAlign: 'center' }}>{description}</ThemedText>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 12, paddingBottom: 8 },
  choices: { flex: 1, gap: 4 },
  choice: { flex: 1, minHeight: 230, padding: 16, paddingVertical: 20, gap: 12 },
  choiceHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewArea: { flex: 1, minHeight: 150, alignItems: 'center', justifyContent: 'center' },
  preview: { width: 252, height: 150 },
  previewCard: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 2, padding: 5, shadowColor: '#171510', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  previewImage: { width: '100%', borderRadius: 0 },
  safe: { flex: 1 },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
  },
});
