import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

export type HistoryDayDetail = {
  categoryLabel: string;
  dateLabel: string;
  done: boolean;
};

type Props = {
  detail: HistoryDayDetail | null;
  isDark: boolean;
  onClose: () => void;
};

/** 히스토리 격자 점/칸 탭 — 그날 완료 여부 상세 */
export function HistoryDayDetailSheet({ detail, isDark, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const visible = detail != null;
  const softShadow = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View
          style={[styles.sheetWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}
          pointerEvents="box-none">
          {detail ? (
            <PostItCardShell
              isDark={isDark}
              faceColor={isDark ? tone.surfaceAlt : '#FFFFFF'}
              shadowColor={softShadow}
              contentStyle={styles.card}>
              <ThemedText style={[styles.kicker, { color: tone.textMuted }, cityPopFont('500')]}>
                {t('history.dayDetail.kicker')}
              </ThemedText>
              <ThemedText style={[styles.title, { color: tone.text }, cityPopFont('700')]}>
                {detail.categoryLabel}
              </ThemedText>
              <ThemedText style={[styles.date, { color: tone.textMuted }, cityPopFont('600')]}>
                {detail.dateLabel}
              </ThemedText>
              <ThemedText
                style={[
                  styles.status,
                  { color: detail.done ? tone.text : tone.textMuted },
                  cityPopFont('700'),
                ]}>
                {detail.done ? t('history.dayDetail.done') : t('history.dayDetail.missed')}
              </ThemedText>
              <View style={styles.actions}>
                <BrutalConfirmButton
                  label={t('common.close')}
                  accessibilityLabel={t('common.close')}
                  shadowColor={softShadow}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    onClose();
                  }}
                />
              </View>
            </PostItCardShell>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  sheetWrap: {
    width: '100%',
  },
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  status: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
});
