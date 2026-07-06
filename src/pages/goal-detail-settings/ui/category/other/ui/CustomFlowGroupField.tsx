import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, Platform } from 'react-native';

import {
  isSystemCatalogGroupKey,
  SYSTEM_CATALOG_GROUP_KEYS,
} from '@entities/day-plan';
import {
  createCustomCatalogGroup,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { Colors } from '@shared/config/theme';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

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
  const c = useMemo(() => goalDetailSettingsPalette(isDark), [isDark]);
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);

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

  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

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
        <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>상위 카테고리</ThemedText>
        <ThemedText style={[styles.currentTag, { color: c.onSurface }]} numberOfLines={1}>
          {currentLabel}
        </ThemedText>
      </View>

      <View style={styles.chipsWrap}>
        {groupOptions.map((g) => {
          const selected = groupKey === g.key;
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
              : Colors.primarySolid
            : inputBorder;
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
              style={[styles.chip, { borderColor: chipBorder, backgroundColor: chipBg }]}>
              {selected ? <IconSymbol name="checkmark" size={11} color={c.onSurface} /> : null}
              <ThemedText
                style={[
                  styles.chipText,
                  { color: selected ? c.onSurface : c.onVariant, fontWeight: selected ? '700' : '500' },
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
            <IconSymbol name="plus" size={11} color={c.onVariant} />
            <ThemedText style={[styles.chipText, { color: c.onVariant }]}>새 그룹 만들기</ThemedText>
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
            placeholderTextColor={c.outline}
            maxLength={GROUP_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={handleSubmitNewGroup}
            style={[
              styles.input,
              { flex: 1, color: c.onSurface, backgroundColor: inputBg, borderColor: inputBorder },
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
            style={styles.cancelBtn}>
            <IconSymbol name="xmark" size={12} color={c.onVariant} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 8 },
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
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 0,
    borderWidth: 2,
  },
  chipDashed: {
    borderStyle: 'dashed',
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
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    height: 40,
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
    borderWidth: 2,
  },
  newGroupBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
