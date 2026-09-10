import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMinutesToHHmm, parseHHmmToMinutes } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

type Props = {
  visible: boolean;
  startMinutes: number;
  endMinutes: number;
  isDark: boolean;
  /** @deprecated 팔레트에서 파생 — 호출부 호환용 */
  ink?: string;
  muted?: string;
  line?: string;
  onClose: () => void;
  onSave: (startMinutes: number, endMinutes: number) => void;
};

/** 투두 시간 조절 — 시작·종료 (솔리드 음영 + 스냅 타임 피커) */
export function TodoListTimeEditSheet({
  visible,
  startMinutes,
  endMinutes,
  isDark,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const palette = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);

  const timePickerPalette = useMemo(
    () => ({
      ...palette.timeField,
      containerLowest: isDark ? tone.surfaceAlt : '#FFFFFF',
    }),
    [isDark, palette.timeField, tone.surfaceAlt],
  );

  const [draftStart, setDraftStart] = useState(() => formatMinutesToHHmm(startMinutes));
  const [draftEnd, setDraftEnd] = useState(() => formatMinutesToHHmm(endMinutes));
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftStart(formatMinutesToHHmm(startMinutes));
    setDraftEnd(formatMinutesToHHmm(endMinutes));
    setExpanded(null);
  }, [visible, startMinutes, endMinutes]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    const start = parseHHmmToMinutes(draftStart);
    let end = parseHHmmToMinutes(draftEnd);
    if (start === null || end === null) return;
    if (end <= start) end = Math.min(24 * 60, start + 15);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(start, end);
    handleClose();
  }, [draftEnd, draftStart, handleClose, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 12}>
        <Pressable
          style={styles.dim}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View style={styles.cardWrap}>
          <CityPopCardShell
            isDark={isDark}
            faceColor={isDark ? tone.surfaceAlt : '#FFFFFF'}
            contentStyle={styles.cardContent}>
            <View style={styles.header}>
              <ThemedText style={[styles.title, { color: timePickerPalette.onSurface }]}>
                {t('todo.timeEditTitle')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={handleClose}
                hitSlop={10}
                style={styles.closeHit}>
                <IconSymbol name="xmark" size={18} color={timePickerPalette.onVariant} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <ThemedText style={[styles.lead, { color: timePickerPalette.onVariant }]}>
                {t('todo.timeEditLead')}
              </ThemedText>

              <View style={styles.fields}>
                <SnappedTimePickerField
                  label={t('goalDetail.study.start')}
                  hint={t('todo.timeEditStartHint')}
                  valueHhmm={draftStart}
                  onChangeHhmm={setDraftStart}
                  expanded={expanded === 'start'}
                  onToggleExpand={() =>
                    setExpanded((cur) => (cur === 'start' ? null : 'start'))
                  }
                  isDark={isDark}
                  palette={timePickerPalette}
                  snapStepMinutes={1}
                />
                <View
                  style={[styles.divider, { backgroundColor: timePickerPalette.border }]}
                />
                <SnappedTimePickerField
                  label={t('goalDetail.study.end')}
                  hint={t('todo.timeEditEndHint')}
                  valueHhmm={draftEnd}
                  onChangeHhmm={setDraftEnd}
                  expanded={expanded === 'end'}
                  onToggleExpand={() =>
                    setExpanded((cur) => (cur === 'end' ? null : 'end'))
                  }
                  isDark={isDark}
                  palette={timePickerPalette}
                  snapStepMinutes={1}
                  mapMidnightToEndOfDay
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <BrutalConfirmButton
                align="stretch"
                compact
                label={t('common.save')}
                accessibilityLabel={t('todo.timeEditSaveA11y')}
                onPress={handleSave}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                onPress={handleClose}
                style={styles.cancelHit}>
                <ThemedText
                  style={[styles.cancelText, { color: timePickerPalette.onVariant }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
            </View>
          </CityPopCardShell>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    alignSelf: 'center',
    zIndex: 2,
  },
  cardContent: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeHit: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  lead: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    letterSpacing: -0.1,
    paddingHorizontal: 2,
  },
  fields: {
    gap: 8,
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  footer: {
    gap: 8,
    paddingTop: 4,
  },
  cancelHit: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
});
