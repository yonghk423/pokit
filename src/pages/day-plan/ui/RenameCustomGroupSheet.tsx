import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { PRIMARY } from '../lib/dayPlanEditorShared';

const LABEL_MAX = 24;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 시트가 열릴 때의 초기 이름 */
  initialLabel: string;
  onSave: (trimmedLabel: string) => void;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
};

export function RenameCustomGroupSheet({
  visible,
  onClose,
  initialLabel,
  onSave,
  isDark,
  ink,
  muted,
  surface,
}: Props) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const sheetWasVisibleRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      sheetWasVisibleRef.current = false;
      return;
    }
    const justOpened = !sheetWasVisibleRef.current;
    sheetWasVisibleRef.current = true;
    if (justOpened) {
      setLabel(initialLabel.slice(0, LABEL_MAX));
    }
  }, [visible, initialLabel]);

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
  const closeBtnBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const trimmed = label.trim();
  const canSave = trimmed.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(trimmed);
  };

  const sheetBg = surface;

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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />

        <View
          style={[
            styles.sheet,
            { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}>
          <View style={styles.handleBar}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          <View style={styles.body}>
            <View style={styles.headerRow}>
              <ThemedText style={[styles.title, { color: ink }]}>묶음 이름 바꾸기</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={8}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: closeBtnBg }]}>
                <IconSymbol name="xmark" size={13} color={muted} />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>이름</ThemedText>
              <ThemedText style={[styles.fieldHint, { color: muted }]}>
                최대 {LABEL_MAX}자까지 입력할 수 있어요
              </ThemedText>
              <TextInput
                value={label}
                onChangeText={(v) => setLabel(v.slice(0, LABEL_MAX))}
                placeholder="묶음 이름"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                maxLength={LABEL_MAX}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={[
                  styles.input,
                  { color: ink, backgroundColor: inputBg, borderColor: inputBorder },
                ]}
              />
            </View>
          </View>

          <View style={styles.ctaWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel="저장"
              disabled={!canSave}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: canSave ? PRIMARY : inputBg,
                  borderColor: canSave
                    ? PRIMARY
                    : isDark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(0,0,0,0.08)',
                  opacity: pressed && canSave ? 0.88 : 1,
                },
              ]}>
              <ThemedText style={[styles.ctaText, { color: canSave ? '#FAFAFA' : muted }]}>
                저장
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 8,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  ctaWrap: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  cta: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
