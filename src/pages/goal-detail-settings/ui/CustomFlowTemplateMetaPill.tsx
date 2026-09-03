import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

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

  const templateOptions = useMemo(() => {
    const creatable = listCustomFlowTemplateCatalogEntries();
    if (creatable.some((entry) => entry.key === templateKey)) return creatable;
    return [resolveCustomFlowTemplateCatalogEntry(templateKey), ...creatable];
  }, [templateKey]);

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
        styles.pill,
        { borderColor: line },
        canChange && styles.pillInteractive,
        disabled && onChangeDataConfig ? styles.pillDisabled : null,
      ]}>
      <ThemedText style={[styles.text, { color: ink }]}>
        {t('goalDetail.routineMode', { label })}
      </ThemedText>
      {canChange ? (
        <IconSymbol name="chevron.down" size={11} color={mutedColor} />
      ) : null}
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
          <View style={[styles.sheetRoot, { backgroundColor: '#F7F4EF' }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: line }]}>
              <ThemedText style={[styles.sheetTitle, { color: ink }]}>
                {t('goalDetail.changeRoutineModeTitle')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                hitSlop={10}
                onPress={() => setPickerOpen(false)}
                style={({ pressed }) => [
                  styles.sheetCloseBtn,
                  { borderColor: line },
                  pressed && { opacity: 0.7 },
                ]}>
                <IconSymbol name="xmark" size={14} color={ink} />
              </Pressable>
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
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
