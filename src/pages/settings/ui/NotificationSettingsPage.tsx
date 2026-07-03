import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { formatHhmmClockKo, useDayPlanDraftStore } from '@entities/day-plan';
import { getGoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { loadIncompleteRoutineReminder, loadPriorityDayStartAlarm } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 설정 → 알림 (하루 시작·시작·마무리 등) */
export function NotificationSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = getGoalDetailSessionUi(isDark);
  const insets = useSafeAreaInsets();
  const { priorityStart, priorityEnd } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
    })),
  );
  const [dayStartAlarmOn, setDayStartAlarmOn] = useState(() => loadPriorityDayStartAlarm().enabled);
  const [incompleteReminderOn, setIncompleteReminderOn] = useState(
    () => loadIncompleteRoutineReminder().enabled,
  );
  const [incompleteReminderHhmm, setIncompleteReminderHhmm] = useState(
    () => loadIncompleteRoutineReminder().reminderHhmm,
  );

  useFocusEffect(
    useCallback(() => {
      setDayStartAlarmOn(loadPriorityDayStartAlarm().enabled);
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
      style={[styles.screen, { backgroundColor: c.screenBg }]}
      darkColor={c.screenBg}
      lightColor={c.screenBg}>
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
            알림
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.sectionHint, { color: c.muted }]} lightColor={c.muted} darkColor={c.muted}>
            하루 시작·마무리 시간과 미완료 일정 알림을 설정해요.
          </ThemedText>

          <View style={[styles.section, { borderColor: c.border }]}>
            <ThemedText style={[styles.sectionTitle, { color: c.muted }]} lightColor={c.muted} darkColor={c.muted}>
              데이플랜
            </ThemedText>

            <Pressable
              style={({ pressed }) => [
                styles.item,
                { borderTopColor: c.border },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/daily-rhythm-settings');
              }}
              accessibilityRole="button"
              accessibilityLabel="시작과 마무리 시간 설정">
              <View style={styles.itemLeft}>
                <IconSymbol name="sun.horizon.fill" size={20} color={c.muted} />
                <View style={styles.itemTextWrap}>
                  <ThemedText style={[styles.itemTitle, { color: c.onSurface }]} lightColor={c.onSurface} darkColor={c.onSurface}>
                    시작·마무리
                  </ThemedText>
                  <ThemedText style={[styles.itemDesc, { color: c.muted }]} lightColor={c.muted} darkColor={c.muted}>
                    {formatHhmmClockKo(priorityStart)} – {formatHhmmClockKo(priorityEnd)}
                    {dayStartAlarmOn ? ' · 하루 시작 알림 켜짐' : ''}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={c.muted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.item,
                styles.itemDivider,
                { borderTopColor: c.border },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/incomplete-routine-reminder-settings');
              }}
              accessibilityRole="button"
              accessibilityLabel="미완료 일정 알림 설정">
              <View style={styles.itemLeft}>
                <IconSymbol name="bell.badge.fill" size={20} color={c.muted} />
                <View style={styles.itemTextWrap}>
                  <ThemedText style={[styles.itemTitle, { color: c.onSurface }]} lightColor={c.onSurface} darkColor={c.onSurface}>
                    미완료 일정 알림
                  </ThemedText>
                  <ThemedText style={[styles.itemDesc, { color: c.muted }]} lightColor={c.muted} darkColor={c.muted}>
                    {incompleteReminderOn
                      ? `${formatHhmmClockKo(incompleteReminderHhmm)} · 켜짐`
                      : '꺼짐'}
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={c.muted} />
            </Pressable>
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
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  container: { padding: 24, gap: 20 },
  sectionHint: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
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
  itemTextWrap: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemDesc: { fontSize: 12, opacity: 0.85 },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth },
});
