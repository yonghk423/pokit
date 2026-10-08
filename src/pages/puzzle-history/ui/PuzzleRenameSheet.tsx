import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

export const PUZZLE_TITLE_MAX_LEN = 24;

type Props = {
  visible: boolean;
  onClose: () => void;
  initialTitle: string;
  onSave: (trimmedTitle: string) => void;
  isDark: boolean;
};

export function PuzzleRenameSheet({
  visible,
  onClose,
  initialTitle,
  onSave,
  isDark,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const [title, setTitle] = useState('');
  const openedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      openedRef.current = false;
      return;
    }
    if (!openedRef.current) {
      openedRef.current = true;
      setTitle(initialTitle.slice(0, PUZZLE_TITLE_MAX_LEN));
    }
  }, [visible, initialTitle]);

  const trimmed = title.trim();
  const canSave = trimmed.length > 0;
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}>
          <View style={styles.handleBar}>
            <View
              style={[
                styles.handle,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(0,0,0,0.15)',
                },
              ]}
            />
          </View>

          <View style={styles.body}>
            <View style={styles.headerRow}>
              <ThemedText style={[styles.heading, { color: tone.text }]}>
                {t('history.puzzle.renameTitle')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={8}
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.06)',
                  },
                ]}>
                <IconSymbol name="xmark" size={13} color={tone.textMuted} />
              </Pressable>
            </View>

            <ThemedText style={[styles.hint, { color: tone.textMuted }]}>
              {t('history.puzzle.renameMaxHint', { count: PUZZLE_TITLE_MAX_LEN })}
            </ThemedText>
            <ThemedTextInput
              value={title}
              onChangeText={(v) => setTitle(v.slice(0, PUZZLE_TITLE_MAX_LEN))}
              placeholder={t('history.puzzle.titlePlaceholder')}
              placeholderTextColor={
                isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
              }
              maxLength={PUZZLE_TITLE_MAX_LEN}
              returnKeyType="done"
              accessibilityLabel={t('history.puzzle.titleLabel')}
              onSubmitEditing={() => {
                if (!canSave) return;
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                onSave(trimmed);
              }}
              style={[
                styles.input,
                {
                  color: tone.text,
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                },
              ]}
            />
          </View>

          <View style={styles.ctaWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel={t('common.save')}
              disabled={!canSave}
              onPress={() => {
                if (!canSave) return;
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                onSave(trimmed);
              }}
              style={[
                styles.cta,
                {
                  backgroundColor: canSave ? tone.bgMint : inputBg,
                  borderColor: canSave
                    ? tone.border
                    : isDark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(0,0,0,0.08)',
                },
              ]}>
              <ThemedText
                style={[
                  styles.ctaText,
                  {
                    color: canSave
                      ? isDark
                        ? tone.primaryOn
                        : tone.primary
                      : tone.textMuted,
                  },
                ]}>
                {t('common.save')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  handleBar: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 0 },
  body: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4, gap: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heading: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ctaWrap: { paddingHorizontal: 22, paddingTop: 16 },
  cta: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '800' },
});
