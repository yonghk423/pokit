import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateRoutine: () => void;
  onCreateGroup: () => void;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
};

const SHADOW_SM = 2;

function ChoiceOption({
  accessibilityLabel,
  title,
  hint,
  icon,
  iconSize,
  ink,
  muted,
  rowBg,
  rowBgPressed,
  iconBg,
  shadow,
  onPress,
}: {
  accessibilityLabel: string;
  title: string;
  hint: string;
  icon: 'plus.circle.fill' | 'folder.fill';
  iconSize: number;
  ink: string;
  muted: string;
  rowBg: string;
  rowBgPressed: string;
  iconBg: string;
  shadow: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.optionShell, { marginRight: SHADOW_SM, marginBottom: SHADOW_SM }]}>
      <View
        pointerEvents="none"
        style={[
          styles.optionShadow,
          {
            backgroundColor: shadow,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          styles.optionRow,
          { backgroundColor: pressed ? rowBgPressed : rowBg },
        ]}>
        <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
          <IconSymbol name={icon} size={iconSize} color={ink} />
        </View>
        <View style={styles.optionText}>
          <ThemedText style={[styles.optionTitle, { color: ink }]}>{title}</ThemedText>
          <ThemedText style={[styles.optionHint, { color: muted }]}>{hint}</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={14} color={muted} />
      </Pressable>
    </View>
  );
}

/** `+` 버튼 — 새 루틴 / 새 묶음 선택 */
export function CreateCatalogEntryChoiceSheet({
  visible,
  onClose,
  onCreateRoutine,
  onCreateGroup,
  isDark,
  ink,
  muted,
  surface,
  line,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  /** 외곽선 없이 음영만 쓸 때는 면이 불투명해야 뒤 그림자가 비치지 않음 */
  const rowBg = isDark ? RetroFlatColors.dark.surfaceContainer : '#FFFFFF';
  const rowBgPressed = isDark ? RetroFlatColors.dark.surfaceAlt : '#F3F0E8';
  const iconBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: surface,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}>
          <View style={styles.handleBar}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: ink }]}>{t('catalog.choiceTitle')}</ThemedText>
            <ThemedText style={[styles.lead, { color: muted }]}>{t('catalog.choiceLead')}</ThemedText>
          </View>

          <View style={styles.options}>
            <ChoiceOption
              accessibilityLabel={t('catalog.choiceNewRoutineA11y')}
              title={t('catalog.choiceNewRoutineTitle')}
              hint={t('catalog.choiceNewRoutineHint')}
              icon="plus.circle.fill"
              iconSize={20}
              ink={ink}
              muted={muted}
              rowBg={rowBg}
              rowBgPressed={rowBgPressed}
              iconBg={iconBg}
              shadow={line}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateRoutine();
              }}
            />
            <ChoiceOption
              accessibilityLabel={t('catalog.choiceNewGroupA11y')}
              title={t('catalog.choiceNewGroupTitle')}
              hint={t('catalog.choiceNewGroupHint')}
              icon="folder.fill"
              iconSize={18}
              ink={ink}
              muted={muted}
              rowBg={rowBg}
              rowBgPressed={rowBgPressed}
              iconBg={iconBg}
              shadow={line}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateGroup();
              }}
            />
          </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  lead: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.15,
  },
  options: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  optionShell: {
    position: 'relative',
  },
  optionShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 0,
    borderRadius: 0,
    zIndex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  optionHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
});
