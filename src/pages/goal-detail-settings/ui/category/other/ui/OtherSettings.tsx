import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import {
  isCustomFlowCategoryKey,
  resolveCustomFlowTemplateKey,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
} from './otherConfig';

export function OtherSettings({
  rhythmTitle,
  dataConfig,
  onChangeDataConfig,
  categoryKey,
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
  const seed = () => normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
  const templateKey: CustomFlowTemplateKey = resolveCustomFlowTemplateKey(
    dataConfig ?? getInitialOtherDataConfig(),
  );
  const isAbstain = templateKey === 'abstain';
  const sessionTemplateKey = isAbstain ? 'abstain' : 'checklist';

  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const [summary, setSummary] = useState(() => seed().summary);
  const lastPersistedRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);

  const sessionTheme = useMemo(
    () => ({
      ink: c.onSurface,
      muted: c.onVariant,
      line: c.outline,
      surface: c.surfaceLowest,
      accent: PrimaryColor.rgb,
    }),
    [c],
  );

  const buildPayload = useCallback(
    (nextRaw: unknown) => {
      const appearanceBase = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
      const mergedRaw =
        typeof nextRaw === 'object' && nextRaw ? (nextRaw as Record<string, unknown>) : {};
      return normalizeOtherDetailConfig({
        ...mergedRaw,
        displayName,
        summary,
        ...(isAbstain ? { templateKey: 'abstain' as const } : {}),
        ...(categoryKey && isCustomFlowCategoryKey(categoryKey) && !isAbstain
          ? { templateKey: 'checklist' as const }
          : {}),
        ...(appearanceBase.icon ? { icon: appearanceBase.icon } : {}),
        ...(appearanceBase.accentColor ? { accentColor: appearanceBase.accentColor } : {}),
      });
    },
    [categoryKey, dataConfig, displayName, isAbstain, summary],
  );

  const liveConfig = useMemo(() => buildPayload(dataConfig), [buildPayload, dataConfig]);

  useEffect(() => {
    const next = seed();
    isSyncingFromPropsRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    lastPersistedRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload = buildPayload(dataConfig);
    const serialized = JSON.stringify(payload);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    onChangeDataConfig(payload);
  }, [buildPayload, dataConfig, displayName, onChangeDataConfig, summary]);

  const handleSessionChange = useCallback(
    (next: unknown) => {
      const payload = buildPayload(next);
      lastPersistedRef.current = JSON.stringify(payload);
      onChangeDataConfig(payload);
    },
    [buildPayload, onChangeDataConfig],
  );

  const buildShareText = () => {
    const checklist = liveConfig.checklist;
    const doneTag = isAbstain ? t('goalDetail.shareAbstainTag') : t('goalDetail.shareDoneTag');
    return checklist
      .filter((x) => x.text.trim().length > 0)
      .map((x, i) => `${i + 1}. ${x.done ? doneTag : ''}${x.text.trim()}`)
      .join('\n');
  };

  const onShare = async () => {
    const content = buildShareText();
    if (!content) {
      Alert.alert(
        t('goalDetail.shareEmptyTitle'),
        isAbstain ? t('goalDetail.shareEmptyAbstain') : t('goalDetail.shareEmptyChecklist'),
      );
      return;
    }
    await Share.share({
      message: t('goalDetail.shareMessage', { content }),
    });
  };

  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
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

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />

      <View style={[styles.toolbar, { borderTopColor: c.onSurface, borderBottomColor: c.outline }]}>
        <Pressable style={styles.toolbarBtn} onPress={onShare}>
          <IconSymbol name="square.and.arrow.up" size={16} color={c.onSurface} />
          <ThemedText style={[styles.toolbarText, { color: c.onSurface }]}>
            {t('goalDetail.share')}
          </ThemedText>
        </Pressable>
      </View>

      <CustomFlowTemplateSessionBody
        templateKey={sessionTemplateKey}
        config={liveConfig}
        onChange={handleSessionChange}
        theme={sessionTheme}
        previewMode={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 18, paddingVertical: 6 },
  toolbar: {
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolbarText: { fontSize: 13, fontWeight: '700' },
});
