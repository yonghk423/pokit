import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  resolveCustomCatalogGroupDisplayLabel,
  SYSTEM_CATALOG_GROUP_KEYS,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import {
  createCustomCatalogGroup,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
} from '@shared/lib/storage';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import { PRIMARY } from '../lib/dayPlanEditorShared';

const GROUP_NAME_MAX = 24;
const CHIP_SHADOW = 2;

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
  const { t } = useTranslation();

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
      label: resolveCustomCatalogGroupDisplayLabel(g.key, g.label),
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
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowInk = isDark ? tone.solidShadow : tone.text;
  const chipIdleBg = isDark ? tone.surfaceAlt : '#FFFFFF';

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
                <ThemedText style={[styles.title, { color: ink }]}>{t('catalog.moveGroupTitle')}</ThemedText>
                <ThemedText style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
                  {t('catalog.moveGroupSubtitle', { label: flowLabel })}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={8}
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: closeBtnBg }]}>
                <IconSymbol name="xmark" size={13} color={muted} />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={[styles.fieldLabel, { color: ink }]}>{t('createFlow.parentCategory')}</ThemedText>
              <ThemedText style={[styles.fieldHint, { color: muted }]}>
                {t('catalog.moveGroupPickHint')}
              </ThemedText>

              <View style={styles.chipsWrap}>
                {groupOptions.map((g) => {
                  const selected = selectedGroupKey === g.key;
                  const shadow = selected ? 3 : CHIP_SHADOW;
                  return (
                    <View
                      key={g.key}
                      style={[
                        styles.chipShell,
                        { marginRight: shadow, marginBottom: shadow },
                      ]}>
                      <View
                        pointerEvents="none"
                        style={[
                          styles.chipShadow,
                          {
                            backgroundColor: shadowInk,
                            transform: [{ translateX: shadow }, { translateY: shadow }],
                          },
                        ]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setSelectedGroupKey(g.key);
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          {
                            backgroundColor: selected ? tone.primaryContainer : chipIdleBg,
                            opacity: pressed ? 0.92 : 1,
                          },
                        ]}>
                        {selected ? (
                          <IconSymbol
                            name="checkmark"
                            size={11}
                            color={tone.primary}
                            weight="bold"
                          />
                        ) : null}
                        <ThemedText
                          style={[
                            styles.chipText,
                            {
                              color: selected ? tone.primary : muted,
                              fontWeight: selected ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}>
                          {g.label}
                        </ThemedText>
                      </Pressable>
                    </View>
                  );
                })}

                {!isAddingGroup ? (
                  <View
                    style={[
                      styles.chipShell,
                      { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                    ]}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.chipShadow,
                        {
                          backgroundColor: shadowInk,
                          transform: [
                            { translateX: CHIP_SHADOW },
                            { translateY: CHIP_SHADOW },
                          ],
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('createFlow.newGroup')}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAddingGroup(true);
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: chipIdleBg,
                          opacity: pressed ? 0.92 : 1,
                        },
                      ]}>
                      <IconSymbol name="plus" size={11} color={ink} weight="bold" />
                      <ThemedText style={[styles.chipText, { color: ink, fontWeight: '700' }]}>
                        {t('createFlow.newGroup')}
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {isAddingGroup ? (
                <View style={styles.newGroupRow}>
                  <ThemedTextInput
                    autoFocus
                    value={newGroupLabel}
                    onChangeText={(v) => setNewGroupLabel(v.slice(0, GROUP_NAME_MAX))}
                    placeholder={t('createFlow.newGroupPlaceholder')}
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                    maxLength={GROUP_NAME_MAX}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmitNewGroup}
                    style={[
                      styles.input,
                      styles.newGroupInput,
                      { color: ink, backgroundColor: inputBg, borderColor: inputBorder },
                    ]}
                  />
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
                  <View
                    style={[
                      styles.cancelShell,
                      { marginRight: CHIP_SHADOW, marginBottom: CHIP_SHADOW },
                    ]}>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.chipShadow,
                        {
                          backgroundColor: shadowInk,
                          transform: [{ translateX: CHIP_SHADOW }, { translateY: CHIP_SHADOW }],
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.cancel')}
                      onPress={() => {
                        setIsAddingGroup(false);
                        setNewGroupLabel('');
                      }}
                      hitSlop={8}
                      style={[styles.cancelBtn, { backgroundColor: closeBtnBg }]}>
                      <IconSymbol name="xmark" size={12} color={muted} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.ctaWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel={t('catalog.moveGroupCta')}
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
                {t('catalog.moveGroupCta')}
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
    borderRadius: 0,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: 0,
    zIndex: 1,
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
  newGroupInput: {
    flex: 1,
    height: 40,
  },
  cancelShell: {
    position: 'relative',
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ctaWrap: {
    paddingHorizontal: 22,
    paddingTop: 8,
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
