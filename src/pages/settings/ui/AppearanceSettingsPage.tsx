import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import type { AppearanceMode } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsRowIcon,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

const THEME_OPTIONS = [
  { key: 'light' as AppearanceMode, label: '라이트 모드', desc: '밝은 배경으로 표시해요.', icon: 'sun.max.fill' as const },
  { key: 'dark' as AppearanceMode, label: '다크 모드', desc: '어두운 배경으로 표시해요.', icon: 'moon.fill' as const },
];

/** 설정 → 화면 테마 (라이트 / 다크) */
export function AppearanceSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
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
    <ThemedView style={[styles.screen, { backgroundColor: p.bg }]} darkColor={p.bg} lightColor={p.bg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[chrome.header, { backgroundColor: p.bg, borderBottomColor: p.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={chrome.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={20} color={p.title} />
          </Pressable>
          <ThemedText
            style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}
            lightColor={p.title}
            darkColor={p.title}>
            화면 테마
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
            앱 전체의 밝기를 선택해요.
          </ThemedText>

          <SettingsSection border={p.border} surface={p.surface}>
            {THEME_OPTIONS.map((opt, index) => {
              const active = appearanceMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    chrome.item,
                    { borderTopColor: p.border, borderTopWidth: index === 0 ? 0 : undefined },
                    index === 0 && styles.firstItem,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => {
                    if (active) return;
                    setAppearanceMode(opt.key);
                    void Haptics.selectionAsync();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}>
                  <View style={chrome.itemLeft}>
                    <SettingsRowIcon
                      name={opt.icon}
                      color={active ? p.icon : p.desc}
                      boxBg={p.iconBoxBg}
                      border={p.border}
                      shadow={p.shadow}
                    />
                    <View style={chrome.itemTextWrap}>
                      <ThemedText
                        style={chrome.itemTitle}
                        lightColor={p.title}
                        darkColor={p.title}>
                        {opt.label}
                      </ThemedText>
                      <ThemedText
                        style={chrome.itemDesc}
                        lightColor={p.desc}
                        darkColor={p.desc}>
                        {opt.desc}
                      </ThemedText>
                    </View>
                  </View>
                  <IconSymbol
                    name={active ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={active ? p.icon : p.chevron}
                  />
                </Pressable>
              );
            })}
          </SettingsSection>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
  },
  firstItem: {
    borderTopWidth: 0,
  },
});
