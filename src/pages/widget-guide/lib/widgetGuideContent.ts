/**
 * 홈 위젯 설명서 — 노트북 에디토리얼 슬라이드 + 짧은 한 줄 설명.
 */

import type { AppLocale } from '@shared/lib/i18n/model/locale';
import { t, type I18nKey } from '@shared/lib/i18n';

import type { WidgetGuideImageId } from '@shared/lib/widget-guide-assets';

export type WidgetGuideSlide = {
  id: WidgetGuideImageId;
  title: string;
  body: string;
  accent: string;
  accentDark: string;
};

const SLIDE_SPECS: readonly {
  id: WidgetGuideImageId;
  accent: string;
  accentDark: string;
}[] = [
  { id: 'intro', accent: '#FFE566', accentDark: '#5C4E10' },
  { id: 'edit', accent: '#B8D4E8', accentDark: '#2A4050' },
  { id: 'bookstore', accent: '#E8C4B8', accentDark: '#5A3D36' },
  { id: 'note', accent: '#F0E0A8', accentDark: '#4A4020' },
  { id: 'tip', accent: '#A8DADC', accentDark: '#1A4E50' },
];

function titleKey(id: WidgetGuideImageId): I18nKey {
  return `widgetGuide.slide.${id}` as I18nKey;
}

function bodyKey(id: WidgetGuideImageId): I18nKey {
  return `widgetGuide.slide.${id}.body` as I18nKey;
}

export function getWidgetGuideSlides(locale: AppLocale): readonly WidgetGuideSlide[] {
  return SLIDE_SPECS.map((spec) => ({
    id: spec.id,
    title: t(titleKey(spec.id), locale),
    body: t(bodyKey(spec.id), locale),
    accent: spec.accent,
    accentDark: spec.accentDark,
  }));
}
