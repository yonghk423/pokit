import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseHHmmToMinutes } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

type Props = {
  visible: boolean;
  priorityStart: string;
  priorityEnd: string;
  isDark: boolean;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
};

export function FixedRoutinePriorityWindowSheet({
  visible,
  priorityStart,
  priorityEnd,
  isDark,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const palette = useMemo(() => paletteForReminderTimeCard(isDark), [isDark]);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const [draftStart, setDraftStart] = useState(priorityStart);
  const [draftEnd, setDraftEnd] = useState(priorityEnd);
  const [expanded, setExpanded] = useState<'start' | 'end' | null>(null);

  const timePickerPalette = useMemo(
    () => ({
      ...palette.timeField,
      containerLowest: isDark ? tone.surfaceAlt : '#FFFFFF',
    }),
    [isDark, palette.timeField, tone.surfaceAlt],
  );

  useEffect(() => {
    if (!visible) return;
    setDraftStart(priorityStart);
    setDraftEnd(priorityEnd);
    setExpanded(null);
  }, [visible, priorityStart, priorityEnd]);

  const handleSave = useCallback(() => {
    const ps = parseHHmmToMinutes(draftStart);
    const pe = parseHHmmToMinutes(draftEnd);
    if (ps === null || pe === null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(draftStart, draftEnd);
    onClose();
  }, [draftEnd, draftStart, onClose, onSave]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: tone.bg,
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: timePickerPalette.onSurface }]}>
            {t('fixedRoutine.focusWindowSheetTitle')}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={timePickerPalette.onVariant} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.lead, { color: timePickerPalette.onVariant }]}>
            {t('fixedRoutine.focusWindowSheetLead')}
          </ThemedText>
          <CityPopCardShell
            isDark={isDark}
            faceColor={isDark ? tone.surfaceAlt : '#FFFFFF'}
            contentStyle={styles.settingsCard}>
            <SnappedTimePickerField
              label={t('goalDetail.study.start')}
              hint={t('fixedRoutine.focusWindowStartHint')}
              valueHhmm={draftStart}
              onChangeHhmm={setDraftStart}
              expanded={expanded === 'start'}
              onToggleExpand={() => setExpanded((cur) => (cur === 'start' ? null : 'start'))}
              isDark={isDark}
              palette={timePickerPalette}
              snapStepMinutes={1}
            />
            <View style={[styles.divider, { backgroundColor: timePickerPalette.border }]} />
            <SnappedTimePickerField
              label={t('goalDetail.study.end')}
              hint={t('fixedRoutine.focusWindowEndHint')}
              valueHhmm={draftEnd}
              onChangeHhmm={setDraftEnd}
              expanded={expanded === 'end'}
              onToggleExpand={() => setExpanded((cur) => (cur === 'end' ? null : 'end'))}
              isDark={isDark}
              palette={timePickerPalette}
              snapStepMinutes={1}
              mapMidnightToEndOfDay
            />
          </CityPopCardShell>
        </ScrollView>

        <View style={styles.footer}>
          <BrutalConfirmButton
            align="stretch"
            label={t('common.save')}
            accessibilityLabel={t('fixedRoutine.focusWindowSaveA11y')}
            onPress={handleSave}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={onClose}
            style={({ pressed }) => [styles.textBtn, pressed && { opacity: 0.7 }]}>
            <ThemedText style={[styles.textBtnLabel, { color: timePickerPalette.onVariant }]}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  lead: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  settingsCard: {
    borderWidth: 0,
    padding: 12,
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  textBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
