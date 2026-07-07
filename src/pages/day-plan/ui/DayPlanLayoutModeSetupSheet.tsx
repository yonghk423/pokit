import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PriorityLayoutLinkMode } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanLayoutMode } from './DayPlanLayoutModeTabs';

type Props = {
  visible: boolean;
  targetMode: Extract<DayPlanLayoutMode, 'sections' | 'spine'>;
  bagCount: number;
  initialLinkMode?: PriorityLayoutLinkMode | null;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onConfirm: (mode: PriorityLayoutLinkMode) => void;
};

type Option = {
  mode: PriorityLayoutLinkMode;
  title: string;
  body: string;
  icon: string;
};

function optionsFor(targetMode: Extract<DayPlanLayoutMode, 'sections' | 'spine'>, bagCount: number): Option[] {
  if (targetMode === 'sections') {
    return [
      {
        mode: 'linked',
        title: bagCount > 0 ? '목록 루틴 이어서 쓰기' : '목록과 연동',
        body:
          bagCount > 0
            ? '목록에 담은 루틴을 시간대별로 배치해요. 시간대가 없는 루틴은 먼저 지정해 주세요.'
            : '목록에 담은 루틴이 생기면 시간대별 보기에 함께 반영돼요.',
        icon: 'link',
      },
      {
        mode: 'independent',
        title: '시간대별로 따로 관리',
        body: '목록과 별도로 시간대별 루틴을 구성해요. 각 시간대에서 직접 루틴을 추가할 수 있어요.',
        icon: 'sun.horizon.fill',
      },
    ];
  }

  return [
    {
      mode: 'linked',
      title: bagCount > 0 ? '목록 루틴 이어서 쓰기' : '목록과 연동',
      body:
        bagCount > 0
          ? '목록에 담은 루틴을 타임라인에 올릴 수 있어요. 각 루틴의 시작·종료 시각을 정해 주세요.'
          : '목록에 담은 루틴이 생기면 타임라인에서 함께 다룰 수 있어요.',
      icon: 'link',
    },
    {
      mode: 'independent',
      title: '타임라인만 따로 사용',
      body: '빈 타임라인에서 직접 일정을 추가해요. 목록과는 별도로 관리돼요.',
      icon: 'clock',
    },
  ];
}

function titleFor(targetMode: Extract<DayPlanLayoutMode, 'sections' | 'spine'>): string {
  return targetMode === 'sections' ? '시간대별 보기 설정' : '타임라인 보기 설정';
}

function bagCountLine(count: number): string | null {
  if (count <= 0) return null;
  return `추가되어 있는 루틴이 ${count}가지 있습니다.`;
}

export function DayPlanLayoutModeSetupSheet({
  visible,
  targetMode,
  bagCount,
  initialLinkMode = null,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PriorityLayoutLinkMode>('linked');
  const options = optionsFor(targetMode, bagCount);
  const bagCountSubtitle = bagCountLine(bagCount);

  useEffect(() => {
    if (!visible) return;
    if (initialLinkMode) {
      setSelected(initialLinkMode);
      return;
    }
    setSelected(bagCount > 0 ? 'linked' : 'independent');
  }, [bagCount, initialLinkMode, targetMode, visible]);

  const handleConfirm = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(selected);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: ink }]}>{titleFor(targetMode)}</ThemedText>
            {bagCountSubtitle ? (
              <ThemedText style={[styles.subtitle, { color: ink }]}>{bagCountSubtitle}</ThemedText>
            ) : null}
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              목록 루틴과 연동할지, 따로 관리할지 선택해 주세요.
            </ThemedText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={8}>
            <IconSymbol name="xmark" size={16} color={muted} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {options.map((option) => {
            const active = selected === option.mode;
            return (
              <Pressable
                key={option.mode}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelected(option.mode);
                }}
                style={[
                  styles.optionCard,
                  {
                    borderColor: active ? ink : line,
                    backgroundColor: active
                      ? isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                  },
                ]}>
                <View style={styles.optionHead}>
                  <IconSymbol name={option.icon as 'link'} size={16} color={active ? ink : muted} />
                  <ThemedText style={[styles.optionTitle, { color: ink }]}>{option.title}</ThemedText>
                </View>
                <ThemedText style={[styles.optionBody, { color: muted }]}>{option.body}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.footer, { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="선택 완료"
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: PrimaryColor.rgb },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.confirmLabel}>계속</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, gap: 6 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  optionCard: { borderWidth: 2, padding: 14, gap: 8 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  optionBody: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  confirmBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  confirmLabel: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  pressed: { opacity: 0.82 },
});
