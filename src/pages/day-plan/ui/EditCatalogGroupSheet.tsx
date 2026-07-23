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
const SUBTITLE_MAX = 120;

type Props = {
  visible: boolean;
  onClose: () => void;
  initialLabel: string;
  initialSubtitle: string;
  onSave: (input: { label: string; subtitle: string }) => void;
  onDelete?: () => void;
  deleteHint?: string;
  /** 기본: 편집. create면 제목·CTA만 바뀌고 삭제는 숨김 */
  mode?: 'create' | 'edit';
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
};

export function EditCatalogGroupSheet({
  visible,
  onClose,
  initialLabel,
  initialSubtitle,
  onSave,
  onDelete,
  deleteHint,
  mode = 'edit',
  isDark,
  ink,
  muted,
  surface,
}: Props) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
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
      setSubtitle(initialSubtitle.slice(0, SUBTITLE_MAX));
    }
  }, [visible, initialLabel, initialSubtitle]);

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
  const closeBtnBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const trimmedLabel = label.trim();
  const trimmedSubtitle = subtitle.trim();
  const canSave = trimmedLabel.length > 0 && trimmedSubtitle.length > 0;
  const isCreate = mode === 'create';
  const title = isCreate ? '새 묶음 만들기' : '묶음 편집';
  const ctaLabel = isCreate ? '만들기' : '저장';
  const showDelete = !isCreate && onDelete != null;

  const handleSave = () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ label: trimmedLabel, subtitle: trimmedSubtitle });
  };

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
            { backgroundColor: surface, paddingBottom: Math.max(insets.bottom, 16) + 8 },
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
              <ThemedText style={[styles.title, { color: ink }]}>{title}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={8}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: closeBtnBg }]}>
                <IconSymbol name="xmark" size={13} color={muted} />
              </Pressable>
            </View>

            {isCreate ? (
              <ThemedText style={[styles.createLead, { color: muted }]}>
                루틴을 담을 묶음만 먼저 만들 수 있어요. 이름은 목록에, 설명은 묶음 아래에 보여요.
              </ThemedText>
            ) : null}

            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>이름</ThemedText>
              <TextInput
                value={label}
                onChangeText={(v) => setLabel(v.slice(0, LABEL_MAX))}
                placeholder="묶음 이름"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                maxLength={LABEL_MAX}
                returnKeyType="next"
                style={[
                  styles.input,
                  { color: ink, backgroundColor: inputBg, borderColor: inputBorder },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>설명</ThemedText>
              <ThemedText style={[styles.fieldHint, { color: muted }]}>
                담기 화면 묶음 아래에 보이는 안내 문구예요
              </ThemedText>
              <TextInput
                value={subtitle}
                onChangeText={(v) => setSubtitle(v.slice(0, SUBTITLE_MAX))}
                placeholder="묶음 설명"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                maxLength={SUBTITLE_MAX}
                multiline
                textAlignVertical="top"
                style={[
                  styles.subtitleInput,
                  { color: ink, backgroundColor: inputBg, borderColor: inputBorder },
                ]}
              />
            </View>
          </View>

          {showDelete ? (
            <View style={styles.deleteWrap}>
              <ThemedText style={[styles.deleteHint, { color: muted }]}>
                {deleteHint ?? '묶음을 삭제하면 안에 있던 항목은 다른 묶음으로 옮겨져요.'}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="묶음 삭제"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDelete?.();
                }}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  {
                    borderColor: 'rgba(239,68,68,0.42)',
                    backgroundColor: pressed ? 'rgba(239,68,68,0.08)' : 'transparent',
                  },
                ]}>
                <ThemedText style={styles.deleteBtnText}>묶음 삭제</ThemedText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.ctaWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel={ctaLabel}
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
                {ctaLabel}
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
    maxHeight: '85%',
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
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    gap: 8,
  },
  createLead: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.15,
    marginTop: -4,
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
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingVertical: 0,
    ...(Platform.OS === 'android'
      ? { textAlignVertical: 'center' as const, includeFontPadding: false }
      : {}),
  },
  subtitleInput: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 96,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  ctaWrap: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  deleteWrap: {
    paddingHorizontal: 22,
    paddingTop: 4,
    gap: 10,
  },
  deleteHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  deleteBtn: {
    minHeight: 46,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: -0.15,
  },
  cta: {
    minHeight: 50,
    borderRadius: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
