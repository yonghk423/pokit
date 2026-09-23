import { useCallback, useEffect, useRef, useState } from 'react';

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
  /**
   * persist 폴백은 카탈로그 기본명만 쓴다.
   * previewLabel(현재 표시명)을 넣으면 `persistRoutineDisplayName`이
   * 「이름 === 폴백」으로 보고 displayName을 지워 버린다.
   */
  const catalogNameFallback = resolveRoutineTitleFallback(
    categoryKey as GoalDetailCategoryKey,
    '',
  );

  const [selectedIcon, setSelectedIcon] = useState<CustomFlowIconOption>(initialAppearance.icon);
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(initialAppearance.accentColor);
  const [previewName, setPreviewName] = useState(
    () => readRoutineDisplayNameFromConfig(dataConfig) || previewLabel,
  );
  const lastPersistedRef = useRef<string | null>(null);
  const nameFocusedRef = useRef(false);
  const dataConfigRef = useRef(dataConfig);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  const catalogNameFallbackRef = useRef(catalogNameFallback);
  const selectedIconRef = useRef(selectedIcon);
  const selectedAccentColorRef = useRef(selectedAccentColor);
  const previewNameRef = useRef(previewName);
  dataConfigRef.current = dataConfig;
  onChangeDataConfigRef.current = onChangeDataConfig;
  catalogNameFallbackRef.current = catalogNameFallback;
  selectedIconRef.current = selectedIcon;
  selectedAccentColorRef.current = selectedAccentColor;
  previewNameRef.current = previewName;

  const persistAppearance = useCallback(
    (next: {
      icon: CustomFlowIconOption;
      accentColor: string;
      /** true일 때만 displayName을 갱신 — 아이콘·색만 바꿀 때 이름을 덮지 않는다 */
      updateDisplayName: boolean;
      previewName: string;
    }) => {
      const merged = mergeCategoryAppearanceIntoConfig(categoryKey, dataConfigRef.current, {
        icon: next.icon,
        accentColor: next.accentColor,
      });
      const payload = next.updateDisplayName
        ? withDisplayName(merged, next.previewName, catalogNameFallbackRef.current)
        : merged;
      const serialized = JSON.stringify(payload);
      if (lastPersistedRef.current === serialized) return;
      lastPersistedRef.current = serialized;
      onChangeDataConfigRef.current(payload);
    },
    [categoryKey],
  );

  // 외부 저장값 → UI만 동기화. 저장 effect와 분리해 무한 루프를 막는다.
  useEffect(() => {
    const appearance = readEditableCategoryAppearance(categoryKey, dataConfig);
    const nextName = readRoutineDisplayNameFromConfig(dataConfig) || previewLabel;
    setSelectedIcon((prev) => (prev === appearance.icon ? prev : appearance.icon));
    setSelectedAccentColor((prev) =>
      prev === appearance.accentColor ? prev : appearance.accentColor,
    );
    if (!nameFocusedRef.current) {
      setPreviewName((prev) => (prev === nextName ? prev : nextName));
    }
    lastPersistedRef.current = JSON.stringify(
      mergeCategoryAppearanceIntoConfig(categoryKey, dataConfig, appearance),
    );
  }, [categoryKey, dataConfig, previewLabel]);

  return (
    <CustomFlowAppearancePicker
      icon={selectedIcon}
      accentColor={selectedAccentColor}
      onChangeIcon={(icon) => {
        setSelectedIcon(icon);
        persistAppearance({
          icon,
          accentColor: selectedAccentColorRef.current,
          previewName: previewNameRef.current,
          updateDisplayName: false,
        });
      }}
      onChangeAccentColor={(accentColor) => {
        setSelectedAccentColor(accentColor);
        persistAppearance({
          icon: selectedIconRef.current,
          accentColor,
          previewName: previewNameRef.current,
          updateDisplayName: false,
        });
      }}
      onAccentColorPreview={setSelectedAccentColor}
      previewLabel={previewName}
      onChangePreviewLabel={(nextName) => {
        setPreviewName(nextName);
        persistAppearance({
          icon: selectedIconRef.current,
          accentColor: selectedAccentColorRef.current,
          previewName: nextName,
          updateDisplayName: true,
        });
      }}
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
