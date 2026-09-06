import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { POKIT_WEEK_TOUR_STEP_COUNT } from '@shared/lib/storage';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

const STEP_TITLE_KEYS = [
  'tour.pokitWeek.step1.title',
  'tour.pokitWeek.step2.title',
  'tour.pokitWeek.step3.title',
  'tour.pokitWeek.step4.title',
  'tour.pokitWeek.step5.title',
  'tour.pokitWeek.step6.title',
  'tour.pokitWeek.step7.title',
] as const satisfies readonly I18nKey[];

const STEP_BODY_KEYS = [
  'tour.pokitWeek.step1.body',
  'tour.pokitWeek.step2.body',
  'tour.pokitWeek.step3.body',
  'tour.pokitWeek.step4.body',
  'tour.pokitWeek.step5.body',
  'tour.pokitWeek.step6.body',
  'tour.pokitWeek.step7.body',
] as const satisfies readonly I18nKey[];

type Props = {
  visible: boolean;
  stepIndex: number;
  isDark: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/** 「포킷 빠르게 둘러보기」 체크 항목 탭 시 단계별 설명 */
export function PokitWeekTourTipSheet({
  visible,
  stepIndex,
  isDark,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const safeIndex =
    Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < POKIT_WEEK_TOUR_STEP_COUNT
      ? stepIndex
      : 0;
  const title = t(STEP_TITLE_KEYS[safeIndex]!);
  const body = t(STEP_BODY_KEYS[safeIndex]!);
  const ink = tone.text;
  const muted = tone.textMuted;
  const face = isDark ? tone.surfaceAlt : '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      {/* 중첩 Pressable은 iOS에서 버튼 터치를 삼키는 경우가 있어 dim / 시트 분리 */}
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
          <PostItCardShell
            isDark={isDark}
            faceColor={face}
            borderColor={isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)'}
            borderWidth={StyleSheet.hairlineWidth}
            contentStyle={styles.card}>
            <ThemedText style={[styles.kicker, { color: muted }]}>
              {t('tour.pokitWeek.tipKicker', {
                current: safeIndex + 1,
                total: POKIT_WEEK_TOUR_STEP_COUNT,
              })}
            </ThemedText>
            <ThemedText style={[styles.title, { color: ink }]}>{title}</ThemedText>
            <ThemedText style={[styles.body, { color: muted }]}>{body}</ThemedText>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
                    backgroundColor: pressed
                      ? isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                  },
                ]}>
                <ThemedText style={[styles.secondaryLabel, { color: muted }]}>
                  {t('common.close')}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tour.pokitWeek.gotIt')}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onConfirm();
                }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: ink,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <ThemedText style={[styles.primaryLabel, { color: face }]}>
                  {t('tour.pokitWeek.gotIt')}
                </ThemedText>
              </Pressable>
            </View>
          </PostItCardShell>
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
    gap: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    letterSpacing: -0.15,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
