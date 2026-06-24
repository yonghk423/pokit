import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SYSTEM_CATALOG_GROUP_KEYS,
} from '@entities/day-plan';
import {
  createCustomCatalogGroup,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { PRIMARY } from '../lib/dayPlanEditorShared';

const GROUP_NAME_MAX = 24;

type GroupOption = {
  key: string;
  label: string;
  isSystem: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  flowLabel: string;
  initialGroupKey: string;
  onSave: (groupKey: string) => void;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
};

export function MoveCustomFlowGroupSheet({
  visible,
  onClose,
  flowLabel,
  initialGroupKey,
  onSave,
  isDark,
  ink,
  muted,
  surface,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);

  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState('productivity');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const sheetWasVisibleRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      sheetWasVisibleRef.current = false;
      return;
    }
    const groups = listCustomCatalogGroups();
    setCustomGroups(groups);
    const justOpened = !sheetWasVisibleRef.current;
    sheetWasVisibleRef.current = true;
    if (!justOpened) return;

    setIsAddingGroup(false);
    setNewGroupLabel('');
    const fallback =
      initialGroupKey.trim().length > 0 ? initialGroupKey.trim() : 'productivity';
    const exists =
      (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).includes(fallback) ||
      groups.some((g) => g.key === fallback);
    setSelectedGroupKey(exists ? fallback : 'productivity');
  }, [visible, initialGroupKey]);

  const groupOptions: GroupOption[] = useMemo(() => {
    const sys: GroupOption[] = (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).map((k) => ({
      key: k,
      label: resolveSystemCatalogGroupLabel(k),
      isSystem: true,
    }));
    const custom: GroupOption[] = customGroups.map((g) => ({
      key: g.key,
      label: g.label,
      isSystem: false,
    }));
    return [...sys, ...custom];
  }, [customGroups]);

  const canSave = selectedGroupKey.length > 0 && selectedGroupKey !== initialGroupKey.trim();

  const handleSubmitNewGroup = () => {
    const label = newGroupLabel.trim().slice(0, GROUP_NAME_MAX);
    if (label.length === 0) return;
    const created = createCustomCatalogGroup(label);
    if (!created) return;
    void Haptics.selectionAsync();
    setCustomGroups(listCustomCatalogGroups());
    setSelectedGroupKey(created.key);
    setIsAddingGroup(false);
    setNewGroupLabel('');
  };

  const handleSave = () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(selectedGroupKey);
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
  const closeBtnBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
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

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextCol}>
                <ThemedText style={[styles.title, { color: ink }]}>묶음 옮기기</ThemedText>
                <ThemedText style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
                  「{flowLabel}」을(를) 다른 상위 카테고리로 옮길 수 있어요
                </ThemedText>
              </View>
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
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>상위 카테고리</ThemedText>
              <ThemedText style={[styles.fieldHint, { color: muted }]}>
                옮길 위치를 골라 주세요
              </ThemedText>

              <View style={styles.chipsWrap}>
                {groupOptions.map((g) => {
                  const selected = selectedGroupKey === g.key;
                  const chipBg = selected
                    ? isDark
                      ? 'rgba(255,255,255,0.14)'
                      : 'rgba(0,0,0,0.07)'
                    : isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.02)';
                  const chipBorder = selected
                    ? isDark
                      ? 'rgba(255,255,255,0.4)'
                      : PRIMARY
                    : inputBorder;
                  return (
                    <Pressable
                      key={g.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setSelectedGroupKey(g.key);
                      }}
                      style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }]}>
                      {selected ? <IconSymbol name="checkmark" size={11} color={ink} /> : null}
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: selected ? ink : muted, fontWeight: selected ? '700' : '500' },
                        ]}
                        numberOfLines={1}>
                        {g.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}

                {!isAddingGroup ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="새 그룹 만들기"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsAddingGroup(true);
                    }}
                    style={[
                      styles.chip,
                      styles.chipDashed,
                      { borderColor: inputBorder, backgroundColor: 'transparent' },
                    ]}>
                    <IconSymbol name="plus" size={11} color={muted} />
                    <ThemedText style={[styles.chipText, { color: muted }]}>새 그룹 만들기</ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {isAddingGroup ? (
                <View style={styles.newGroupRow}>
                  <TextInput
                    autoFocus
                    value={newGroupLabel}
                    onChangeText={(v) => setNewGroupLabel(v.slice(0, GROUP_NAME_MAX))}
                    placeholder="새 그룹 이름 (예: 운동·체력)"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                    maxLength={GROUP_NAME_MAX}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmitNewGroup}
                    style={[
                      styles.input,
                      { flex: 1, color: ink, backgroundColor: inputBg, borderColor: inputBorder },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="추가"
                    onPress={handleSubmitNewGroup}
                    disabled={newGroupLabel.trim().length === 0}
                    style={({ pressed }) => [
                      styles.newGroupBtn,
                      {
                        backgroundColor: tabColors.activeBg,
                        borderColor: tabColors.activeBorder,
                        opacity: newGroupLabel.trim().length === 0 ? 0.45 : pressed ? 0.88 : 1,
                      },
                    ]}>
                    <ThemedText style={[styles.newGroupBtnText, { color: tabColors.activeIcon }]}>
                      추가
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="취소"
                    onPress={() => {
                      setIsAddingGroup(false);
                      setNewGroupLabel('');
                    }}
                    hitSlop={8}
                    style={[styles.closeBtn, { backgroundColor: closeBtnBg }]}>
                    <IconSymbol name="xmark" size={12} color={muted} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.ctaWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel="옮기기"
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
                옮기기
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
  scrollBody: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: -0.1,
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
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipDashed: {
    borderStyle: 'dashed',
  },
  chipText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
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
  newGroupBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  newGroupBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
