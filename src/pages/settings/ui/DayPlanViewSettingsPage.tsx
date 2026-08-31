import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDayPlanLayoutModeVisibilityStore } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import type { DayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsRowIcon,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

const MODE_OPTIONS: {
  key: DayPlanLayoutMode;
  label: string;
  desc: string;
  icon: 'list.bullet.rectangle' | 'sun.horizon.fill';
}[] = [
  {
    key: 'bag',
    label: '목록',
    desc: '담은 루틴을 한 목록으로 봐요.',
    icon: 'list.bullet.rectangle',
  },
  {
    key: 'sections',
    label: '시간대',
    desc: '새벽·아침·점심·저녁·밤 구간으로 나눠 봐요.',
    icon: 'sun.horizon.fill',
  },
];

/** 설정 → 오늘 탭에서 쓸 보기 방식 on/off */
export function DayPlanViewSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const setModeVisible = useDayPlanLayoutModeVisibilityStore((s) => s.setModeVisible);
  const visibleCount = MODE_OPTIONS.filter((opt) => visibility[opt.key]).length;

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
          <ThemedText style={[chrome.headerTitle, styles.headerTitleCenter, { color: p.title }]}>
            오늘 탭 보기
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]}>
            켜 둔 보기만 오늘 탭 상단에 표시돼요. 하나만 켜 두어도 현재 모드 아이콘은 그대로 보여요.
          </ThemedText>

          <SettingsSection border={p.border} surface={p.surface}>
            {MODE_OPTIONS.map((opt, index) => {
              const enabled = visibility[opt.key];
              const disableOff = enabled && visibleCount <= 1;
              return (
                <View
                  key={opt.key}
                  style={[
                    chrome.item,
                    { borderTopColor: p.border },
                    index === 0 && styles.firstItem,
                  ]}>
                  <View style={chrome.itemLeft}>
                    <SettingsRowIcon
                      name={opt.icon}
                      color={p.icon}
                      boxBg={p.iconBoxBg}
                      border={p.border}
                      shadow={p.shadow}
                    />
                    <View style={chrome.itemTextWrap}>
                      <ThemedText style={[chrome.itemTitle, { color: p.title }]}>{opt.label}</ThemedText>
                      <ThemedText style={[chrome.itemDesc, { color: p.desc }]}>{opt.desc}</ThemedText>
                    </View>
                  </View>
                  <Switch
                    value={enabled}
                    disabled={disableOff}
                    onValueChange={(next) => {
                      void Haptics.selectionAsync();
                      setModeVisible(opt.key, next);
                    }}
                    trackColor={{
                      false: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                      true: '#000000',
                    }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
                    accessibilityLabel={`${opt.label} 보기 ${enabled ? '끄기' : '켜기'}`}
                  />
                </View>
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
