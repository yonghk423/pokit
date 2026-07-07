import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildSpineImportFromBag,
  formatMinutesToHHmm,
  parseHHmmToMinutes,
  resolveCategoryCatalogIcon,
} from '@entities/day-plan';
import type { DayPlanBlock } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

export type SpineLinkedRoutineEntry = {
  key: string;
  label: string;
  blockId?: string;
  startMinutes?: number;
  endMinutes?: number;
};

type TimeDraft = {
  start: string;
  end: string;
};

type Props = {
  visible: boolean;
  items: SpineLinkedRoutineEntry[];
  priorityStart: string;
  priorityEnd: string;
  existingBlocks: readonly DayPlanBlock[];
  nowMinutes: number;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onConfirm: (
    assignments: Array<{
      key: string;
      label: string;
      blockId?: string;
      startMinutes: number;
      endMinutes: number;
    }>,
  ) => void;
  onChangeLinkMode?: () => void;
};

function minutesToInput(minutes: number): string {
  return formatMinutesToHHmm(minutes);
}

function parseTimeInput(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return fallback;
  const parsed = parseHHmmToMinutes(trimmed);
  return parsed != null && Number.isFinite(parsed) ? parsed : fallback;
}

function buildInitialDrafts(input: {
  items: SpineLinkedRoutineEntry[];
  priorityStart: string;
  priorityEnd: string;
  existingBlocks: readonly DayPlanBlock[];
  nowMinutes: number;
}): Record<string, TimeDraft> {
  const suggested = buildSpineImportFromBag({
    categoryKeys: input.items.map((item) => item.key),
    resolveTitle: (key) => input.items.find((item) => item.key === key)?.label ?? key,
    priorityStart: input.priorityStart,
    priorityEnd: input.priorityEnd,
    existingBlocks: input.existingBlocks,
    nowMinutes: input.nowMinutes,
  });
  const suggestedByKey = new Map(suggested.map((row) => [row.categoryKey, row]));

  const out: Record<string, TimeDraft> = {};
  for (const item of input.items) {
    if (
      typeof item.startMinutes === 'number' &&
      typeof item.endMinutes === 'number' &&
      item.endMinutes > item.startMinutes
    ) {
      out[item.key] = {
        start: minutesToInput(item.startMinutes),
        end: minutesToInput(item.endMinutes),
      };
      continue;
    }
    const fallback = suggestedByKey.get(item.key);
    if (fallback) {
      out[item.key] = {
        start: minutesToInput(fallback.startMinutes),
        end: minutesToInput(fallback.endMinutes),
      };
      continue;
    }
    out[item.key] = { start: '09:00', end: '09:30' };
  }
  return out;
}

/** 목록 연동 타임라인 — 루틴별 시작·종료 시각 지정 */
export function PrioritySpineLinkedRoutineSheet({
  visible,
  items,
  priorityStart,
  priorityEnd,
  existingBlocks,
  nowMinutes,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onConfirm,
  onChangeLinkMode,
}: Props) {
  const insets = useSafeAreaInsets();
  const [timesByKey, setTimesByKey] = useState<Record<string, TimeDraft>>({});
  const itemKeySignature = useMemo(() => items.map((item) => item.key).join('\n'), [items]);

  useEffect(() => {
    if (!visible) return;
    setTimesByKey(
      buildInitialDrafts({
        items,
        priorityStart,
        priorityEnd,
        existingBlocks,
        nowMinutes,
      }),
    );
  }, [
    visible,
    itemKeySignature,
    items,
    priorityStart,
    priorityEnd,
    existingBlocks,
    nowMinutes,
  ]);

  const itemCardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#FAFAFA';

  const allValid = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => {
      const draft = timesByKey[item.key];
      if (!draft) return false;
      const start = parseHHmmToMinutes(draft.start.trim());
      const end = parseHHmmToMinutes(draft.end.trim());
      return start != null && end != null && end > start;
    });
  }, [items, timesByKey]);

  const updateTime = useCallback((key: string, field: 'start' | 'end', value: string) => {
    setTimesByKey((prev) => ({
      ...prev,
      [key]: {
        start: field === 'start' ? value : (prev[key]?.start ?? ''),
        end: field === 'end' ? value : (prev[key]?.end ?? ''),
      },
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (!allValid) return;
    const assignments = items.map((item) => {
      const draft = timesByKey[item.key]!;
      const fallbackStart = parseHHmmToMinutes(priorityStart) ?? 9 * 60;
      const start = parseTimeInput(draft.start, fallbackStart);
      let end = parseTimeInput(draft.end, start + 30);
      if (end <= start) end = Math.min(24 * 60, start + 30);
      return {
        key: item.key,
        label: item.label,
        blockId: item.blockId,
        startMinutes: start,
        endMinutes: end,
      };
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(assignments);
  }, [allValid, items, onConfirm, priorityStart, timesByKey]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: ink }]}>루틴 시간 설정</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              목록에 담은 루틴을 타임라인 몇 시부터 몇 시까지 할지 정해 주세요.
            </ThemedText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {items.map((item) => {
            const draft = timesByKey[item.key] ?? { start: '', end: '' };
            return (
              <View
                key={item.key}
                style={[styles.itemCard, { borderColor: line, backgroundColor: itemCardBg }]}>
                <View style={styles.itemHead}>
                  <IconSymbol
                    name={resolveCategoryCatalogIcon(item.key) as 'drop.fill'}
                    size={18}
                    color={activeIconColorByCategory(item.key)}
                  />
                  <ThemedText style={[styles.itemLabel, { color: ink }]} numberOfLines={1}>
                    {item.label}
                  </ThemedText>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <ThemedText style={[styles.timeLabel, { color: muted }]}>시작</ThemedText>
                    <TextInput
                      value={draft.start}
                      onChangeText={(text) => updateTime(item.key, 'start', text)}
                      placeholder="09:00"
                      placeholderTextColor={muted}
                      keyboardType="numbers-and-punctuation"
                      style={[
                        styles.timeInput,
                        { borderColor: line, color: ink, backgroundColor: inputBg },
                      ]}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <ThemedText style={[styles.timeLabel, { color: muted }]}>종료</ThemedText>
                    <TextInput
                      value={draft.end}
                      onChangeText={(text) => updateTime(item.key, 'end', text)}
                      placeholder="09:30"
                      placeholderTextColor={muted}
                      keyboardType="numbers-and-punctuation"
                      style={[
                        styles.timeInput,
                        { borderColor: line, color: ink, backgroundColor: inputBg },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 12) }]}>
          {onChangeLinkMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="연동 방식 다시 선택"
              onPress={onChangeLinkMode}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: line },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.secondaryLabel, { color: muted }]}>연동 방식 다시 선택</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="루틴 시간 저장"
            disabled={!allValid}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: PrimaryColor.rgb, opacity: allValid ? 1 : 0.45 },
              pressed && allValid && styles.pressed,
            ]}>
            <ThemedText style={styles.confirmLabel}>저장하고 계속</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, gap: 6 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 12 },
  itemCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1, gap: 6 },
  timeLabel: { fontSize: 12, fontWeight: '700' },
  timeInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  secondaryLabel: { fontSize: 14, fontWeight: '700' },
  confirmBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  confirmLabel: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  pressed: { opacity: 0.82 },
});
