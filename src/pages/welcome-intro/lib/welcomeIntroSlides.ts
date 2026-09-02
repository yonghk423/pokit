import type { AppLocale } from '@shared/lib/i18n/model/locale';
import { t } from '@shared/lib/i18n';

/**
 * 첫 사용자용 서비스 소개 슬라이드 (짧게 핵심만).
 * 자세한 탭·버튼 안내는 사용 설명서(`guide-book`)로.
 */

export type WelcomeIntroSlide = {
  id: string;
  title: string;
  body: string;
  /** 마지막 장 등 — 본문과 구분되는 추가 안내 */
  note?: string;
};

export function getWelcomeIntroSlides(locale?: AppLocale): readonly WelcomeIntroSlide[] {
  return [
    {
      id: 'welcome',
      title: t('welcome.welcome.title', locale),
      body: t('welcome.welcome.body', locale),
    },
    {
      id: 'today',
      title: t('welcome.today.title', locale),
      body: t('welcome.today.body', locale),
    },
    {
      id: 'routines',
      title: t('welcome.routines.title', locale),
      body: t('welcome.routines.body', locale),
    },
    {
      id: 'modes',
      title: t('welcome.modes.title', locale),
      body: t('welcome.modes.body', locale),
    },
    {
      id: 'next',
      title: t('welcome.next.title', locale),
      body: t('welcome.next.body', locale),
      note: t('welcome.next.note', locale),
    },
  ] as const;
}
