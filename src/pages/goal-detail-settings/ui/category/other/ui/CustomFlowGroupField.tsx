import * as Haptics from 'expo-haptics';
import { type ReactNode, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  isSystemCatalogGroupKey,
  resolveCustomCatalogGroupDisplayLabel,
  SYSTEM_CATALOG_GROUP_KEYS,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  createCustomCatalogGroup,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
} from '@shared/lib/storage';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

const GROUP_NAME_MAX = 24;
const CHIP_SHADOW = 2;

type GroupOption = {
  key: string;
  label: string;
};

type Props = {
  groupKey: string;
  onChangeGroupKey: (groupKey: string) => void;
};

function SolidChipShell({
  shadowColor,
  shadowSize = CHIP_SHADOW,
  children,
}: {
  shadowColor: string;
  shadowSize?: number;
  children: ReactNode;
}) {
  return (
    <View style={[styles.chipShell, { marginRight: shadowSize, marginBottom: shadowSize }]}>
      <View
        pointerEvents="none"
        style={[
          styles.chipShadow,
          {
            backgroundColor: shadowColor,
            transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
          },
        ]}
      />
      {children}
    </View>
  );
}

export function CustomFlowGroupField({ groupKey, onChangeGroupKey }: Props) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : '#000000';

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
    const custom: GroupOption[] = customGroups.map((g) => ({
      key: g.key,
      label: resolveCustomCatalogGroupDisplayLabel(g.key, g.label),
    }));
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
    return customGroups.find((g) => g.key === groupKey)?.label ?? t('goalDetail.productivityFallback');
  }, [customGroups, groupKey, t]);

  return (
    <View style={styles.shell}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.fieldLabel, { color: tone.textMuted }]}>
          {t('goalDetail.parentCategory')}
        </ThemedText>
        <ThemedText style={[styles.currentTag, { color: tone.text }]} numberOfLines={1}>
          {currentLabel}
        </ThemedText>
      </View>

      <View style={styles.chipsWrap}>
        {groupOptions.map((g) => {
          const selected = groupKey === g.key;
          return (
            <SolidChipShell
              key={g.key}
              shadowColor={shadowInk}
              shadowSize={selected ? 3 : CHIP_SHADOW}>
              <Pressable
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
                    backgroundColor: selected
                      ? tone.primaryContainer
                      : isDark
                        ? tone.surfaceAlt
                        : '#FFFFFF',
                  },
                  pressed && { opacity: 0.92 },
                ]}>
                {selected ? (
                  <IconSymbol name="checkmark" size={11} color={tone.primary} weight="bold" />
                ) : null}
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: selected ? tone.primary : tone.textMuted,
                      fontWeight: selected ? '800' : '600',
                    },
                  ]}
                  numberOfLines={1}>
                  {g.label}
                </ThemedText>
              </Pressable>
            </SolidChipShell>
          );
        })}

        {!isAddingGroup ? (
          <SolidChipShell shadowColor={shadowInk}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.newGroup')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddingGroup(true);
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                },
                pressed && { opacity: 0.92 },
              ]}>
              <IconSymbol name="plus" size={11} color={tone.text} weight="bold" />
              <ThemedText style={[styles.chipText, { color: tone.text, fontWeight: '700' }]}>
                {t('goalDetail.newGroup')}
              </ThemedText>
            </Pressable>
          </SolidChipShell>
        ) : null}
      </View>

      {isAddingGroup ? (
        <View style={styles.newGroupRow}>
          <View style={styles.newGroupInputGrow}>
            <SolidChipShell shadowColor={shadowInk} shadowSize={CHIP_SHADOW}>
              <ThemedTextInput
                autoFocus
                value={newGroupLabel}
                onChangeText={(v) => setNewGroupLabel(v.slice(0, GROUP_NAME_MAX))}
                placeholder={t('goalDetail.newGroupName')}
                placeholderTextColor={tone.textMuted}
                maxLength={GROUP_NAME_MAX}
                returnKeyType="done"
                onSubmitEditing={handleSubmitNewGroup}
                style={[
                  styles.input,
                  {
                    color: tone.text,
                    backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                  },
                ]}
              />
            </SolidChipShell>
          </View>
          <BrutalConfirmButton
            label={t('common.add')}
            accessibilityLabel={t('common.add')}
            compact
            disabled={newGroupLabel.trim().length === 0}
            fill={RetroFlatColors.light.primaryContainer}
            labelColor={RetroFlatColors.light.primary}
            shadowColor={shadowInk}
            onPress={handleSubmitNewGroup}
          />
          <SolidChipShell shadowColor={shadowInk}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              onPress={() => {
                setIsAddingGroup(false);
                setNewGroupLabel('');
              }}
              hitSlop={8}
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                },
              ]}>
              <IconSymbol name="xmark" size={12} color={tone.text} />
            </Pressable>
          </SolidChipShell>
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
  chipShell: {
    position: 'relative',
  },
  chipShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 0,
    borderWidth: 0,
    zIndex: 1,
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
  newGroupInputGrow: {
    flex: 1,
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
    zIndex: 1,
    ...(Platform.OS === 'android'
      ? { textAlignVertical: 'center' as const, includeFontPadding: false }
      : {}),
  },
  cancelBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderRadius: 0,
    zIndex: 1,
  },
});
