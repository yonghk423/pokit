import { useEffect, useRef, useState } from 'react';

import {
  mergeCategoryAppearanceIntoConfig,
  readEditableCategoryAppearance,
} from '@entities/day-plan';
import type { CustomFlowIconOption } from '@shared/lib/customFlowAppearanceCatalog';
import { CustomFlowAppearancePicker } from '@shared/ui/custom-flow-appearance-picker';

type Props = {
  categoryKey: string;
  previewLabel: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  isDark?: boolean;
  ink: string;
  muted: string;
};

/** 목표 상세 설정 — 루틴 아이콘·색상 편집 */
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

  const [selectedIcon, setSelectedIcon] = useState<CustomFlowIconOption>(initialAppearance.icon);
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(initialAppearance.accentColor);
  const lastPersistedRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);
  const dataConfigRef = useRef(dataConfig);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  dataConfigRef.current = dataConfig;
  onChangeDataConfigRef.current = onChangeDataConfig;

  useEffect(() => {
    const appearance = readEditableCategoryAppearance(categoryKey, dataConfig);
    isSyncingFromPropsRef.current = true;
    setSelectedIcon(appearance.icon);
    setSelectedAccentColor(appearance.accentColor);
    lastPersistedRef.current = JSON.stringify(
      mergeCategoryAppearanceIntoConfig(categoryKey, dataConfig, appearance),
    );
  }, [categoryKey, dataConfig]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload = mergeCategoryAppearanceIntoConfig(categoryKey, dataConfigRef.current, {
      icon: selectedIcon,
      accentColor: selectedAccentColor,
    });
    const serialized = JSON.stringify(payload);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    onChangeDataConfigRef.current(payload);
  }, [categoryKey, selectedAccentColor, selectedIcon]);

  return (
    <CustomFlowAppearancePicker
      icon={selectedIcon}
      accentColor={selectedAccentColor}
      onChangeIcon={setSelectedIcon}
      onChangeAccentColor={setSelectedAccentColor}
      previewLabel={previewLabel}
      isDark={isDark}
      ink={ink}
      muted={muted}
      hint=""
      compact
      defaultExpanded
    />
  );
}
