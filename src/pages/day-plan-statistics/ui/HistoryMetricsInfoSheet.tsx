import * as Haptics from 'expo-haptics';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  visible: boolean;
  sheetBg: string;
  ink: string;
  muted: string;
  border: string;
  onClose: () => void;
};

type InfoSection = {
  title: string;
  body: string;
};

const SECTIONS: InfoSection[] = [
  {
    title: '달성률(완료율)',
    body:
      '상단에서 고른 달 기준으로, 완료 기록이 쌓인 날들의 평균 완료 비율이에요. 그날 담은 항목 중 몇 개를 끝냈는지로 계산돼요. 이번 달이면 1일부터 오늘까지, 지난 달이면 그 달 전체를 봅니다.',
  },
  {
    title: '지난달 대비',
    body: '이번 달 달성률과 바로 이전 달 달성률을 비교한 변화예요. 전월에 기록이 거의 없으면 비교가 어려울 수 있어요.',
  },
  {
    title: '루틴별 연속 달성',
    body:
      '「그날 루틴 기록」에서 각 루틴마다, 선택한 날짜부터 거꾸로 그 루틴을 완료한 날이 며칠 이어졌는지 보여줘요. 그날 해당 루틴을 완료하지 않았으면 연속 없음으로 표시돼요.',
  },
  {
    title: '아래 그래프',
    body: '선택한 달의 날짜별 완료율 흐름이에요. 기록이 없는 날은 0으로 보이며, 완료를 이어가면 선이 올라가요.',
  },
];

export function HistoryMetricsInfoSheet({ visible, sheetBg, ink, muted, border, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.dim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}>
          <View style={[styles.grabber, { backgroundColor: border }]} />
          <View style={styles.headerRow}>
            <ThemedText style={[styles.title, { color: ink }]}>지표 안내</ThemedText>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                onClose();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="닫기">
              <IconSymbol name="xmark" size={18} color={muted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={[styles.section, { borderColor: border }]}>
                <ThemedText style={[styles.sectionTitle, { color: ink }]}>{section.title}</ThemedText>
                <ThemedText style={[styles.sectionBody, { color: muted }]} lightColor={muted} darkColor={muted}>
                  {section.body}
                </ThemedText>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '78%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  section: {
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  sectionBody: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.15,
  },
});
