import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialMemoDataConfig,
  getInitialReminderDataConfig,
  isReminderPresetActive,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  REMINDER_SCHEDULE_PRESETS,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import type { GoalDetailCategoryKey } from '../../../model/types';
import { RoutineSummaryField } from '../lib/RoutineSummaryField';
import { RoutineTitleField } from '../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../lib/routineTitleFallback';
import { goalDetailSettingsPalette } from '../lib/settingsPalette';

type SettingsProps = {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  onDeleteCategory?: () => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  hideTitleField?: boolean;
};

type Normalizer<T> = (raw: unknown) => T;
type Seeder<T> = () => T;

function useTemplateSettingsPalette() {
  const scheme = useColorScheme();
  return useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
}

function TemplateSection({
  title,
  children,
  c,
}: {
  title: string;
  children: React.ReactNode;
  c: ReturnType<typeof goalDetailSettingsPalette>;
}) {
  return (
    <View style={[styles.section, { borderColor: c.outline }]}>
      <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>{title}</ThemedText>
      {children}
    </View>
  );
}

function TitleSummaryHeader({
  rhythmTitle,
  categoryKey,
  displayName,
  setDisplayName,
  summary,
  setSummary,
  allowRename,
  renameLockedReason,
  hideTitleField = false,
  c,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  displayName: string;
  setDisplayName: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  allowRename: boolean;
  renameLockedReason: 'running' | 'today' | null;
  hideTitleField?: boolean;
  c: ReturnType<typeof goalDetailSettingsPalette>;
}) {
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  return (
    <>
      {!hideTitleField ? (
        <RoutineTitleField
          value={displayName}
          onChangeValue={setDisplayName}
          fallback={titleFallback}
          allowRename={allowRename}
          renameLockedReason={renameLockedReason}
          palette={c}
        />
      ) : null}
      <RoutineSummaryField
        value={summary}
        onChangeValue={setSummary}
        palette={c}
        placeholder="한 줄 메모 (선택)"
      />
    </>
  );
}

function useTemplateSessionState<T extends { displayName: string; summary: string; icon?: string; accentColor?: string }>(
  templateKey: CustomFlowTemplateKey,
  dataConfig: unknown,
  onChangeDataConfig: (next: unknown) => void,
  normalize: Normalizer<T>,
  getInitial: Seeder<T>,
) {
  const seed = useCallback(() => normalize(dataConfig ?? getInitial()), [dataConfig, getInitial, normalize]);
  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  const buildPayload = useCallback(
    (nextRaw: unknown): T => {
      const base = seed();
      const merged = normalize({
        ...(typeof nextRaw === 'object' && nextRaw ? (nextRaw as Record<string, unknown>) : {}),
        templateKey,
        displayName,
        summary,
        ...(base.icon ? { icon: base.icon } : {}),
        ...(base.accentColor ? { accentColor: base.accentColor } : {}),
      });
      return merged;
    },
    [displayName, seed, summary, templateKey, normalize],
  );

  const liveConfig = useMemo(() => buildPayload(dataConfig), [buildPayload, dataConfig]);

  useEffect(() => {
    const next = seed();
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig, seed]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const payload = buildPayload(dataConfig);
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [buildPayload, dataConfig, displayName, onChangeDataConfig, summary]);

  const handleSessionChange = useCallback(
    (next: unknown) => {
      const payload = buildPayload(next);
      lastRef.current = JSON.stringify(payload);
      onChangeDataConfig(payload);
    },
    [buildPayload, onChangeDataConfig],
  );

  return {
    displayName,
    setDisplayName,
    summary,
    setSummary,
    liveConfig,
    handleSessionChange,
  };
}

