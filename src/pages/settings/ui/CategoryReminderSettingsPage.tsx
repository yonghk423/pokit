import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_REMINDER_KEYS, categoryReminderLabelKo } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  parseReminderTimesInput,
  syncCategoryReminderNotifications,
} from '@features/category-reminder-notifications';
import {
  loadCategoryReminderRules,
  saveCategoryReminderRules,
  type CategoryReminderRules,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const BG = '#ffffff';
const BORDER = 'rgba(0,0,0,0.08)';
const ON_SURFACE = '#18181b';
const MUTED = '#52525b';

type DraftRow = {
  enabled: boolean;
  timesText: string;
};

function buildDraftFromStorage(): Record<string, DraftRow> {
  const rules = loadCategoryReminderRules();
  const next: Record<string, DraftRow> = {};
  for (const key of CATEGORY_REMINDER_KEYS) {
    const r = rules[key];
    next[key] = {
      enabled: Boolean(r?.enabled && Array.isArray(r.times) && r.times.length > 0),
      timesText: Array.isArray(r?.times) ? r.times.join(', ') : '',
    };
  }
  return next;
}

function countEnabledSlots(d: Record<string, DraftRow>): number {
  let n = 0;
  for (const key of CATEGORY_REMINDER_KEYS) {
    const row = d[key];
    if (!row?.enabled) continue;
    n += parseReminderTimesInput(row.timesText).length;
  }
  return n;
}

export function CategoryReminderSettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Record<string, DraftRow>>(() => buildDraftFromStorage());

  useFocusEffect(
    useCallback(() => {
      setDraft(buildDraftFromStorage());
    }, []),
  );

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  const slotCount = useMemo(() => countEnabledSlots(draft), [draft]);

  const handleSave = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const rules: CategoryReminderRules = {};
    let totalSlots = 0;
    for (const key of CATEGORY_REMINDER_KEYS) {
      const row = draft[key];
      const times = parseReminderTimesInput(row?.timesText ?? '');
      const enabled = Boolean(row?.enabled && times.length > 0);
      rules[key] = { enabled, times: enabled ? times : [] };
      if (enabled) totalSlots += times.length;
    }
    saveCategoryReminderRules(rules);
    await syncCategoryReminderNotifications();
    await useLocalNotificationsStore.getState().refreshPermission();
    const perm = useLocalNotificationsStore.getState().permission;
    const anyOn = totalSlots > 0;
    if (anyOn && perm !== 'granted') {
      Alert.alert('알림', '알림을 받으려면 기기 설정에서 알림 권한을 허용해 주세요.');
    } else if (totalSlots > 40) {
      Alert.alert(
        '알림',
        '등록한 시각이 많아 최대 40개까지만 예약했어요. 나머지는 줄이거나 나눠 저장해 주세요.',
      );
    }
    router.back();
  }, [draft, router]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: BG }]} darkColor={BG} lightColor={BG}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View style={[styles.header, { borderBottomColor: BORDER }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={ON_SURFACE} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: ON_SURFACE }]}>카테고리 알림</ThemedText>
          <Pressable
            onPress={() => void handleSave()}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="저장">
            <ThemedText style={[styles.saveText, { color: ON_SURFACE }]}>저장</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.lead, { color: MUTED }]}>
            카테고리마다 매일 같은 시각에 알림을 받을 수 있어요. 시각은 24시간 형식(예: 09:00, 14:30)으로
            쉼표로 구분해 입력해요.
          </ThemedText>
          <ThemedText style={[styles.hint, { color: MUTED }]}>
            예약은 최대 40개까지 적용돼요. 현재 설정 시각 수: {slotCount}개
          </ThemedText>

          <View style={styles.card}>
            {CATEGORY_REMINDER_KEYS.map((key) => {
              const row = draft[key] ?? { enabled: false, timesText: '' };
              return (
                <View key={key} style={styles.row}>
                  <View style={styles.rowTop}>
                    <ThemedText style={[styles.rowTitle, { color: ON_SURFACE }]}>
                      {categoryReminderLabelKo(key)}
                    </ThemedText>
                    <Switch
                      value={row.enabled}
                      onValueChange={(v) =>
                        setDraft((prev) => ({
                          ...prev,
                          [key]: { ...row, enabled: v },
                        }))
                      }
                      trackColor={{ true: ON_SURFACE, false: 'rgba(0,0,0,0.12)' }}
                      thumbColor="#fff"
                    />
                  </View>
                  <TextInput
                    value={row.timesText}
                    onChangeText={(t) =>
                      setDraft((prev) => ({
                        ...prev,
                        [key]: { ...row, timesText: t },
                      }))
                    }
                    placeholder={row.enabled ? '예: 09:00, 14:30' : '켠 뒤 입력'}
                    placeholderTextColor="rgba(82,82,91,0.55)"
                    editable={row.enabled}
                    style={[
                      styles.input,
                      { color: ON_SURFACE, borderColor: BORDER, opacity: row.enabled ? 1 : 0.45 },
                    ]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  saveText: { fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  lead: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  hint: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginBottom: 6 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    overflow: 'hidden',
    marginTop: 8,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 10,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
});
