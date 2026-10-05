import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors, cityPopFont } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

const ROW_SHADOW = 2;

type Props = {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
  /** 「확인해 보기」— 위젯 설명서로 이동 */
  onOpenWidgetGuide: () => void;
};

/** 「포킷 빠르게 둘러보기」레이아웃 안내 다음 — 홈 위젯 써보기 */
export function PokitWeekTourWidgetNudgeSheet({
  visible,
  isDark,
  onClose,
  onOpenWidgetGuide,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const ink = tone.text;
  const muted = tone.textMuted;
  const face = isDark ? tone.surfaceAlt : '#FFFFFF';
  const shadowInk = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)';
  const rowBorder = isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)';

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
          <PostItCardShell isDark={isDark} faceColor={face} contentStyle={styles.card}>
            <ThemedText style={[styles.kicker, { color: muted }, cityPopFont('500')]}>
              {t('tour.pokitWeek.widgetNudge.kicker')}
            </ThemedText>
            <ThemedText style={[styles.title, { color: ink }, cityPopFont('700')]}>
              {t('tour.pokitWeek.widgetNudge.title')}
            </ThemedText>
            <ThemedText style={[styles.body, { color: muted }, cityPopFont('400')]}>
              {t('tour.pokitWeek.widgetNudge.body')}
            </ThemedText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.a11y.widgetGuide')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenWidgetGuide();
              }}
              style={[styles.previewRow, { borderColor: rowBorder }]}>
              <View
                style={[
                  styles.iconShell,
                  { marginRight: ROW_SHADOW, marginBottom: ROW_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.iconShadow,
                    {
                      backgroundColor: shadowInk,
                      transform: [{ translateX: ROW_SHADOW }, { translateY: ROW_SHADOW }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.55)' : '#000000',
                    },
                  ]}>
                  <IconSymbol name="square.grid.2x2" size={16} color={isDark ? '#FAFAFA' : '#000000'} />
                </View>
              </View>
              <View style={styles.previewText}>
                <ThemedText style={[styles.previewTitle, { color: ink }, cityPopFont('700')]}>
                  {t('settings.widgetGuideTitle')}
                </ThemedText>
                <ThemedText style={[styles.previewDesc, { color: muted }, cityPopFont('500')]}>
                  {t('settings.widgetGuideDesc')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={14} color={muted} />
            </Pressable>

            <View style={styles.actions}>
              <View
                style={[
                  styles.closeShell,
                  { marginRight: ROW_SHADOW, marginBottom: ROW_SHADOW },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.closeShadow,
                    {
                      backgroundColor: shadowInk,
                      transform: [{ translateX: ROW_SHADOW }, { translateY: ROW_SHADOW }],
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
                  style={[
                    styles.secondaryBtn,
                    { backgroundColor: isDark ? tone.surfaceAlt : '#FFFFFF' },
                  ]}>
                  <ThemedText style={[styles.secondaryLabel, { color: muted }, cityPopFont('500')]}>
                    {t('common.close')}
                  </ThemedText>
                </Pressable>
              </View>
              <BrutalConfirmButton
                label={t('tour.pokitWeek.widgetNudge.cta')}
                accessibilityLabel={t('tour.pokitWeek.widgetNudge.cta')}
                labelColor="#000000"
                shadowColor={shadowInk}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenWidgetGuide();
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
  body: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.15,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  iconShell: {
    position: 'relative',
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  iconShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 0,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  previewText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  previewTitle: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  previewDesc: {
    fontSize: 11,
    lineHeight: 15,
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
