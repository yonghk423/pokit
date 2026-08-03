import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildTemplateSetupConfig,
  isSpineBlockScheduleWithinPriorityWindow,
  listCustomFlowTemplateCatalogEntries,
  normalizeCustomFlowDetailConfig,
  resolveSpinePriorityWindow,
  ROUTINE_SUMMARY_MAX,
  SYSTEM_CATALOG_GROUP_KEYS,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { PrimaryColor } from '@shared/config/theme';
import {
  createCustomCatalogGroup,
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  listCustomCatalogGroups,
  resolveSystemCatalogGroupLabel,
  type CustomCatalogGroup,
  type CustomFlowIconOption,
  type DayMealSlot,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CustomFlowAppearancePicker } from '@shared/ui/custom-flow-appearance-picker';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import { CatalogRowSpineTimePanel } from './CatalogRowSpineTimePanel';
import { DayMealSlotTargetChips } from './DayMealSlotTargetChips';

const NAME_MAX = 24;
const GROUP_NAME_MAX = 24;

type GroupOption = {
  key: string;
  label: string;
  isSystem: boolean;
};

export type CreateCustomFlowSpineSchedule = {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
};

/** 루틴 추가 흐름에서 현재 레이아웃에 바로 담기 위한 배치 설정 */
export type CreateCustomFlowPlacement =
  | {
      mode: 'sections';
      initialMealSlot: DayMealSlot;
      mealSlotSchedule: DayMealSlotSchedule;
    }
  | {
      mode: 'spine';
      priorityStart: string;
      priorityEnd: string;
      initialStartMinutes: number;
      initialEndMinutes: number;
      initialEndsNextCalendarDay?: boolean;
    };

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    groupKey: string;
    icon: CustomFlowIconOption;
    accentColor: string;
    templateKey: CustomFlowTemplateKey;
    summary?: string;
    templateDataConfig?: unknown;
    /** 시간대 모드 — 담을 구간 */
    mealSlot?: DayMealSlot;
    /** 타임라인 모드 — 시작·종료 */
    schedule?: CreateCustomFlowSpineSchedule;
  }) => void;
  initialGroupKey?: string;
  initialTemplateKey?: CustomFlowTemplateKey;
  /** 루틴 추가(시간대·타임라인)에서 열릴 때만 전달 */
  placement?: CreateCustomFlowPlacement | null;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  surface: string;
};

type SheetStep = 'basics' | 'template';

const TEMPLATE_OPTIONS = listCustomFlowTemplateCatalogEntries().map((entry) => ({
  key: entry.key,
  title: entry.label,
  summary: entry.summary,
  icon: entry.icon,
}));

