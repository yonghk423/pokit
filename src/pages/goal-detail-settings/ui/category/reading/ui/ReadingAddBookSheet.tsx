import { useEffect, useState } from 'react';
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

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

type Props = {
  visible: boolean;
  palette: Palette;
  aladinEnabled: boolean;
  onClose: () => void;
  onAddManual: (title: string) => void;
  onOpenSearch: () => void;
};

export function ReadingAddBookSheet({
  visible,
  palette,
  aladinEnabled,
  onClose,
  onAddManual,
  onOpenSearch,
}: Props) {
  const insets = useSafeAreaInsets();
  const c = palette;
  const accent = c.onSurface;
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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.surfaceLowest,
              borderColor: c.outline,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <ThemedText style={[styles.title, { color: c.onSurface }]}>도서 추가</ThemedText>
          <View style={[styles.inputRow, { borderColor: c.outlineVariant }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              returnKeyType="done"
              placeholder="책 제목을 직접 입력"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
              autoFocus
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="도서 추가"
              onPress={submit}
              style={[styles.addBtn, { backgroundColor: accent }]}>
              <IconSymbol name="plus" size={16} color={c.surfaceLowest} />
            </Pressable>
          </View>
          {aladinEnabled ? (
            <Pressable
              accessibilityRole="button"
              onPress={openSearch}
              style={[styles.searchBtn, { borderColor: accent }]}>
              <IconSymbol name="magnifyingglass" size={14} color={accent} />
              <ThemedText style={[styles.searchBtnText, { color: accent }]}>알라딘 도서 검색</ThemedText>
            </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
  },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '700', padding: 0, minHeight: 40 },
  addBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    paddingVertical: 12,
  },
  searchBtnText: { fontSize: 14, fontWeight: '700' },
});
