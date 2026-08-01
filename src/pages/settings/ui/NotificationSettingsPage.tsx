import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHhmmClockKo } from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { loadIncompleteRoutineReminder } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildSettingsPalette,
  SettingsRowIcon,
  SettingsSection,
  settingsChromeStyles as chrome,
} from '../lib/settingsChrome';

/** 설정 → 알림 */
export function NotificationSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const p = buildSettingsPalette(isDark);
  const insets = useSafeAreaInsets();
  const [incompleteReminderOn, setIncompleteReminderOn] = useState(
    () => loadIncompleteRoutineReminder().enabled,
  );
  const [incompleteReminderHhmm, setIncompleteReminderHhmm] = useState(
    () => loadIncompleteRoutineReminder().reminderHhmm,
  );

  useFocusEffect(
    useCallback(() => {
      const incomplete = loadIncompleteRoutineReminder();
      setIncompleteReminderOn(incomplete.enabled);
      setIncompleteReminderHhmm(incomplete.reminderHhmm);
    }, []),
  );

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: p.bg }]}
      darkColor={p.bg}
      lightColor={p.bg}>
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
            알림
          </ThemedText>
          <View style={chrome.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={chrome.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[chrome.sectionHint, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
            미완료 일정 알림을 설정해요.
          </ThemedText>

          <SettingsSection border={p.border} surface={p.surface}>
            <ThemedText style={[chrome.sectionTitle, { color: p.sectionTitle }]} lightColor={p.sectionTitle} darkColor={p.sectionTitle}>
              데이플랜
            </ThemedText>

            <Pressable
              style={({ pressed }) => [
                chrome.item,
                { borderTopColor: p.border },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/incomplete-routine-reminder-settings');
              }}
              accessibilityRole="button"
              accessibilityLabel="미완료 일정 알림 설정">
              <View style={chrome.itemLeft}>
                <SettingsRowIcon
                  name="bell.badge.fill"
                  color={p.icon}
                  boxBg={p.iconBoxBg}
                  border={p.border}
                  shadow={p.shadow}
                />
                <View style={chrome.itemTextWrap}>
                  <ThemedText style={[chrome.itemTitle, { color: p.title }]} lightColor={p.title} darkColor={p.title}>
                    미완료 일정 알림
                  </ThemedText>
                  <ThemedText style={[chrome.itemDesc, { color: p.desc }]} lightColor={p.desc} darkColor={p.desc}>
                    {incompleteReminderOn
                      ? `${formatHhmmClockKo(incompleteReminderHhmm)} · 켜짐`
                      : '꺼짐'}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={14} color={p.chevron} />
            </Pressable>
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
});
