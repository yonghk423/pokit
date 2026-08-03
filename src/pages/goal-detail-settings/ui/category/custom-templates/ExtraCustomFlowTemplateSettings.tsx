import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialMemoDataConfig,
  getInitialReminderDataConfig,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
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
  const isDark = useColorScheme() === 'dark';
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
          /** 루틴 템플릿 미리보기와 동일한 카드 면 색 */
          surface: isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF',
          accent: PrimaryColor.rgb,
        }}
        previewMode={false}
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
    />
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16 },
});
