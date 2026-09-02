import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryColor } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import {
  getInitialMeasurementDataConfig,
  normalizeMeasurementDetailConfig,
} from './measurementConfig';

function seedMeasurement(raw: unknown) {
  return normalizeMeasurementDetailConfig(raw ?? getInitialMeasurementDataConfig());
}

export function MeasurementSettings({
  rhythmTitle,
  categoryKey,
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
  hideTitleField = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  hideTitleField?: boolean;
}) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const initial = seedMeasurement(dataConfig);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [summary, setSummary] = useState(initial.summary);
  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const next = seedMeasurement(dataConfig);
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  const buildPayload = useCallback(
    (nextRaw: unknown) => {
      const appearanceBase = seedMeasurement(dataConfig);
      const payload = normalizeMeasurementDetailConfig({
        ...(typeof nextRaw === 'object' && nextRaw ? (nextRaw as Record<string, unknown>) : {}),
        templateKey: 'measurement',
        displayName,
        summary,
        ...(appearanceBase.icon ? { icon: appearanceBase.icon } : {}),
        ...(appearanceBase.accentColor ? { accentColor: appearanceBase.accentColor } : {}),
      });
      return payload;
    },
    [dataConfig, displayName, summary],
  );

  const liveConfig = useMemo(() => buildPayload(dataConfig), [buildPayload, dataConfig]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const payload = buildPayload(dataConfig);
    const serialized = JSON.stringify(payload);
    if (lastRef.current === serialized) return;
    lastRef.current = serialized;
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

  return (
    <View style={styles.shell}>
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
        placeholder={t('goalDetail.memoPlaceholder')}
      />

      <CustomFlowTemplateSessionBody
        templateKey="measurement"
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
      />
    </View>
  );
}

export { getInitialMeasurementDataConfig } from './measurementConfig';

const styles = StyleSheet.create({
  shell: { gap: 16 },
});
