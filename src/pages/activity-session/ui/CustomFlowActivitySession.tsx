import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CUSTOM_FLOW_TEMPLATE_LABELS,
  normalizeCustomFlowDetailConfig,
  resolveCustomFlowTemplateKey,
  type CustomFlowCategoryKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import { CategoryImmersionTheme } from '@shared/config/categoryImmersionTheme';
import { RetroFlatColors } from '@shared/config/retroFlat';
import {
  DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  DEFAULT_CUSTOM_FLOW_ICON,
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import { ImmersionBottomControls, SessionImmersionLayout } from './SessionImmersionLayout';

const PRIMARY = 'rgb(0, 0, 0)';

function readSessionAppearance(raw: unknown) {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    icon: normalizeCustomFlowIcon(o.icon) ?? DEFAULT_CUSTOM_FLOW_ICON,
    accentColor: normalizeCustomFlowAccentColor(o.accentColor) ?? DEFAULT_CUSTOM_FLOW_ACCENT_COLOR,
  };
}

function formatClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Props = {
  block: DayPlanBlock;
  categoryKey: CustomFlowCategoryKey;
  activityTitle: string;
  timeRange: string;
  isWaitingToStart: boolean;
  isPaused: boolean;
  timerSec: number;
  progress: number;
  rawConfig: unknown;
  onBack: () => void;
  onEndSession: () => void;
  onPersist: () => void;
};

export function CustomFlowActivitySession({
  block,
  categoryKey,
  activityTitle,
  timeRange,
  isWaitingToStart,
  isPaused,
  timerSec,
  progress,
  rawConfig,
  onBack,
  onEndSession,
  onPersist,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const templateKey = useMemo(() => resolveCustomFlowTemplateKey(rawConfig), [rawConfig]);
  const appearance = useMemo(() => readSessionAppearance(rawConfig), [rawConfig]);
  const [config, setConfig] = useState(() => normalizeCustomFlowDetailConfig(templateKey, rawConfig));

  useEffect(() => {
    setConfig(normalizeCustomFlowDetailConfig(templateKey, rawConfig));
  }, [rawConfig, templateKey]);

  const persist = useCallback(
    (next: unknown) => {
      const withTemplate =
        (templateKey === 'checklist' || templateKey === 'abstain') && next && typeof next === 'object'
          ? { ...(next as Record<string, unknown>), templateKey }
          : next;
      const normalized = normalizeCustomFlowDetailConfig(templateKey, withTemplate);
      setConfig(normalized);
      saveGoalDetailCategoryConfig(categoryKey, withTemplate);
      saveGoalDetailBlockConfig(block.id, withTemplate);
      onPersist();
    },
    [block.id, categoryKey, onPersist, templateKey],
  );

  const O = CategoryImmersionTheme.other;
  const accent = appearance.accentColor ?? PRIMARY;
  const sessionLabel = CUSTOM_FLOW_TEMPLATE_LABELS[templateKey];
  const headerTitle = isPaused
    ? t('session.paused')
    : isWaitingToStart
      ? t('session.waitingToStart')
      : activityTitle.trim() || sessionLabel;
  const iconName = (appearance.icon ?? 'star.fill') as 'star.fill';

  const timerNode = (
    <ThemedText
      style={styles.timerHms}
      lightColor={O.onSurface}
      darkColor={O.onSurface}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.35}>
      {templateKey === 'focus' || (!isPaused && !isWaitingToStart)
        ? formatClock(timerSec)
        : isPaused
          ? t('session.pausedBrief')
          : t('session.beforeStart')}
    </ThemedText>
  );

  return (
    <SessionImmersionLayout
      backgroundColor={O.screenBg}
      accentColor={accent}
      accentGlow="rgba(0, 0, 0, 0.14)"
      onSurface={O.onSurface}
      muted={O.muted}
      brand={O.brand}
      aboutKicker={O.aboutKicker}
      headerTitle={headerTitle}
      iconName={iconName}
      iconSize={28}
      sessionKicker={sessionLabel}
      timerDisplay={timerNode}
      flowCaption={activityTitle || timeRange}
      onBack={onBack}
      scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
      bottomBar={
        <ImmersionBottomControls
          accentColor={accent}
          borderColor={O.border}
          paddingBottom={Math.max(insets.bottom, 14)}
          onEndSession={onEndSession}
          completeLabel={t('session.routineComplete')}
        />
      }>
      <CustomFlowTemplateSessionBody
        templateKey={templateKey}
        config={config}
        onChange={persist}
        theme={{
          ink: O.onSurface,
          muted: O.muted,
          line: O.border,
          /** 루틴 템플릿 미리보기와 동일한 카드 면 색 */
          surface: isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF',
          accent,
        }}
        block={block}
        sessionProgress={progress}
      />
    </SessionImmersionLayout>
  );
}

const styles = StyleSheet.create({
  timerHms: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
    textAlign: 'center',
  },
});
