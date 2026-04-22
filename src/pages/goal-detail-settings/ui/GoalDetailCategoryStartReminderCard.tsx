import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { categoryReminderLabelKo } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  parseReminderTimesInput,
  persistSingleCategoryReminderRule,
} from '@features/category-reminder-notifications';
import { ensureLocalNotificationPermission } from '@shared/lib/notifications';
import { loadCategoryReminderRules } from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';

import type { CategoryReminderRuleRow } from '@shared/lib/storage';

import type { GoalDetailCategoryKey } from '../model/types';

const BORDER = 'rgba(0,0,0,0.08)';
const ON_SURFACE = '#18181b';
const MUTED = '#52525b';

type Props = {
  categoryKey: GoalDetailCategoryKey;
};

function readRowForCategory(categoryKey: string) {
  const rules = loadCategoryReminderRules();
  return rules[categoryKey];
}

function buildReminderRow(reminderOn: boolean, timesText: string): CategoryReminderRuleRow {
  const times = parseReminderTimesInput(timesText);
  const enabledStored = Boolean(reminderOn && times.length > 0);
  return { enabled: enabledStored, times: enabledStored ? times : [] };
}

export function GoalDetailCategoryStartReminderCard({ categoryKey }: Props) {
  const label = useMemo(() => categoryReminderLabelKo(categoryKey), [categoryKey]);

  const [reminderOn, setReminderOn] = useState(false);
  const [timesText, setTimesText] = useState('');

  useEffect(() => {
    const r = readRowForCategory(categoryKey);
    const on = Boolean(r?.enabled && Array.isArray(r.times) && r.times.length > 0);
    setReminderOn(on);
    setTimesText(Array.isArray(r?.times) ? r.times.join(', ') : '');
  }, [categoryKey]);

  const persistWith = useCallback(
    async (on: boolean, text: string) => {
      const row = buildReminderRow(on, text);
      await persistSingleCategoryReminderRule(categoryKey, row);
      await useLocalNotificationsStore.getState().refreshPermission();
      const perm = useLocalNotificationsStore.getState().permission;
      if (row.enabled && perm !== 'granted') {
        Alert.alert('알림', '알림을 받으려면 기기 설정에서 알림 권한을 허용해 주세요.');
      }
    },
    [categoryKey],
  );

  const persist = useCallback(async () => {
    await persistWith(reminderOn, timesText);
  }, [persistWith, reminderOn, timesText]);

  const onToggleReminder = useCallback(
    async (next: boolean) => {
      void Haptics.selectionAsync();
      if (next) {
        await ensureLocalNotificationPermission();
      }
      setReminderOn(next);
      await persistWith(next, timesText);
    },
    [persistWith, timesText],
  );

  const onBlurTimes = useCallback(() => {
    void persist();
  }, [persist]);

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.titleBlock}>
          <ThemedText style={[styles.title, { color: ON_SURFACE }]}>시작 알림</ThemedText>
          <ThemedText style={[styles.sub, { color: MUTED }]}>
            {label} — 매일 지정한 시각에 일정 확인 알림을 받아요. 여러 시각은 쉼표로 구분해요(예:
            09:00, 21:30).
          </ThemedText>
        </View>
        <Switch
          value={reminderOn}
          onValueChange={(v) => void onToggleReminder(v)}
          trackColor={{ true: ON_SURFACE, false: 'rgba(0,0,0,0.12)' }}
          thumbColor="#fff"
        />
      </View>
      <TextInput
        value={timesText}
        onChangeText={setTimesText}
        onBlur={onBlurTimes}
        placeholder={reminderOn ? '예: 09:00, 14:30' : '켠 뒤 입력'}
        placeholderTextColor="rgba(82,82,91,0.55)"
        editable={reminderOn}
        style={[
          styles.input,
          { color: ON_SURFACE, borderColor: BORDER, opacity: reminderOn ? 1 : 0.45 },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={() => void persist()}
        style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.88 }]}
        accessibilityRole="button"
        accessibilityLabel="알림 시각 적용">
        <ThemedText style={styles.applyBtnText}>시각 적용</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#ffffff',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: { flex: 1, gap: 6 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: ON_SURFACE,
  },
});
