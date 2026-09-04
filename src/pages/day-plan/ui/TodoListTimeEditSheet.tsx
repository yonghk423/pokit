import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import {
  CatalogRowSpineTimePanel,
  type CatalogRowSpineTimePanelHandle,
} from './CatalogRowSpineTimePanel';

type Props = {
  visible: boolean;
  startMinutes: number;
  endMinutes: number;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  onClose: () => void;
  onSave: (startMinutes: number, endMinutes: number) => void;
};

/** 투두 시간 조절 — 시작·종료만 (당일/다음 날·날짜 라벨 없음) */
export function TodoListTimeEditSheet({
  visible,
  startMinutes,
  endMinutes,
  isDark,
  ink,
  muted,
  line,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const panelRef = useRef<CatalogRowSpineTimePanelHandle>(null);
  const [modalKey, setModalKey] = useState(0);
  const [draft, setDraft] = useState({ startMinutes, endMinutes });

  useEffect(() => {
    if (!visible) return;
    setDraft({ startMinutes, endMinutes });
    setModalKey((k) => k + 1);
  }, [visible, startMinutes, endMinutes]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    const next = panelRef.current?.commitPendingSchedule();
    const start = next?.startMinutes ?? draft.startMinutes;
    let end = next?.endMinutes ?? draft.endMinutes;
    if (end <= start) end = Math.min(24 * 60, start + 15);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(start, end);
    handleClose();
  }, [draft.endMinutes, draft.startMinutes, handleClose, onSave]);

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
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF',
              borderColor: isDark ? RetroFlatColors.dark.border : line,
            },
          ]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {visible ? (
              <CatalogRowSpineTimePanel
                key={modalKey}
                ref={panelRef}
                startMinutes={draft.startMinutes}
                endMinutes={draft.endMinutes}
                endsNextCalendarDay={false}
                presentation="sheet"
                visualStyle="note"
                contentInsetLeft={0}
                ink={ink}
                muted={muted}
                line={line}
                isDark={isDark}
                startFieldLabel={t('goalDetail.study.start')}
                endFieldLabel={t('goalDetail.study.end')}
                showSheetConfirm={false}
                showEndDateChoice={false}
                showDateLabels={false}
                onScheduleChange={(start, end) => {
                  setDraft({ startMinutes: start, endMinutes: end });
                }}
              />
            ) : null}
            <View style={[styles.footer, { borderTopColor: line }]}>
              <Pressable
                style={styles.cancelHit}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <ThemedText style={[styles.cancelText, { color: muted }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveHit, pressed && { opacity: 0.55 }]}
                onPress={handleSave}
                accessibilityRole="button"
                accessibilityLabel={t('common.save')}>
                <ThemedText
                  style={[styles.saveText, { color: ink, borderBottomColor: ink }]}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
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
  card: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: 420,
    maxHeight: '88%',
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 2,
  },
  footer: {
    marginTop: 4,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelHit: {
    paddingVertical: 2,
    paddingRight: 12,
  },
  saveHit: {
    paddingVertical: 2,
    paddingLeft: 12,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.15,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 1,
  },
});
