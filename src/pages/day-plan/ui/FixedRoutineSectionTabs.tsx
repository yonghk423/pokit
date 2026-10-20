import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import * as Haptics from 'expo-haptics';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

export type FixedRoutineSection = 'catalog' | 'templates' | 'myRoutines';

type TabDef = {
  key: FixedRoutineSection;
  labelKey: I18nKey;
};

const TABS: TabDef[] = [
  { key: 'catalog', labelKey: 'catalog.routineListTab' },
  { key: 'myRoutines', labelKey: 'catalog.myRoutinesTab' },
  ...(FEATURE_FLAGS.routineTemplates ? [{ key: 'templates' as const, labelKey: 'catalog.routineTemplatesTab' as const }] : []),
];

/** 투두 휴지통·액션 버튼과 동일 솔리드 음영 */
const ACTION_SHADOW = 1;
const ACTION_SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const ACTION_SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';

type Props = {
  /** `history`면 세그먼트 탭은 모두 비활성(히스토리 포스트잇이 활성) */
  section: FixedRoutineSection | 'history';
  onSelectSection: (section: FixedRoutineSection) => void;
  c: DayPlanPalette;
  isDark: boolean;
};

/** 루틴 탭 — 좌상단 컴팩트 포스트잇 세그먼트 */
export function FixedRoutineSectionTabs({
  section,
  onSelectSection,
  c: _c,
  isDark,
}: Props) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<Partial<Record<FixedRoutineSection, string>>>(() => {
    const saved = localStorageClient.getJson<Record<string, unknown>>(StorageKeys.routineTabLabels);
    return Object.fromEntries(TABS.flatMap(tab => {
      const value = saved?.[tab.key];
      return typeof value === 'string' && value.trim() ? [[tab.key, value.trim().slice(0, 16)]] : [];
    }));
  });
  const [editing, setEditing] = useState<TabDef | null>(null);
  const [draft, setDraft] = useState('');
  const openEditor = (tab: TabDef) => {
    setDraft(labels[tab.key] ?? t(tab.labelKey));
    setEditing(tab);
  };
  const save = () => {
    if (!editing || !draft.trim()) return;
    const next = { ...labels, [editing.key]: draft.trim().slice(0, 16) };
    localStorageClient.setJson(StorageKeys.routineTabLabels, next);
    setLabels(next);
    setEditing(null);
  };

  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  /** 설정·템플릿 리스트와 같이 화이트 면 */
  const face = isDark ? tone.surfaceAlt : '#FFFFFF';
  const divider = isDark ? 'rgba(241,239,255,0.22)' : 'rgba(24,26,46,0.12)';
  const activeBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(24,26,46,0.06)';
  const activeText = isDark ? tone.text : '#000000';
  const inactiveText = isDark ? tone.textMuted : '#000000';
  const softShadow = isDark ? ACTION_SOFT_SHADOW_DARK : ACTION_SOFT_SHADOW_LIGHT;

  return (
    <>
    <PostItCardShell
      compact
      isDark={isDark}
      faceColor={face}
      shadowColor={softShadow}
      shadowOffset={ACTION_SHADOW}
      style={styles.root}
      contentStyle={styles.track}>
      {TABS.map((tab, index) => {
        const active = section === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labels[tab.key] ?? t(tab.labelKey)}
            accessibilityHint={t('catalog.renameTabHint')}
            onLongPress={() => openEditor(tab)}
            onPress={() => {
              if (active) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectSection(tab.key);
            }}
            style={({ pressed }) => [
              styles.tab,
              index > 0 && [styles.tabJoin, { borderLeftColor: divider }],
              {
                backgroundColor: active ? activeBg : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <PaperGrain />
            {active ? <HanddrawnFrame color={activeText} /> : null}
            <ThemedText
              style={[
                styles.tabLabel,
                active && styles.tabLabelActive,
                { color: active ? activeText : inactiveText },
              ]}
              numberOfLines={1}>
              {labels[tab.key] ?? t(tab.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel={t('catalog.renameTabTitle')}
        hitSlop={6} onPress={() => openEditor(TABS.find(tab => tab.key === section) ?? TABS[0])}
        style={{ paddingHorizontal: 10, justifyContent: 'center' }}>
        <IconSymbol name="pencil" size={14} color={activeText} />
      </Pressable>
    </PostItCardShell>
    <AppModal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.22)' }}>
        <View style={{ backgroundColor: face, padding: 20, gap: 16, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
          <HanddrawnFrame color={activeText} />
          <ThemedText style={{ color: activeText, fontSize: 17 }}>{t('catalog.renameTabTitle')}</ThemedText>
          <ThemedTextInput autoFocus value={draft} onChangeText={setDraft} maxLength={16}
            accessibilityLabel={t('catalog.renameTabTitle')} returnKeyType="done" onSubmitEditing={save}
            style={{ color: activeText, borderBottomWidth: 1, borderBottomColor: divider, paddingVertical: 10, fontSize: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Pressable accessibilityRole="button" onPress={() => { if (!editing) return; const next = { ...labels }; delete next[editing.key]; localStorageClient.setJson(StorageKeys.routineTabLabels, next); setLabels(next); setEditing(null); }} style={{ paddingVertical: 10 }}>
              <ThemedText style={{ color: inactiveText }}>{t('catalog.resetTabName')}</ThemedText>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable accessibilityRole="button" onPress={() => setEditing(null)} style={{ paddingVertical: 10 }}><ThemedText style={{ color: activeText }}>{t('common.cancel')}</ThemedText></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !draft.trim() }} disabled={!draft.trim()} onPress={save} style={{ paddingVertical: 10, opacity: draft.trim() ? 1 : 0.35 }}><ThemedText style={{ color: activeText }}>{t('common.save')}</ThemedText></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 2,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tabJoin: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  tabLabelActive: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
});
