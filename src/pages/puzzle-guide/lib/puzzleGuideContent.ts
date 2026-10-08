/**
 * 퍼즐 설명서 — 노트 펼친 에디토리얼 슬라이드 + 짧은 한 줄 설명.
 */

import type { AppLocale } from '@shared/lib/i18n/model/locale';
import { t, type I18nKey } from '@shared/lib/i18n';
import type { PuzzleGuideImageId } from '@shared/lib/puzzle-guide-assets';

export type PuzzleGuideSlide = {
  id: PuzzleGuideImageId;
  title: string;
  body: string;
  accent: string;
  accentDark: string;
};

const SLIDE_SPECS: readonly {
  id: PuzzleGuideImageId;
  accent: string;
  accentDark: string;
}[] = [
  { id: 'wall', accent: '#FFE08A', accentDark: '#5C4E10' },
  { id: 'target', accent: '#B8E0D2', accentDark: '#1A4E50' },
  { id: 'photo', accent: '#F5C6AA', accentDark: '#5A3D36' },
  { id: 'tip', accent: '#C9B1FF', accentDark: '#3A2A55' },
];

function titleKey(id: PuzzleGuideImageId): I18nKey {
  return `puzzleGuide.slide.${id}` as I18nKey;
}

function bodyKey(id: PuzzleGuideImageId): I18nKey {
  return `puzzleGuide.slide.${id}.body` as I18nKey;
}

export function getPuzzleGuideSlides(locale: AppLocale): readonly PuzzleGuideSlide[] {
  return SLIDE_SPECS.map((spec) => ({
    id: spec.id,
    title: t(titleKey(spec.id), locale),
    body: t(bodyKey(spec.id), locale),
    accent: spec.accent,
    accentDark: spec.accentDark,
  }));
}
