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
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
  type CustomFlowIconOption,
} from '@shared/lib/storage';
import { PrimaryColor } from '@shared/config/theme';
import { CustomFlowAppearancePicker } from '@shared/ui/custom-flow-appearance-picker';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const NAME_MAX = 24;
const GROUP_NAME_MAX = 24;

type GroupOption = {
  key: string;
  label: string;
  isSystem: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    groupKey: string;
    icon: CustomFlowIconOption;
    accentColor: string;
  }) => void;
  initialGroupKey?: string;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  surface: string;
};

export function CreateCustomFlowSheet({
  visible,
  onClose,
  onCreate,
  initialGroupKey,
  isDark,
  ink,
  muted,
  line,
  surface,
}: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CustomFlowIconOption>(DEFAULT_CUSTOM_FLOW_ICON);
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(DEFAULT_CUSTOM_FLOW_ACCENT_COLOR);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('productivity');
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

    setName('');
    setSelectedIcon(DEFAULT_CUSTOM_FLOW_ICON);
    setSelectedAccentColor(DEFAULT_CUSTOM_FLOW_ACCENT_COLOR);
    setIsAddingGroup(false);
    setNewGroupLabel('');
    const fallback =
      initialGroupKey && initialGroupKey.length > 0 ? initialGroupKey : 'productivity';
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

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && selectedGroupKey.length > 0;

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';
  const chipIdleBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';

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

  const selectedGroupKeyRef = useRef(selectedGroupKey);
  selectedGroupKeyRef.current = selectedGroupKey;

  const handleCreate = () => {
    if (!canSubmit) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreate({
      name: trimmedName.trim(),
      groupKey: selectedGroupKeyRef.current,
      icon: selectedIcon,
      accentColor: selectedAccentColor,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.root, { backgroundColor: surface }]}>
        <View style={[styles.header, { borderBottomColor: line, paddingTop: insets.top + 12 }]}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: ink }]}>새 루틴 만들기</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              이름과 아이콘·색상을 정한 뒤 담을 묶음을 골라 주세요.
            </ThemedText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
            <ThemedText style={[styles.fieldLabel, { color: ink }]}>루틴 이름</ThemedText>
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
              placeholder="예: 푸쉬업 50개 하기"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
              maxLength={NAME_MAX}
              returnKeyType="done"
              multiline={false}
              style={[
                styles.input,
                { color: ink, backgroundColor: inputBg, borderColor: line },
              ]}
            />
          </View>

          <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
            <CustomFlowAppearancePicker
              icon={selectedIcon}
              accentColor={selectedAccentColor}
              onChangeIcon={setSelectedIcon}
              onChangeAccentColor={setSelectedAccentColor}
              previewLabel={trimmedName.length > 0 ? trimmedName : '미리보기'}
              isDark={isDark}
              ink={ink}
              muted={muted}
              line={line}
            />
          </View>

          <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
            <ThemedText style={[styles.fieldLabel, { color: ink }]}>상위 카테고리</ThemedText>
            <ThemedText style={[styles.fieldHint, { color: muted }]}>
              어디에 둘지 골라 주세요
            </ThemedText>

            <View style={styles.chipsWrap}>
              {groupOptions.map((g) => {
                const selected = selectedGroupKey === g.key;
                return (
                  <Pressable
                    key={g.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedGroupKey(g.key);
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? PrimaryColor.rgb : line,
                        backgroundColor: selected
                          ? isDark
                            ? 'rgba(255,255,255,0.16)'
                            : 'rgba(0,0,0,0.06)'
                          : chipIdleBg,
                      },
                    ]}>
                    {selected ? (
                      <IconSymbol name="checkmark" size={11} color={ink} />
                    ) : null}
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
                    { borderColor: line, backgroundColor: 'transparent' },
                  ]}>
                  <IconSymbol name="plus" size={11} color={muted} />
                  <ThemedText style={[styles.chipText, { color: muted }]}>
                    새 그룹 만들기
                  </ThemedText>
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
                    styles.newGroupInput,
                    { color: ink, backgroundColor: inputBg, borderColor: line },
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
                      backgroundColor: PrimaryColor.rgb,
                      opacity: newGroupLabel.trim().length === 0 ? 0.45 : pressed ? 0.88 : 1,
                    },
                  ]}>
                  <ThemedText style={styles.newGroupBtnText}>추가</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="취소"
                  onPress={() => {
                    setIsAddingGroup(false);
                    setNewGroupLabel('');
                  }}
                  hitSlop={8}
                  style={[styles.cancelBtn, { borderColor: line }]}>
                  <IconSymbol name="xmark" size={12} color={muted} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 12) },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            accessibilityLabel="만들기"
            disabled={!canSubmit}
            onPress={handleCreate}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor: canSubmit ? PrimaryColor.rgb : isDark ? '#3f3f46' : '#d4d4d8',
              },
              pressed && canSubmit && styles.pressed,
            ]}>
            <ThemedText style={styles.confirmLabel}>만들기</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  sectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    padding: 14,
    gap: 10,
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
    borderWidth: StyleSheet.hairlineWidth,
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
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2,
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
  newGroupInput: {
    flex: 1,
  },
  newGroupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  cancelBtn: {
    width: 40,
    height: 48,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    minHeight: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  pressed: {
    opacity: 0.82,
  },
});