export function CreateCustomFlowSheet({
  visible,
  onClose,
  onCreate,
  initialGroupKey,
  initialTemplateKey,
  placement = null,
  isDark,
  ink,
  muted,
  line,
  surface,
}: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<CustomFlowIconOption>(DEFAULT_CUSTOM_FLOW_ICON);
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(DEFAULT_CUSTOM_FLOW_ACCENT_COLOR);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('productivity');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [step, setStep] = useState<SheetStep>('basics');
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<CustomFlowTemplateKey>('checklist');
  const [templateSetupConfig, setTemplateSetupConfig] = useState(() =>
    buildTemplateSetupConfig('checklist'),
  );
  const [summary, setSummary] = useState('');
  const [appearancePickerEpoch, setAppearancePickerEpoch] = useState(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [selectedMealSlot, setSelectedMealSlot] = useState<DayMealSlot>('morning');
  const [spineSchedule, setSpineSchedule] = useState<CreateCustomFlowSpineSchedule>({
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
    endsNextCalendarDay: false,
  });
  const sheetWasVisibleRef = useRef(false);
  const placementRef = useRef(placement);
  placementRef.current = placement;

  useEffect(() => {
    if (!visible) {
      setKeyboardInset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      sheetWasVisibleRef.current = false;
      return;
    }
    const groups = listCustomCatalogGroups();
    setCustomGroups(groups);
    const justOpened = !sheetWasVisibleRef.current;
    sheetWasVisibleRef.current = true;
    if (!justOpened) return;

    setName('');
    setSelectedIcon(DEFAULT_CUSTOM_FLOW_ICON);
    setSelectedAccentColor(DEFAULT_CUSTOM_FLOW_ACCENT_COLOR);
    setIsAddingGroup(false);
    setNewGroupLabel('');
    setStep('basics');
    setSelectedTemplateKey(initialTemplateKey ?? 'checklist');
    setTemplateSetupConfig(buildTemplateSetupConfig(initialTemplateKey ?? 'checklist'));
    setSummary('');
    setAppearancePickerEpoch((n) => n + 1);
    const currentPlacement = placementRef.current;
    if (currentPlacement?.mode === 'sections') {
      setSelectedMealSlot(currentPlacement.initialMealSlot);
    } else if (currentPlacement?.mode === 'spine') {
      setSpineSchedule({
        startMinutes: currentPlacement.initialStartMinutes,
        endMinutes: currentPlacement.initialEndMinutes,
        endsNextCalendarDay: Boolean(currentPlacement.initialEndsNextCalendarDay),
      });
    }
    const fallback =
      initialGroupKey && initialGroupKey.length > 0 ? initialGroupKey : 'productivity';
    const exists =
      (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).includes(fallback) ||
      groups.some((g) => g.key === fallback);
    setSelectedGroupKey(exists ? fallback : 'productivity');
  }, [visible, initialGroupKey, initialTemplateKey]);

  const groupOptions: GroupOption[] = useMemo(() => {
    const sys: GroupOption[] = (SYSTEM_CATALOG_GROUP_KEYS as readonly string[]).map((k) => ({
      key: k,
      label: resolveSystemCatalogGroupLabel(k),
      isSystem: true,
    }));
    const custom: GroupOption[] = customGroups.map((g) => ({
      key: g.key,
      label: g.label,
      isSystem: false,
    }));
    return [...sys, ...custom];
  }, [customGroups]);

  const spineScheduleValid = useMemo(() => {
    if (placement?.mode !== 'spine') return true;
    const window = resolveSpinePriorityWindow(placement.priorityStart, placement.priorityEnd);
    if (!window) return false;
    return isSpineBlockScheduleWithinPriorityWindow(
      {
        startMinutes: spineSchedule.startMinutes,
        endMinutes: spineSchedule.endMinutes,
        endsNextCalendarDay: Boolean(spineSchedule.endsNextCalendarDay),
      },
      window,
    );
  }, [placement, spineSchedule]);

  const trimmedName = name.trim();
  const placementReady =
    placement == null ||
    placement.mode === 'sections' ||
    (placement.mode === 'spine' && spineScheduleValid);
  const canProceedBasics =
    trimmedName.length > 0 && selectedGroupKey.length > 0 && placementReady;
  const canCreate = canProceedBasics && selectedTemplateKey.length > 0;

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';
  const chipIdleBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';

  const handleSubmitNewGroup = () => {
    const label = newGroupLabel.trim().slice(0, GROUP_NAME_MAX);
    if (label.length === 0) return;
    const created = createCustomCatalogGroup(label);
    if (!created) return;
    void Haptics.selectionAsync();
    setCustomGroups(listCustomCatalogGroups());
    setSelectedGroupKey(created.key);
    setIsAddingGroup(false);
    setNewGroupLabel('');
  };

  const selectedGroupKeyRef = useRef(selectedGroupKey);
  selectedGroupKeyRef.current = selectedGroupKey;

  const handleCreate = () => {
    if (!canCreate) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreate({
      name: trimmedName.trim(),
      groupKey: selectedGroupKeyRef.current,
      icon: selectedIcon,
      accentColor: selectedAccentColor,
      templateKey: selectedTemplateKey,
      summary: summary.trim(),
      templateDataConfig: templateSetupConfig,
      ...(placement?.mode === 'sections' ? { mealSlot: selectedMealSlot } : {}),
      ...(placement?.mode === 'spine'
        ? {
            schedule: {
              startMinutes: spineSchedule.startMinutes,
              endMinutes: spineSchedule.endMinutes,
              ...(spineSchedule.endsNextCalendarDay ? { endsNextCalendarDay: true as const } : {}),
            },
          }
        : {}),
    });
  };

  const handleNextStep = () => {
    if (!canProceedBasics) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('template');
  };

  const handleBackStep = () => {
    void Haptics.selectionAsync();
    setStep('basics');
  };

  const headerTitle = step === 'basics' ? '새 루틴 만들기' : '루틴 방식·상세 설정';
  const headerSubtitle =
    step === 'basics'
      ? placement?.mode === 'sections'
        ? '이름·아이콘을 정한 뒤, 담을 시간대(새벽~밤)를 골라 주세요.'
        : placement?.mode === 'spine'
          ? '이름·아이콘을 정한 뒤, 타임라인에 넣을 시작·종료 시각을 맞춰 주세요.'
          : '이름과 아이콘·색상을 정한 뒤 담을 묶음을 골라 주세요.'
      : '방식을 고른 뒤 아래에서 할 일·목표를 맞춰 주세요. 만들기를 누르면 바로 추가돼요.';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface }]}>
        <View style={[styles.header, { borderBottomColor: line, paddingTop: 14 }]}>
          <View style={styles.headerLeading}>
            {step === 'template' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전"
                onPress={handleBackStep}
                hitSlop={10}
                style={styles.headerBackBtn}>
                <IconSymbol name="chevron.left" size={18} color={ink} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: ink }]}>{headerTitle}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>{headerSubtitle}</ThemedText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardInset > 0 && { paddingBottom: keyboardInset + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          {step === 'basics' ? (
            <>
              <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
                <ThemedText style={[styles.fieldLabel, { color: ink }]}>루틴 이름</ThemedText>
                <TextInput
                  value={name}
                  onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                  maxLength={NAME_MAX}
                  returnKeyType="done"
                  multiline={false}
                  style={[
                    styles.input,
                    { color: ink, backgroundColor: inputBg, borderColor: line },
                  ]}
                />
              </View>

              <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
                <CustomFlowAppearancePicker
                  key={`create-appearance-${appearancePickerEpoch}`}
                  defaultExpanded
                  icon={selectedIcon}
                  accentColor={selectedAccentColor}
                  onChangeIcon={setSelectedIcon}
                  onChangeAccentColor={setSelectedAccentColor}
                  previewLabel={trimmedName.length > 0 ? trimmedName : '미리보기'}
                  isDark={isDark}
                  ink={ink}
                  muted={muted}
                  line={line}
                />
              </View>

              <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
                <ThemedText style={[styles.fieldLabel, { color: ink }]}>상위 카테고리</ThemedText>
                <ThemedText style={[styles.fieldHint, { color: muted }]}>
                  어디에 둘지 골라 주세요
                </ThemedText>

                <View style={styles.chipsWrap}>
                  {groupOptions.map((g) => {
                    const selected = selectedGroupKey === g.key;
                    return (
                      <Pressable
                        key={g.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setSelectedGroupKey(g.key);
                        }}
                        style={[
                          styles.chip,
                          {
                            borderColor: selected ? PrimaryColor.rgb : line,
                            backgroundColor: selected
                              ? isDark
                                ? 'rgba(255,255,255,0.16)'
                                : 'rgba(0,0,0,0.06)'
                              : chipIdleBg,
                          },
                        ]}>
                        {selected ? (
                          <IconSymbol name="checkmark" size={11} color={ink} />
                        ) : null}
                        <ThemedText
                          style={[
                            styles.chipText,
                            { color: selected ? ink : muted, fontWeight: selected ? '700' : '500' },
                          ]}
                          numberOfLines={1}>
                          {g.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}

                  {!isAddingGroup ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="새 그룹 만들기"
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAddingGroup(true);
                      }}
                      style={[
                        styles.chip,
                        styles.chipDashed,
                        { borderColor: line, backgroundColor: 'transparent' },
                      ]}>
                      <IconSymbol name="plus" size={11} color={muted} />
                      <ThemedText style={[styles.chipText, { color: muted }]}>
                        새 그룹 만들기
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>

                {isAddingGroup ? (
                  <View style={styles.newGroupRow}>
                    <TextInput
                      autoFocus
                      value={newGroupLabel}
                      onChangeText={(v) => setNewGroupLabel(v.slice(0, GROUP_NAME_MAX))}
                      placeholder="새 그룹 이름 (예: 운동·체력)"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}
                      maxLength={GROUP_NAME_MAX}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmitNewGroup}
                      style={[
                        styles.input,
                        styles.newGroupInput,
                        { color: ink, backgroundColor: inputBg, borderColor: line },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="추가"
                      onPress={handleSubmitNewGroup}
                      disabled={newGroupLabel.trim().length === 0}
                      style={({ pressed }) => [
                        styles.newGroupBtn,
                        {
                          backgroundColor: ink,
                          opacity: newGroupLabel.trim().length === 0 ? 0.45 : pressed ? 0.88 : 1,
                        },
                      ]}>
                      <ThemedText style={styles.newGroupBtnText}>추가</ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="취소"
                      onPress={() => {
                        setIsAddingGroup(false);
                        setNewGroupLabel('');
                      }}
                      hitSlop={8}
                      style={[styles.cancelBtn, { borderColor: line }]}>
                      <IconSymbol name="xmark" size={12} color={muted} />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {placement?.mode === 'sections' ? (
                <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
                  <DayMealSlotTargetChips
                    selectedSlot={selectedMealSlot}
                    schedule={placement.mealSlotSchedule}
                    isDark={isDark}
                    ink={ink}
                    muted={muted}
                    line={line}
                    onSelectSlot={setSelectedMealSlot}
                  />
                </View>
              ) : null}

              {placement?.mode === 'spine' ? (
                <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
                  <ThemedText style={[styles.fieldLabel, { color: ink }]}>타임라인 시간</ThemedText>
                  <ThemedText style={[styles.fieldHint, { color: muted }]}>
                    하루 시작~마무리 안에서 시작·종료를 맞춰 주세요
                  </ThemedText>
                  <CatalogRowSpineTimePanel
                    startMinutes={spineSchedule.startMinutes}
                    endMinutes={spineSchedule.endMinutes}
                    endsNextCalendarDay={Boolean(spineSchedule.endsNextCalendarDay)}
                    ink={ink}
                    muted={muted}
                    line={line}
                    isDark={isDark}
                    priorityStart={placement.priorityStart}
                    priorityEnd={placement.priorityEnd}
                    onScheduleChange={(startMinutes, endMinutes, endsNextCalendarDay) =>
                      setSpineSchedule({
                        startMinutes,
                        endMinutes,
                        endsNextCalendarDay,
                      })
                    }
                    contentInsetLeft={0}
                  />
                  {!spineScheduleValid ? (
                    <ThemedText style={[styles.fieldHint, { color: muted, marginTop: 8 }]}>
                      선택한 시간이 하루 시작~마무리 밖이에요. 구간 안으로 맞춰 주세요.
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={[styles.sectionCard, { borderColor: line, backgroundColor: cardBg }]}>
                <ThemedText style={[styles.fieldHint, { color: muted }]}>새 루틴</ThemedText>
                <ThemedText style={[styles.routineNamePreview, { color: ink }]}>{trimmedName}</ThemedText>
              </View>

              <View style={styles.summaryField}>
                <ThemedText style={[styles.summaryLabel, { color: muted }]}>요약</ThemedText>
                <TextInput
                  value={summary}
                  onChangeText={setSummary}
                  placeholder="이 항목에 대한 짧은 설명을 적어 주세요"
                  placeholderTextColor={muted}
                  style={[
                    styles.summaryInput,
                    {
                      color: ink,
                      borderColor: line,
                      backgroundColor: inputBg,
                    },
                  ]}
                  maxLength={ROUTINE_SUMMARY_MAX}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.templateList}>
                {TEMPLATE_OPTIONS.map((opt) => {
                  const selected = selectedTemplateKey === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setSelectedTemplateKey(opt.key);
                        setTemplateSetupConfig(buildTemplateSetupConfig(opt.key));
                      }}
                      style={[
                        styles.templateCard,
                        {
                          borderColor: selected ? PrimaryColor.rgb : line,
                          backgroundColor: selected
                            ? isDark
                              ? 'rgba(53,102,104,0.18)'
                              : 'rgba(53,102,104,0.08)'
                            : cardBg,
                        },
                      ]}>
                      <View style={styles.templateCardTop}>
                        <View style={[styles.templateIconBox, { borderColor: line }]}>
                          <IconSymbol name={opt.icon} size={16} color={ink} />
                        </View>
                        <View style={styles.templateCardText}>
                          <ThemedText style={[styles.templateTitle, { color: ink }]}>
                            {opt.title}
                          </ThemedText>
                          <ThemedText style={[styles.templateDesc, { color: muted }]}>
                            {opt.summary}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.radioOuter,
                            { borderColor: selected ? PrimaryColor.rgb : line },
                          ]}>
                          {selected ? (
                            <View
                              style={[styles.radioInner, { backgroundColor: PrimaryColor.rgb }]}
                            />
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.setupSection}>
                <ThemedText style={[styles.setupSectionTitle, { color: ink }]}>상세 설정</ThemedText>
                <ThemedText style={[styles.setupSectionHint, { color: muted }]}>
                  여기서 맞춘 내용이 그대로 새 루틴에 저장돼요.
                </ThemedText>
                <CustomFlowTemplateSessionBody
                  templateKey={selectedTemplateKey}
                  config={templateSetupConfig}
                  onChange={(next) => {
                    setTemplateSetupConfig(
                      normalizeCustomFlowDetailConfig(selectedTemplateKey, next),
                    );
                  }}
                  previewMode={false}
                  theme={{
                    ink,
                    muted,
                    line,
                    /** 루틴 템플릿 미리보기와 동일한 카드 면 색 */
                    surface: isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF',
                    accent: PrimaryColor.rgb,
                  }}
                />
              </View>

              <ThemedText style={[styles.templateNote, { color: muted }]}>
                기록 방식은 만든 뒤 바꾸기 어려워요. 세부 내용은 나중에 항목을 눌러도 수정할 수 있어요.
              </ThemedText>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: line,
              paddingBottom:
                keyboardInset > 0 ? keyboardInset + 12 : Math.max(insets.bottom, 12),
            },
          ]}>
          {step === 'basics' ? (
            <BrutalConfirmButton
              label="다음"
              accessibilityLabel="다음"
              align="stretch"
              fill={ink}
              labelColor={isDark ? '#09090b' : '#FAFAFA'}
              border={line}
              shadowColor={isDark ? RetroFlatColors.dark.solidShadow : '#000000'}
              disabled={!canProceedBasics}
              onPress={handleNextStep}
            />
          ) : (
            <BrutalConfirmButton
              label="만들기"
              accessibilityLabel="만들기"
              align="stretch"
              fill={ink}
              labelColor={isDark ? '#09090b' : '#FAFAFA'}
              border={line}
              shadowColor={isDark ? RetroFlatColors.dark.solidShadow : '#000000'}
              disabled={!canCreate}
              onPress={handleCreate}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeading: {
    width: 28,
    paddingTop: 2,
  },
  headerBackBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  sectionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    padding: 14,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  fieldHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: -4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingVertical: 0,
    ...(Platform.OS === 'android'
      ? { textAlignVertical: 'center' as const, includeFontPadding: false }
      : {}),
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2,
  },
  chipDashed: {
    borderStyle: 'dashed',
  },
  chipText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  newGroupInput: {
    flex: 1,
  },
  newGroupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  cancelBtn: {
    width: 40,
    height: 48,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  routineNamePreview: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryField: {
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  summaryInput: {
    minHeight: 88,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  templateList: {
    gap: 10,
  },
  setupSection: {
    gap: 8,
  },
  setupSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  setupSectionHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 2,
  },
  templateCard: {
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  templateCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  templateIconBox: {
    width: 34,
    height: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateCardText: {
    flex: 1,
    gap: 4,
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  templateDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  templateNote: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
});
