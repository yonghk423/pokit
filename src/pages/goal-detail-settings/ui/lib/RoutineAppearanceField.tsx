import { useEffect, useRef, useState } from 'react';

import {
  mergeCategoryAppearanceIntoConfig,
  persistRoutineDisplayName,
  readEditableCategoryAppearance,
  readRoutineDisplayNameFromConfig,
} from '@entities/day-plan';
import type { CustomFlowIconOption } from '@shared/lib/customFlowAppearanceCatalog';
import { CustomFlowAppearancePicker } from '@shared/ui/custom-flow-appearance-picker';

import type { GoalDetailCategoryKey } from '../../model/types';
import { resolveRoutineTitleFallback } from '../category/lib/routineTitleFallback';

type Props = {
  categoryKey: string;
  previewLabel: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  isDark?: boolean;
  ink: string;
  muted: string;
};

function withDisplayName(payload: unknown, displayName: string, fallback: string): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  return {
    ...(payload as Record<string, unknown>),
    displayName: persistRoutineDisplayName(displayName, fallback),
  };
}

/** 목표 상세 설정 — 루틴 이름·아이콘·색상 편집 */
export function RoutineAppearanceField({
  categoryKey,
  previewLabel,
  dataConfig,
  onChangeDataConfig,
  isDark = false,
  ink,
  muted,
}: Props) {
  const initialAppearance = readEditableCategoryAppearance(categoryKey, dataConfig);
  const nameFallback = resolveRoutineTitleFallback(
    categoryKey as GoalDetailCategoryKey,
    previewLabel,
  );

  const [selectedIcon, setSelectedIcon] = useState<CustomFlowIconOption>(initialAppearance.icon);
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(initialAppearance.accentColor);
  const [previewName, setPreviewName] = useState(
    () => readRoutineDisplayNameFromConfig(dataConfig) || previewLabel,
  );
  const lastPersistedRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);
  const nameFocusedRef = useRef(false);
  const dataConfigRef = useRef(dataConfig);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  const nameFallbackRef = useRef(nameFallback);
  dataConfigRef.current = dataConfig;
  onChangeDataConfigRef.current = onChangeDataConfig;
  nameFallbackRef.current = nameFallback;

  useEffect(() => {
    const appearance = readEditableCategoryAppearance(categoryKey, dataConfig);
    const nextName = readRoutineDisplayNameFromConfig(dataConfig) || previewLabel;
    isSyncingFromPropsRef.current = true;
    setSelectedIcon(appearance.icon);
    setSelectedAccentColor(appearance.accentColor);
    if (!nameFocusedRef.current) {
      setPreviewName(nextName);
    }
    lastPersistedRef.current = JSON.stringify(
      withDisplayName(
        mergeCategoryAppearanceIntoConfig(categoryKey, dataConfig, appearance),
        nextName,
        nameFallbackRef.current,
      ),
    );
  }, [categoryKey, dataConfig, previewLabel]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload = withDisplayName(
      mergeCategoryAppearanceIntoConfig(categoryKey, dataConfigRef.current, {
        icon: selectedIcon,
        accentColor: selectedAccentColor,
      }),
      previewName,
      nameFallbackRef.current,
    );
    const serialized = JSON.stringify(payload);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    onChangeDataConfigRef.current(payload);
  }, [categoryKey, previewName, selectedAccentColor, selectedIcon]);

  return (
    <CustomFlowAppearancePicker
      icon={selectedIcon}
      accentColor={selectedAccentColor}
      onChangeIcon={setSelectedIcon}
      onChangeAccentColor={setSelectedAccentColor}
      previewLabel={previewName}
      onChangePreviewLabel={setPreviewName}
      onPreviewLabelFocus={() => {
        nameFocusedRef.current = true;
      }}
      onPreviewLabelBlur={() => {
        nameFocusedRef.current = false;
      }}
      isDark={isDark}
      ink={ink}
      muted={muted}
      hint=""
      compact
    />
  );
}
