import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMinutesToHHmm, parseHHmmToMinutes } from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import { todoListUiColors } from '../lib/todoListTheme';

type Props = {
  visible: boolean;
  startMinutes: number;
  endMinutes: number;
  c: DayPlanPalette;
  isDark: boolean;
  onClose: () => void;
  onSave: (startMinutes: number, endMinutes: number) => void;
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

/** 투두 행 — 시작·종료 시각 편집 */
export function TodoListTimeEditSheet({
  visible,
  startMinutes,
  endMinutes,
  c,
  isDark,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const ui = useMemo(() => todoListUiColors(c, isDark), [c, isDark]);
  const [startText, setStartText] = useState(minutesToInput(startMinutes));
  const [endText, setEndText] = useState(minutesToInput(endMinutes));
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardInset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setStartText(minutesToInput(startMinutes));
    setEndText(minutesToInput(endMinutes));
  }, [visible, startMinutes, endMinutes]);

  const handleSave = useCallback(() => {
    const start = parseTimeInput(startText, startMinutes);
    let end = parseTimeInput(endText, endMinutes);
    if (end <= start) end = Math.min(24 * 60, start + 15);
    onSave(start, end);
    onClose();
  }, [startText, endText, startMinutes, endMinutes, onSave, onClose]);

  const sheetBottomInset =
    keyboardInset > 0 ? keyboardInset + 12 : Math.max(insets.bottom, 16);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: c.containerLow,
              borderColor: c.border,
              marginBottom: sheetBottomInset,
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <ThemedText style={styles.title} lightColor={ui.ink} darkColor={ui.ink}>
            {t('dayPlan.todoAdjustTime')}
          </ThemedText>
          <View style={styles.row}>
            <View style={styles.field}>
              <ThemedText style={styles.label} lightColor={ui.muted} darkColor={ui.muted}>
                {t('goalDetail.study.start')}
              </ThemedText>
              <TextInput
                value={startText}
                onChangeText={setStartText}
                placeholder="09:00"
                placeholderTextColor={ui.placeholder}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.input,
                  {
                    borderColor: ui.btnBorder,
                    color: ui.ink,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
                  },
                ]}
              />
            </View>
            <View style={styles.field}>
              <ThemedText style={styles.label} lightColor={ui.muted} darkColor={ui.muted}>
                {t('goalDetail.study.end')}
              </ThemedText>
              <TextInput
                value={endText}
                onChangeText={setEndText}
                placeholder="10:00"
                placeholderTextColor={ui.placeholder}
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.input,
                  {
                    borderColor: ui.btnBorder,
                    color: ui.ink,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.btn, { borderColor: ui.btnBorder, backgroundColor: ui.btnBg }]}>
              <ThemedText style={styles.btnText} lightColor={ui.ink} darkColor={ui.ink}>
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              style={[
                styles.btn,
                { borderColor: ui.primary, backgroundColor: ui.primary },
              ]}>
              <ThemedText style={styles.btnText} lightColor={ui.primaryOn} darkColor={ui.primaryOn}>
                {t('common.save')}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
