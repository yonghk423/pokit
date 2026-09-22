export type AnnouncementLocale = 'ko' | 'en' | 'ja';

export type AnnouncementPriority = 'info' | 'important' | 'force';

export type Announcement = {
  id: string;
  locale: AnnouncementLocale;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  publishedAt: string;
  expiresAt: string | null;
  linkUrl: string | null;
};
