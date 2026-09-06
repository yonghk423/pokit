import { useMemo } from 'react';

import { RetroFlatColors } from '@shared/config/retroFlat';
import {
  useNoteSurfaceColors,
  useUiSurfacePresentation,
} from '@shared/ui/presentation';

export type GoalDetailSettingsPalette = {
  surfaceLow: string;
  surfaceLowest: string;
  onSurface: string;
  onVariant: string;
  outline: string;
  outlineVariant: string;
  usesLightInk: boolean;
};

/** 목표 상세 설정 폼 공통 (라이트/다크) */
export function goalDetailSettingsPalette(isDark: boolean): GoalDetailSettingsPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    surfaceLow: c.surfaceAlt,
    surfaceLowest: c.surface,
    onSurface: c.text,
    onVariant: c.textMuted,
    outline: c.borderMuted,
    outlineVariant: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
    usesLightInk: false,
  };
}

/**
 * 노트/포스트잇 면 위에 임베드될 때 noteColors로 잉크·라인을 덮어쓴다.
 * (어두운 면 + 다크 텍스트 대비 붕괴 방지)
 */
export function useGoalDetailSettingsPalette(isDark: boolean): GoalDetailSettingsPalette {
  const presentation = useUiSurfacePresentation();
  const noteColors = useNoteSurfaceColors();

  return useMemo(() => {
    const base = goalDetailSettingsPalette(isDark);
    if (presentation !== 'note' || !noteColors) return base;
    const usesLightInk = noteColors.usesLightInk === true;
    return {
      ...base,
      onSurface: noteColors.onSurface,
      onVariant: noteColors.onVariant,
      outline:
        noteColors.outline ?? (usesLightInk ? 'rgba(255,255,255,0.22)' : base.outline),
      outlineVariant:
        noteColors.outlineVariant ??
        (usesLightInk ? 'rgba(255,255,255,0.14)' : base.outlineVariant),
      usesLightInk,
    };
  }, [isDark, noteColors, presentation]);
}
