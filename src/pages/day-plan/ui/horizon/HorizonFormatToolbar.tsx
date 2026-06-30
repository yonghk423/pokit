import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import type { HorizonBlockType } from '@shared/lib/storage/horizonGoalBlocks';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { PRIMARY } from '../../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  onPickType: (type: HorizonBlockType) => void;
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onAddBlock: () => void;
  selectedType?: HorizonBlockType;
  boldActive?: boolean;
  underlineActive?: boolean;
};

export function HorizonFormatToolbar({
  c,
  isDark,
  onPickType,
  onToggleBold,
  onToggleUnderline,
  onAddBlock,
  selectedType = 'paragraph',
  boldActive,
  underlineActive,
}: Props) {
  const barBg = isDark ? '#27272a' : '#ffffff';
  const ink = c.onSurface;
  const muted = c.onVariant;
  const dividerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const tap = (fn: () => void) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const activeBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: barBg,
          borderColor: c.catBorderIdle,
          shadowColor: c.shadow,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="섹션제목1"
        onPressIn={() => tap(() => onPickType('heading1'))}
        style={[styles.textBtn, selectedType === 'heading1' && [styles.textBtnActive, { backgroundColor: activeBg }]]}>
        <ThemedText style={[styles.toolText, { color: ink }]}>T1</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="섹션제목2"
        onPressIn={() => tap(() => onPickType('heading2'))}
        style={[styles.textBtn, selectedType === 'heading2' && [styles.textBtnActive, { backgroundColor: activeBg }]]}>
        <ThemedText style={[styles.toolText, { color: ink }]}>T2</ThemedText>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="체크리스트"
        onPressIn={() => tap(() => onPickType('checklist'))}
        style={[styles.iconBtn, selectedType === 'checklist' && [styles.textBtnActive, { backgroundColor: activeBg }]]}>
        <IconSymbol name="checklist" size={20} color={selectedType === 'checklist' ? PRIMARY : muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="리스트"
        onPressIn={() => tap(() => onPickType('bullet'))}
        style={[styles.iconBtn, selectedType === 'bullet' && [styles.textBtnActive, { backgroundColor: activeBg }]]}>
        <IconSymbol name="list.bullet" size={20} color={selectedType === 'bullet' ? PRIMARY : muted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="번호 리스트"
        onPressIn={() => tap(() => onPickType('numbered'))}
        style={[styles.iconBtn, selectedType === 'numbered' && [styles.textBtnActive, { backgroundColor: activeBg }]]}>
        <IconSymbol name="list.number" size={20} color={selectedType === 'numbered' ? PRIMARY : muted} />
      </Pressable>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="굵게"
        onPressIn={() => tap(onToggleBold)}
        style={[
          styles.textBtn,
          boldActive && [styles.textBtnActive, { backgroundColor: activeBg }],
        ]}>
        <ThemedText style={[styles.toolText, styles.toolTextBold, { color: boldActive ? PRIMARY : ink }]}>B</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="밑줄"
        onPressIn={() => tap(onToggleUnderline)}
        style={[
          styles.textBtn,
          underlineActive && [styles.textBtnActive, { backgroundColor: activeBg }],
        ]}>
        <ThemedText style={[styles.toolText, styles.toolTextUnderline, { color: underlineActive ? PRIMARY : ink }]}>U</ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="블록 추가"
        onPressIn={() => tap(onAddBlock)}
        style={[styles.plusBtn, { backgroundColor: isDark ? '#fafafa' : PRIMARY }]}>
        <IconSymbol name="plus" size={20} color={isDark ? '#09090b' : '#ffffff'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  textBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  toolText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolTextBold: {
    fontWeight: '800',
  },
  toolTextUnderline: {
    textDecorationLine: 'underline',
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
