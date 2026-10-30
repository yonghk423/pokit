import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { AppModal as Modal } from '@shared/ui/app-modal';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildInitialCustomFlowDetailConfig,
  listCustomFlowTemplateCatalogEntries,
  resolveAppliedCustomFlowTemplateLabel,
  resolveCustomFlowTemplateCatalogEntry,
  resolveCustomFlowTemplateKey,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { readRoutineDisplayNameFromConfig } from '@entities/day-plan/lib/routineDisplayName';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { RoutineActionIcon } from '@shared/ui/routine-action-icon';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const PILL_SHADOW = 1;

type Props = {
  dataConfig: unknown;
  ink: string;
  line: string;
  muted?: string;
  /** 전달 시 칩을 눌러 템플릿 변경 가능 */
  onChangeDataConfig?: (next: unknown) => void;
  disabled?: boolean;
};

function rebuildConfigForTemplate(
  prev: unknown,
  nextTemplateKey: CustomFlowTemplateKey,
) {
  const prevO = prev && typeof prev === 'object' ? (prev as Record<string, unknown>) : {};
  const displayName = readRoutineDisplayNameFromConfig(prev);
  return buildInitialCustomFlowDetailConfig(nextTemplateKey, {
    ...(displayName ? { displayName } : {}),
    ...(typeof prevO.summary === 'string' ? { summary: prevO.summary } : {}),
    ...(typeof prevO.icon === 'string' ? { icon: prevO.icon } : {}),
    ...(typeof prevO.accentColor === 'string' ? { accentColor: prevO.accentColor } : {}),
  });
}

export function CustomFlowTemplateMetaPill({
  dataConfig,
  ink,
  line,
  muted,
  onChangeDataConfig,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const templateKey = resolveCustomFlowTemplateKey(dataConfig);
  const label = resolveAppliedCustomFlowTemplateLabel(templateKey);
  const mutedColor = muted ?? ink;
  const canChange = Boolean(onChangeDataConfig) && !disabled;
  const isDark = useColorScheme() === 'dark';
  const pencil = isDark ? '#ADB5A9' : '#737B70';
  const controlInk = isDark ? '#E6E9E0' : '#4B554C';
  const faceBg = isDark ? '#30342E' : '#FBFAF6';

  const creatableTemplates = listCustomFlowTemplateCatalogEntries();
  const templateOptions = creatableTemplates.some((entry) => entry.key === templateKey)
    ? creatableTemplates
    : [resolveCustomFlowTemplateCatalogEntry(templateKey), ...creatableTemplates];

  const applyTemplate = (nextKey: CustomFlowTemplateKey) => {
    if (!onChangeDataConfig || nextKey === templateKey) {
      setPickerOpen(false);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChangeDataConfig(rebuildConfigForTemplate(dataConfig, nextKey));
    setPickerOpen(false);
  };

  const handleSelectTemplate = (nextKey: CustomFlowTemplateKey) => {
    if (nextKey === templateKey) {
      setPickerOpen(false);
      return;
    }
    void Haptics.selectionAsync();
    Alert.alert(
      t('goalDetail.changeRoutineModeTitle'),
      t('goalDetail.changeRoutineModeConfirm', {
        label: resolveAppliedCustomFlowTemplateLabel(nextKey),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.change'),
          style: 'destructive',
          onPress: () => applyTemplate(nextKey),
        },
      ],
    );
  };

  const pill = (
    <View
      style={[
        styles.pillShell,
        { marginRight: PILL_SHADOW, marginBottom: PILL_SHADOW },
        disabled && onChangeDataConfig ? styles.pillDisabled : null,
      ]}>
      <View
        style={[
          styles.pill,
          { backgroundColor: faceBg },
          canChange && styles.pillInteractive,
        ]}>
        <PaperGrain opacity={0.3} />
        <HanddrawnFrame color={pencil} />
        <ThemedText style={[styles.text, { color: controlInk }]}>
          {t('goalDetail.routineMode', { label })}
        </ThemedText>
        {canChange ? (
          <RoutineActionIcon name="expand" size={14} color={controlInk} />
        ) : null}
      </View>
    </View>
  );

  return (
    <>
      {canChange ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.changeRoutineModeA11y', { label })}
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPickerOpen(true);
          }}
          style={({ pressed }) => [pressed && { opacity: 0.72 }]}>
          {pill}
        </Pressable>
      ) : (
        pill
      )}

      {onChangeDataConfig ? (
        <Modal
          visible={pickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPickerOpen(false)}>
          <View style={[styles.sheetRoot, { backgroundColor: isDark ? '#252923' : '#F7F4EF' }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: line }]}>
              <ThemedText style={[styles.sheetTitle, { color: controlInk }]}>
                {t('goalDetail.changeRoutineModeTitle')}
              </ThemedText>
              <View
                style={[
                  styles.closeShell,
                  { marginRight: PILL_SHADOW, marginBottom: PILL_SHADOW },
                ]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                  hitSlop={10}
                  onPress={() => { tapHaptic(); setPickerOpen(false); }}
                  style={({ pressed }) => [
                    styles.sheetCloseBtn,
                    { backgroundColor: faceBg },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <PaperGrain opacity={0.3} />
                  <HanddrawnFrame color={pencil} />
                  <IconSymbol name="xmark" size={14} color={controlInk} />
                </Pressable>
              </View>
            </View>
            <ThemedText style={[styles.sheetHint, { color: mutedColor }]}>
              {t('goalDetail.changeRoutineModeHint')}
            </ThemedText>
            <ScrollView
              contentContainerStyle={[
                styles.sheetList,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
              showsVerticalScrollIndicator={false}>
              {templateOptions.map((opt) => {
                const selected = opt.key === templateKey;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectTemplate(opt.key)}
                    style={({ pressed }) => [
                      styles.templateRow,
                      { borderBottomColor: line },
                      pressed && { opacity: 0.55 },
                    ]}>
                    <IconSymbol name={opt.icon as any} size={17} color={ink} />
                    <View style={styles.templateText}>
                      <ThemedText
                        style={[
                          styles.templateTitle,
                          { color: ink },
                          selected && styles.templateTitleSelected,
                        ]}>
                        {opt.label}
                      </ThemedText>
                      <ThemedText style={[styles.templateDesc, { color: mutedColor }]}>
                        {opt.summary}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[
                        styles.templateMark,
                        { color: selected ? ink : mutedColor },
                      ]}>
                      {selected ? '✓' : ''}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pillShell: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  pill: {
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  pillInteractive: {
    paddingRight: 8,
  },
  pillDisabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  sheetRoot: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeShell: {
    position: 'relative',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sheetHint: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sheetList: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  templateText: {
    flex: 1,
    gap: 3,
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  templateTitleSelected: {
    textDecorationLine: 'underline',
  },
  templateDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  templateMark: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 14,
  },
});