function GenericTemplateSettings<T extends { displayName: string; summary: string; icon?: string; accentColor?: string }>({
  props,
  templateKey,
  normalize,
  getInitial,
  topSection,
}: {
  props: SettingsProps;
  templateKey: CustomFlowTemplateKey;
  normalize: Normalizer<T>;
  getInitial: Seeder<T>;
  topSection?: (
    cfg: T,
    applyConfig: (next: unknown) => void,
    c: ReturnType<typeof goalDetailSettingsPalette>,
  ) => React.ReactNode;
}) {
  const c = useTemplateSettingsPalette();
  const {
    rhythmTitle,
    categoryKey,
    dataConfig,
    allowRename = true,
    renameLockedReason = null,
    hideTitleField = false,
  } = props;

  const {
    displayName,
    setDisplayName,
    summary,
    setSummary,
    liveConfig,
    handleSessionChange,
  } = useTemplateSessionState(templateKey, dataConfig, props.onChangeDataConfig, normalize, getInitial);

  const renderTop = topSection ? topSection(liveConfig, handleSessionChange, c) : null;

  return (
    <View style={styles.shell}>
      <TitleSummaryHeader
        {...{
          rhythmTitle,
          categoryKey,
          displayName,
          setDisplayName,
          summary,
          setSummary,
          allowRename,
          renameLockedReason,
          hideTitleField,
          c,
        }}
      />
      {renderTop}
      <CustomFlowTemplateSessionBody
        templateKey={templateKey}
        config={liveConfig}
        onChange={handleSessionChange}
        theme={{
          ink: c.onSurface,
          muted: c.onVariant,
          line: c.outline,
          surface: c.surfaceLowest,
          accent: PrimaryColor.rgb,
        }}
        previewMode={false}
        allowScheduleCompletion={templateKey !== 'reminder'}
      />
    </View>
  );
}

export function HabitSettings(props: SettingsProps) {
  return (
    <GenericTemplateSettings
      props={props}
      templateKey="habit"
      normalize={normalizeHabitDetailConfig}
      getInitial={getInitialHabitDataConfig}
    />
  );
}

export function CounterSettings(props: SettingsProps) {
  return (
    <GenericTemplateSettings
      props={props}
      templateKey="counter"
      normalize={normalizeCounterDetailConfig}
      getInitial={getInitialCounterDataConfig}
    />
  );
}

export function FocusSettings(props: SettingsProps) {
  return (
    <GenericTemplateSettings
      props={props}
      templateKey="focus"
      normalize={normalizeFocusDetailConfig}
      getInitial={getInitialFocusDataConfig}
    />
  );
}

export function JournalSettings(props: SettingsProps) {
  return (
    <GenericTemplateSettings
      props={props}
      templateKey="journal"
      normalize={normalizeJournalDetailConfig}
      getInitial={getInitialJournalDataConfig}
    />
  );
}

export function MemoSettings(props: SettingsProps) {
  return (
    <GenericTemplateSettings
      props={props}
      templateKey="memo"
      normalize={normalizeMemoDetailConfig}
      getInitial={getInitialMemoDataConfig}
    />
  );
}

export function ReminderSettings(props: SettingsProps) {
  return (
    <GenericTemplateSettings
      props={props}
      templateKey="reminder"
      normalize={normalizeReminderDetailConfig}
      getInitial={getInitialReminderDataConfig}
      topSection={(cfg, applyConfig, c) => (
        <TemplateSection title="예시 불러오기" c={c}>
          <View style={styles.chipsRow}>
            {REMINDER_SCHEDULE_PRESETS.map((preset) => {
              const selected = isReminderPresetActive(
                (cfg as { reminderItems?: { time: string; label: string }[] }).reminderItems ?? [],
                preset,
              );
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    const next = normalizeReminderDetailConfig({
                      ...(cfg as Record<string, unknown>),
                      reminderItems: preset.items,
                      completedTimes: [],
                    });
                    applyConfig(next);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? PrimaryColor.rgb : c.outline,
                      backgroundColor: selected ? 'rgba(0, 0, 0, 0.04)' : c.surfaceLowest,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: selected ? c.onSurface : c.onVariant, fontWeight: selected ? '700' : '500' },
                    ]}>
                    {preset.title}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText style={[styles.helper, { color: c.onVariant }]}>
            예시를 누르면 아래 알림 목록이 채워져요. 시간·이름은 목록에서 바로 수정할 수 있어요.
          </ThemedText>
        </TemplateSection>
      )}
    />
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16 },
  section: { borderWidth: 2, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  helper: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 2, paddingHorizontal: 10, paddingVertical: 8 },
  chipText: { fontSize: 13 },
});
