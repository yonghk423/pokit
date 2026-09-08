import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { POKIT_WEEK_TOUR_STEP_COUNT } from '@shared/lib/storage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
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

/** 앱 실제 버튼과 같은 SF Symbol + 라벨 키 */
const STEP_TARGETS = [
  {
    icon: 'list.bullet.rectangle',
    labelKey: 'tabs.routines',
    placeKey: 'tour.pokitWeek.targetPlace.bottomTab',
  },
  {
    icon: 'figure.walk',
    labelKey: 'tabs.myRoutines',
    placeKey: 'tour.pokitWeek.targetPlace.bottomTab',
  },
  {
    icon: 'clock.arrow.circlepath',
    labelKey: 'tabs.history',
    placeKey: 'tour.pokitWeek.targetPlace.bottomTab',
  },
  {
    icon: 'checklist',
    labelKey: 'guideBook.figure.headerTodo',
    placeKey: 'tour.pokitWeek.targetPlace.todayHeader',
  },
  {
    icon: 'book.closed.fill',
    labelKey: 'planMode.reading',
    placeKey: 'tour.pokitWeek.targetPlace.topMode',
  },
  {
    icon: 'note.text',
    labelKey: 'planMode.quickMemo',
    placeKey: 'tour.pokitWeek.targetPlace.topMode',
  },
  {
    icon: 'square.and.pencil',
    labelKey: 'planMode.dayNote',
    placeKey: 'tour.pokitWeek.targetPlace.topMode',
  },
] as const satisfies readonly {
  icon: string;
  labelKey: I18nKey;
  placeKey: I18nKey;
}[];

const CLOSE_SHADOW = 2;

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
  const target = STEP_TARGETS[safeIndex]!;
  const ink = tone.text;
  const muted = tone.textMuted;
  const face = isDark ? tone.surfaceAlt : '#FFFFFF';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const shadowInk = isDark ? tone.solidShadow : '#000000';

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
          <PostItCardShell isDark={isDark} faceColor={face} contentStyle={styles.card}>
            <ThemedText style={[styles.kicker, { color: muted }, cityPopFont('500')]}>
              {t('tour.pokitWeek.tipKicker', {
                current: safeIndex + 1,
                total: POKIT_WEEK_TOUR_STEP_COUNT,
              })}
            </ThemedText>
            <ThemedText style={[styles.title, { color: ink }, cityPopFont('700')]}>{title}</ThemedText>

            <View
              style={[styles.targetRow, { backgroundColor: chipBg }]}
              accessibilityRole="text"
              accessibilityLabel={`${t(target.placeKey)} ${t(target.labelKey)}`}>
              <View
                style={[
                  styles.targetIconShell,
                  { marginRight: CLOSE_SHADOW, marginBottom: CLOSE_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.targetIconShadow,
                    {
                      backgroundColor: shadowInk,
                      transform: [{ translateX: CLOSE_SHADOW }, { translateY: CLOSE_SHADOW }],
                    },
                  ]}
                />
                <View style={[styles.targetIconBox, { backgroundColor: face }]}>
                  <IconSymbol name={target.icon as 'book.closed.fill'} size={22} color={ink} />
                </View>
              </View>
              <View style={styles.targetText}>
                <ThemedText style={[styles.targetPlace, { color: muted }, cityPopFont('500')]}>
                  {t(target.placeKey)}
                </ThemedText>
                <ThemedText style={[styles.targetLabel, { color: ink }, cityPopFont('700')]}>
                  {t(target.labelKey)}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.body, { color: muted }, cityPopFont('400')]}>{body}</ThemedText>
            <View style={styles.actions}>
              <View
                style={[
                  styles.closeShell,
                  { marginRight: CLOSE_SHADOW, marginBottom: CLOSE_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.closeShadow,
                    {
                      backgroundColor: shadowInk,
                      transform: [{ translateX: CLOSE_SHADOW }, { translateY: CLOSE_SHADOW }],
                    },
                  ]}
                />
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
                      backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <ThemedText style={[styles.secondaryLabel, { color: muted }, cityPopFont('500')]}>
                    {t('common.close')}
                  </ThemedText>
                </Pressable>
              </View>
              <BrutalConfirmButton
                label={t('tour.pokitWeek.gotIt')}
                accessibilityLabel={t('tour.pokitWeek.gotIt')}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onConfirm();
                }}
              />
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
    letterSpacing: -0.1,
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0,
  },
  targetIconShell: {
    position: 'relative',
  },
  targetIconShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  targetIconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    zIndex: 1,
  },
  targetText: {
    flex: 1,
    gap: 2,
  },
  targetPlace: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  targetLabel: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.15,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  closeShell: {
    position: 'relative',
  },
  closeShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 0,
    zIndex: 1,
  },
  secondaryLabel: {
    fontSize: 13,
  },
});
