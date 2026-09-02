/**
 * POKIT 사용 설명서 — 실제 구현과 맞춘 탭·버튼 안내 (읽기 전용).
 */

import type { AppLocale } from '@shared/lib/i18n/model/locale';
import { t, type I18nKey } from '@shared/lib/i18n';

export type GuideBookCallout = {
  n: number;
  label: string;
  detail: string;
};

export type GuideBookFigureId =
  | 'tabs-map'
  | 'chrome-modes'
  | 'today-overview'
  | 'today-window'
  | 'today-layouts'
  | 'today-add-row'
  | 'today-autofocus'
  | 'routine-list'
  | 'routine-templates'
  | 'my-routine'
  | 'my-routine-apply'
  | 'history'
  | 'story'
  | 'settings';

export type GuideBookPage = {
  id: string;
  chapter: string;
  title: string;
  lead?: string;
  figureId: GuideBookFigureId;
  callouts: readonly GuideBookCallout[];
  notes?: readonly string[];
};

type PageSpec = {
  id: string;
  chapterKey: string;
  figureId: GuideBookFigureId;
  callouts: number;
  notes: number;
  hasLead: boolean;
};

const PAGE_SPECS: readonly PageSpec[] = [
  { id: 'cover', chapterKey: 'pokit', figureId: 'tabs-map', callouts: 5, notes: 0, hasLead: true },
  { id: 'chrome', chapterKey: 'common', figureId: 'chrome-modes', callouts: 5, notes: 1, hasLead: true },
  { id: 'today-overview', chapterKey: 'todayTab', figureId: 'today-overview', callouts: 4, notes: 1, hasLead: true },
  { id: 'today-window', chapterKey: 'todayTab', figureId: 'today-window', callouts: 4, notes: 0, hasLead: true },
  { id: 'today-layouts', chapterKey: 'todayTab', figureId: 'today-layouts', callouts: 2, notes: 0, hasLead: true },
  { id: 'today-add-row', chapterKey: 'todayTab', figureId: 'today-add-row', callouts: 5, notes: 0, hasLead: true },
  { id: 'today-autofocus', chapterKey: 'todayTab', figureId: 'today-autofocus', callouts: 4, notes: 0, hasLead: true },
  { id: 'routine-list', chapterKey: 'routinesTab', figureId: 'routine-list', callouts: 4, notes: 0, hasLead: true },
  { id: 'routine-templates', chapterKey: 'routinesTab', figureId: 'routine-templates', callouts: 5, notes: 0, hasLead: true },
  { id: 'my-routine', chapterKey: 'myRoutinesTab', figureId: 'my-routine', callouts: 4, notes: 0, hasLead: true },
  { id: 'my-routine-apply', chapterKey: 'myRoutinesTab', figureId: 'my-routine-apply', callouts: 2, notes: 2, hasLead: true },
  { id: 'history', chapterKey: 'historyTab', figureId: 'history', callouts: 4, notes: 0, hasLead: true },
  { id: 'story', chapterKey: 'storyTab', figureId: 'story', callouts: 3, notes: 0, hasLead: true },
  { id: 'settings', chapterKey: 'settings', figureId: 'settings', callouts: 5, notes: 0, hasLead: true },
] as const;

export type GuideBookTocSection = {
  chapter: string;
  icon: string;
  subtitle: string;
  pageIndexes: number[];
};

const CHAPTER_META: Record<string, { icon: string; subtitleKey: I18nKey }> = {
  pokit: { icon: 'calendar', subtitleKey: 'guideBook.chapter.pokit.subtitle' },
  common: { icon: 'gearshape', subtitleKey: 'guideBook.chapter.common.subtitle' },
  todayTab: { icon: 'calendar', subtitleKey: 'guideBook.chapter.todayTab.subtitle' },
  routinesTab: { icon: 'list.bullet.rectangle', subtitleKey: 'guideBook.chapter.routinesTab.subtitle' },
  myRoutinesTab: { icon: 'figure.walk', subtitleKey: 'guideBook.chapter.myRoutinesTab.subtitle' },
  historyTab: { icon: 'clock.arrow.circlepath', subtitleKey: 'guideBook.chapter.historyTab.subtitle' },
  storyTab: { icon: 'book', subtitleKey: 'guideBook.chapter.storyTab.subtitle' },
  settings: { icon: 'gearshape', subtitleKey: 'guideBook.chapter.settings.subtitle' },
};

function pageKey(pageId: string, suffix: string): I18nKey {
  return `guideBook.page.${pageId}.${suffix}` as I18nKey;
}

function localizePage(spec: PageSpec, locale: AppLocale): GuideBookPage {
  const callouts: GuideBookCallout[] = [];
  for (let n = 1; n <= spec.callouts; n += 1) {
    callouts.push({
      n,
      label: t(pageKey(spec.id, `c${n}.label`), locale),
      detail: t(pageKey(spec.id, `c${n}.detail`), locale),
    });
  }

  const notes: string[] = [];
  for (let i = 1; i <= spec.notes; i += 1) {
    notes.push(t(pageKey(spec.id, `note${i}`), locale));
  }

  return {
    id: spec.id,
    chapter: t(`guideBook.chapter.${spec.chapterKey}.name` as I18nKey, locale),
    title: t(pageKey(spec.id, 'title'), locale),
    lead: spec.hasLead ? t(pageKey(spec.id, 'lead'), locale) : undefined,
    figureId: spec.figureId,
    callouts,
    notes: notes.length > 0 ? notes : undefined,
  };
}

export function getGuideBookPages(locale: AppLocale): readonly GuideBookPage[] {
  return PAGE_SPECS.map((spec) => localizePage(spec, locale));
}

/** 목차용 — chapter 순서대로 묶음 */
export function buildGuideBookToc(locale: AppLocale): GuideBookTocSection[] {
  const pages = getGuideBookPages(locale);
  const order: string[] = [];
  const indexes = new Map<string, number[]>();
  pages.forEach((page, i) => {
    if (!indexes.has(page.chapter)) {
      order.push(page.chapter);
      indexes.set(page.chapter, []);
    }
    indexes.get(page.chapter)!.push(i);
  });

  return order.map((chapter) => {
    const firstIndex = indexes.get(chapter)?.[0] ?? 0;
    const chapterKey = PAGE_SPECS[firstIndex]!.chapterKey;
    const meta = CHAPTER_META[chapterKey] ?? { icon: 'book', subtitleKey: 'guideBook.chapter.common.subtitle' as I18nKey };
    return {
      chapter,
      icon: meta.icon,
      subtitle: t(meta.subtitleKey, locale),
      pageIndexes: indexes.get(chapter) ?? [],
    };
  });
}
