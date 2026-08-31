import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
};

/** 고정 루틴 목록 모드 — 요약 안내 카드 */
export function FixedRoutineListModeCard({ ink, muted, line, cardBg }: Props) {
  return (
    <View style={[styles.root, { backgroundColor: cardBg, borderColor: line }]}>
      <View style={styles.textCol}>
        <ThemedText style={[styles.title, { color: ink }]}>목록 모드</ThemedText>
        <ThemedText style={[styles.summary, { color: muted }]} numberOfLines={3}>
          그룹·항목을 정리한 뒤 적용을 켜면 오늘 탭 목록 보기에 반영돼요. 시간·시간대 설정은
          시간대 보기에서 할 수 있어요.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
});
