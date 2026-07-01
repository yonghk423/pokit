import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHhmmClockKo } from '@entities/day-plan';
import { saveIncompleteRoutineReminderSettings } from '@features/day-plan-notifications';
import { getGoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { loadIncompleteRoutineReminder } from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import {
  DailyRhythmStyleAlarmRow,
  paletteForReminderTimeCard,
  SnappedTimePickerField,
} from '@widgets/daily-rhythm-time-field';

/** 설정 → 알림 → 미완료 일정 알림 */
export function IncompleteRoutineReminderSettingsPage() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const c = getGoalDetailSessionUi(isDark);
  const insets = useSafeAreaInsets();
  const surface = useMemo(() => paletteForReminderTimeCard(false), []);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderHhmm, setReminderHhmm] = useState('22:00');
  const [timeExpanded, setTimeExpanded] = useState(false);

  const hydrateFromStorage = useCallback(() => {
    const row = loadIncompleteRoutineReminder();
    setReminderOn(row.enabled);
    setReminderHhmm(row.reminderHhmm);
    setTimeExpanded(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      hydrateFromStorage();
    }, [hydrateFromStorage]),
  );

  const flushPersist = useCallback(async (on: boolean, hhmm: string) => {
    const ok = await saveIncompleteRoutineReminderSettings({
      enabled: on,
      reminderHhmm: hhmm,
    });
    if (on && !ok) {
      setReminderOn(false);
      Alert.alert('알림', '알림을 켜려면 기기에서 알림 권한을 허용해 주세요.');
    }
  }, []);

  const schedulePersist = useCallback(
    (on: boolean, hhmm: string) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void flushPersist(on, hhmm);
      }, 380);
    },
    [flushPersist],
  );

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    [],
  );

  const onToggleReminder = useCallback(
    async (next: boolean) => {
      void Haptics.selectionAsync();
      setReminderOn(next);
      await flushPersist(next, reminderHhmm);
    },
    [flushPersist, reminderHhmm],
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
            미완료 일정 알림
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.sectionHint, { color: c.muted }]} lightColor={c.muted} darkColor={c.muted}>
            정해진 시간에 아직 끝내지 못한 일정이 있으면 알려 드려요.
          </ThemedText>

          <View style={[styles.card, { borderColor: surface.cardBorder, backgroundColor: '#ffffff' }]}>
            <DailyRhythmStyleAlarmRow
              title="미완료 일정 알림"
              hint="매일 지정한 시각에 미완료 일정 개수를 알려 드려요."
              value={reminderOn}
              onValueChange={(v) => void onToggleReminder(v)}
              palette={surface.alarm}
            />

            {reminderOn ? (
              <View
                style={[
                  styles.innerCard,
                  { backgroundColor: surface.cardBg, borderColor: surface.cardBorder },
                ]}>
                <SnappedTimePickerField
                  label="알림 시각"
                  hint="이 시각에 미완료 일정이 있으면 알림이 울려요."
                  valueHhmm={reminderHhmm}
                  onChangeHhmm={(next) => {
                    setReminderHhmm(next);
                    schedulePersist(true, next);
                  }}
                  expanded={timeExpanded}
                  onToggleExpand={() => setTimeExpanded((v) => !v)}
                  isDark={false}
                  palette={surface.timeField}
                  snapStepMinutes={1}
                />
                <ThemedText style={[styles.previewLine, { color: surface.timeField.onVariant }]}>
                  예시 · {formatHhmmClockKo(reminderHhmm)}에 일정 4개가 남아 있으면 「아직 완료하지 못한 일정이 4개 있어요. 확인해 보세요.」
                </ThemedText>
              </View>
            ) : null}
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
  container: { padding: 24, gap: 16 },
  sectionHint: { fontSize: 13, lineHeight: 19 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  innerCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  previewLine: { fontSize: 12, lineHeight: 18 },
});
