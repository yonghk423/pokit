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

import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

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
  const { t } = useTranslation();

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
  const canSave = trimmedLabel.length > 0;
  const isCreate = mode === 'create';
  const title = isCreate ? t('catalog.createGroupTitle') : t('catalog.editGroupTitle');
  const ctaLabel = isCreate ? t('createFlow.create') : t('common.save');
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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

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
                accessibilityLabel={t('common.close')}
                hitSlop={8}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: closeBtnBg }]}>
                <IconSymbol name="xmark" size={13} color={muted} />
              </Pressable>
            </View>

            {isCreate ? (
              <ThemedText style={[styles.createLead, { color: muted }]}>
                {t('catalog.createGroupLead')}
              </ThemedText>
            ) : null}

            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>{t('common.name')}</ThemedText>
              <ThemedTextInput
                value={label}
                onChangeText={(v) => setLabel(v.slice(0, LABEL_MAX))}
                placeholder={t('catalog.groupNamePlaceholder')}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                maxLength={LABEL_MAX}
                returnKeyType="done"
                style={[
                  styles.input,
                  { color: ink, backgroundColor: inputBg, borderColor: inputBorder },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>
                {t('catalog.groupDescOptional')}{' '}
                <ThemedText style={[styles.fieldOptional, { color: muted }]}>{t('common.optional')}</ThemedText>
              </ThemedText>
              <ThemedText style={[styles.fieldHint, { color: muted }]}>
                {t('catalog.groupDescOptionalHint')}
              </ThemedText>
              <ThemedTextInput
                value={subtitle}
                onChangeText={(v) => setSubtitle(v.slice(0, SUBTITLE_MAX))}
                placeholder={t('catalog.groupDescPlaceholder')}
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
                {deleteHint ?? t('catalog.deleteGroupHint')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('catalog.deleteGroupA11y')}
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
                <ThemedText style={styles.deleteBtnText}>{t('catalog.deleteGroupTitle')}</ThemedText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.ctaWrap}>
            <BrutalConfirmButton
              label={ctaLabel}
              accessibilityLabel={ctaLabel}
              align="stretch"
              disabled={!canSave}
              onPress={handleSave}
            />
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
  fieldOptional: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
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
});
