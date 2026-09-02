import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const rowBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const iconBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('catalog.choiceNewRoutineA11y')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateRoutine();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                { backgroundColor: rowBg, borderColor: line, opacity: pressed ? 0.82 : 1 },
              ]}>
              <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
                <IconSymbol name="plus.circle.fill" size={20} color={ink} />
              </View>
              <View style={styles.optionText}>
                <ThemedText style={[styles.optionTitle, { color: ink }]}>
                  {t('catalog.choiceNewRoutineTitle')}
                </ThemedText>
                <ThemedText style={[styles.optionHint, { color: muted }]}>
                  {t('catalog.choiceNewRoutineHint')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={14} color={muted} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('catalog.choiceNewGroupA11y')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateGroup();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                { backgroundColor: rowBg, borderColor: line, opacity: pressed ? 0.82 : 1 },
              ]}>
              <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
                <IconSymbol name="folder.fill" size={18} color={ink} />
              </View>
              <View style={styles.optionText}>
                <ThemedText style={[styles.optionTitle, { color: ink }]}>
                  {t('catalog.choiceNewGroupTitle')}
                </ThemedText>
                <ThemedText style={[styles.optionHint, { color: muted }]}>
                  {t('catalog.choiceNewGroupHint')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={14} color={muted} />
            </Pressable>
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 0,
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
