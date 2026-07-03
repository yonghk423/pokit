import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import type { AppearanceMode } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const THEME_OPTIONS = [
  { key: 'light' as AppearanceMode, label: '라이트 모드', desc: '밝은 배경으로 표시해요.', icon: 'sun.max.fill' as const },
  { key: 'dark' as AppearanceMode, label: '다크 모드', desc: '어두운 배경으로 표시해요.', icon: 'moon.fill' as const },
];

/** 설정 → 화면 테마 (라이트 / 다크) */
export function AppearanceSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = getGoalDetailSessionUi(isDark);
  const insets = useSafeAreaInsets();
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const setAppearanceMode = useAppearanceStore((s) => s.setMode);

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.screenBg }]} darkColor={c.screenBg} lightColor={c.screenBg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.header, { backgroundColor: c.screenBg, borderBottomColor: c.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
          </Pressable>
          <ThemedText
            style={[styles.headerTitle, { color: c.onSurface }]}
            lightColor={c.onSurface}
            darkColor={c.onSurface}>
            화면 테마
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.sectionHint, { color: c.muted }]} lightColor={c.muted} darkColor={c.muted}>
            앱 전체의 밝기를 선택해요.
          </ThemedText>

          <View style={[styles.section, { borderColor: c.border }]}>
            {THEME_OPTIONS.map((opt) => {
              const active = appearanceMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.item,
                    { borderTopColor: c.border },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    if (active) return;
                    setAppearanceMode(opt.key);
                    void Haptics.selectionAsync();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}>
                  <View style={styles.itemLeft}>
                    <IconSymbol name={opt.icon} size={20} color={active ? c.onSurface : c.muted} />
                    <View style={styles.itemTextWrap}>
                      <ThemedText
                        style={styles.itemTitle}
                        lightColor={c.onSurface}
                        darkColor={c.onSurface}>
                        {opt.label}
                      </ThemedText>
                      <ThemedText
                        style={styles.itemDesc}
                        lightColor={c.muted}
                        darkColor={c.muted}>
                        {opt.desc}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol
                    name={active ? 'checkmark.circle.fill' : 'circle'}
                    size={22}
                    color={active ? c.onSurface : c.outline}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },
  container: {
    padding: 24,
    gap: 12,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: 'hidden',
  },
  item: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTextWrap: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 12,
    opacity: 0.85,
  },
});
