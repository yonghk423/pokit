import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import { READING_ACCENT, READING_ACCENT_ON } from '../lib/readingAccent';
import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const EDGE_SHADOW = 1;

type Props = {
  visible: boolean;
  palette: Palette;
  isDark: boolean;
  searchEnabled: boolean;
  onClose: () => void;
  onAddManual: (title: string) => void;
  onOpenSearch: () => void;
};

export function ReadingAddBookSheet({
  visible,
  palette,
  isDark,
  searchEnabled,
  onClose,
  onAddManual,
  onOpenSearch,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const c = palette;
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) setDraft('');
  }, [visible]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddManual(trimmed);
    setDraft('');
    onClose();
  };

  const openSearch = () => {
    onClose();
    onOpenSearch();
  };

  const handleBarColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.18)';
  const softShadow = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const faceBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const lineColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('dayPlan.close')} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surfaceLowest,
              borderColor: lineColor,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={[styles.handleBar, { backgroundColor: handleBarColor }]} />

          <ThemedText style={[styles.title, { color: c.onSurface }]}>
            {t('goalDetail.reading.addSheetTitle')}
          </ThemedText>

          <View style={[styles.inputRowShell, { marginRight: EDGE_SHADOW, marginBottom: EDGE_SHADOW }]}>
            <View
              pointerEvents="none"
              style={[
                styles.edgeShadow,
                {
                  backgroundColor: softShadow,
                  transform: [{ translateX: EDGE_SHADOW }, { translateY: EDGE_SHADOW }],
                },
              ]}
            />
            <View style={[styles.inputRow, { backgroundColor: faceBg, borderColor: lineColor }]}>
              <ThemedTextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                returnKeyType="done"
                placeholder={t('goalDetail.reading.addTitlePlaceholder')}
                placeholderTextColor={c.outline}
                style={[styles.input, { color: c.onSurface }]}
                autoFocus
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('goalDetail.reading.addBook')}
                onPress={submit}
                style={[styles.addBtn, { backgroundColor: READING_ACCENT }]}>
                <IconSymbol name="plus" size={14} color={READING_ACCENT_ON} />
              </Pressable>
            </View>
          </View>

          {searchEnabled ? (
            <View style={[styles.searchShell, { marginRight: EDGE_SHADOW, marginBottom: EDGE_SHADOW }]}>
              <View
                pointerEvents="none"
                style={[
                  styles.edgeShadow,
                  {
                    backgroundColor: softShadow,
                    transform: [{ translateX: EDGE_SHADOW }, { translateY: EDGE_SHADOW }],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                onPress={openSearch}
                style={[styles.searchBtn, { backgroundColor: faceBg, borderColor: lineColor }]}>
                <IconSymbol name="magnifyingglass" size={14} color={READING_ACCENT} />
                <ThemedText style={[styles.searchBtnText, { color: READING_ACCENT }]}>
                  {t('goalDetail.reading.searchBook')}
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
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
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  handleBar: {
    width: 36,
    height: 3,
    borderRadius: 0,
    alignSelf: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inputRowShell: {
    position: 'relative',
  },
  searchShell: {
    position: 'relative',
  },
  edgeShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    minHeight: 48,
    zIndex: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    minHeight: 40,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    zIndex: 1,
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
