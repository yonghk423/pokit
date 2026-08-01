import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { isSystemCatalogGroupKey, SYSTEM_CATALOG_GROUP_KEYS } from '@entities/day-plan';
import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  createCustomCatalogGroup,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const GROUP_NAME_MAX = 24;

type GroupOption = {
  key: string;
  label: string;
};

type Props = {
  groupKey: string;
  onChangeGroupKey: (groupKey: string) => void;
};

export function CustomFlowGroupField({ groupKey, onChangeGroupKey }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;

  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>(() =>
    listCustomCatalogGroups(),
  );
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');

  const groupOptions: GroupOption[] = useMemo(() => {
    const sys: GroupOption[] = (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).map((k) => ({
      key: k,
      label: resolveSystemCatalogGroupLabel(k),
    }));
    const custom: GroupOption[] = customGroups.map((g) => ({ key: g.key, label: g.label }));
    return [...sys, ...custom];
  }, [customGroups]);

  const handleSubmitNewGroup = () => {
    const label = newGroupLabel.trim().slice(0, GROUP_NAME_MAX);
    if (label.length === 0) return;
    const created = createCustomCatalogGroup(label);
    if (!created) return;
    void Haptics.selectionAsync();
    setCustomGroups(listCustomCatalogGroups());
    onChangeGroupKey(created.key);
    setIsAddingGroup(false);
    setNewGroupLabel('');
  };

  const currentLabel = useMemo(() => {
    if (isSystemCatalogGroupKey(groupKey)) {
      return resolveSystemCatalogGroupLabel(groupKey);
    }
    return customGroups.find((g) => g.key === groupKey)?.label ?? '생산성';
  }, [customGroups, groupKey]);

  return (
    <View style={styles.shell}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.fieldLabel, { color: tone.textMuted }]}>상위 카테고리</ThemedText>
        <ThemedText style={[styles.currentTag, { color: tone.text }]} numberOfLines={1}>
          {currentLabel}
        </ThemedText>
      </View>

      <View style={styles.chipsWrap}>
        {groupOptions.map((g) => {
          const selected = groupKey === g.key;
          return (
            <Pressable
              key={g.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync();
                onChangeGroupKey(g.key);
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: tone.border,
                  backgroundColor: selected
                    ? tone.primaryContainer
                    : isDark
                      ? tone.surfaceAlt
                      : '#FFFFFF',
                },
                pressed && { opacity: 0.92 },
              ]}>
              {selected ? (
                <IconSymbol name="checkmark" size={11} color={tone.text} weight="bold" />
              ) : null}
              <ThemedText
                style={[
                  styles.chipText,
                  {
                    color: selected ? tone.text : tone.textMuted,
                    fontWeight: selected ? '800' : '600',
                  },
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
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: tone.border,
                backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                borderStyle: 'dashed',
              },
              pressed && { opacity: 0.92 },
            ]}>
            <IconSymbol name="plus" size={11} color={tone.text} weight="bold" />
            <ThemedText style={[styles.chipText, { color: tone.text, fontWeight: '700' }]}>
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
            placeholder="새 그룹 이름"
            placeholderTextColor={tone.textMuted}
            maxLength={GROUP_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={handleSubmitNewGroup}
            style={[
              styles.input,
              {
                flex: 1,
                color: tone.text,
                backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                borderColor: tone.border,
              },
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
                backgroundColor: tone.primaryContainer,
                borderColor: tone.border,
                opacity: newGroupLabel.trim().length === 0 ? 0.45 : pressed ? 0.92 : 1,
              },
            ]}>
            <ThemedText style={[styles.newGroupBtnText, { color: tone.text }]}>추가</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="취소"
            onPress={() => {
              setIsAddingGroup(false);
              setNewGroupLabel('');
            }}
            hitSlop={8}
            style={[
              styles.cancelBtn,
              {
                borderColor: tone.border,
                backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
              },
            ]}>
            <IconSymbol name="xmark" size={12} color={tone.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 10 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fieldLabel: { fontSize: 12, fontWeight: '800', letterSpacing: -0.1 },
  currentTag: { fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: -0.15,
  },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
    ...(Platform.OS === 'android'
      ? { textAlignVertical: 'center' as const, includeFontPadding: false }
      : {}),
  },
  newGroupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
  },
  newGroupBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  cancelBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
});
