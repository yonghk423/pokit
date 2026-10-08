import type { Announcement } from '@entities/announcement';

import {
  announcementBodyPreview,
  extractAnnouncementVersion,
  pickHomeNudgeAnnouncement,
} from './pickHomeNudgeAnnouncement';

function item(
  partial: Partial<Announcement> & Pick<Announcement, 'id' | 'priority'>,
): Announcement {
  return {
    locale: 'ko',
    title: '제목',
    body: '본문',
    publishedAt: '2026-10-08T00:00:00.000Z',
    expiresAt: null,
    linkUrl: null,
    ...partial,
  };
}

describe('extractAnnouncementVersion', () => {
  it('reads x.y.z from title', () => {
    expect(extractAnnouncementVersion('POKIT 1.9.4 업데이트')).toBe('1.9.4');
    expect(extractAnnouncementVersion('POKIT 1.8.16 update')).toBe('1.8.16');
  });
});

describe('pickHomeNudgeAnnouncement', () => {
  it('picks the highest version number, not published_at', () => {
    const items = [
      item({
        id: 'newer-date-old-ver',
        priority: 'important',
        title: 'POKIT 1.8.16 업데이트',
        publishedAt: '2026-10-08T12:00:00.000Z',
      }),
      item({
        id: 'older-date-new-ver',
        priority: 'important',
        title: 'POKIT 1.9.4 업데이트',
        publishedAt: '2026-09-01T00:00:00.000Z',
      }),
    ];
    expect(pickHomeNudgeAnnouncement(items, new Set())).toEqual(
      expect.objectContaining({ id: 'older-date-new-ver' }),
    );
  });

  it('does not fall back to a lower unread version when latest is read', () => {
    const items = [
      item({
        id: 'v194',
        priority: 'important',
        title: 'POKIT 1.9.4 업데이트',
      }),
      item({
        id: 'v1816',
        priority: 'force',
        title: 'POKIT 1.8.16 업데이트',
      }),
    ];
    expect(pickHomeNudgeAnnouncement(items, new Set(['v194']))).toBeNull();
  });

  it('skips important items without a version in the title', () => {
    const items = [
      item({ id: 'no-ver', priority: 'important', title: '점검 안내' }),
      item({
        id: 'with-ver',
        priority: 'important',
        title: 'POKIT 1.9.0 업데이트',
      }),
    ];
    expect(pickHomeNudgeAnnouncement(items, new Set())).toEqual(
      expect.objectContaining({ id: 'with-ver' }),
    );
  });

  it('returns null when nothing qualifies', () => {
    const items = [item({ id: 'a', priority: 'info', title: 'POKIT 1.9.4 업데이트' })];
    expect(pickHomeNudgeAnnouncement(items, new Set())).toBeNull();
  });
});

describe('announcementBodyPreview', () => {
  it('uses the first bullet line', () => {
    expect(announcementBodyPreview('• 첫 줄\n• 둘째')).toBe('첫 줄');
  });

  it('truncates long text', () => {
    const long = '가'.repeat(120);
    const preview = announcementBodyPreview(long, 10);
    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(10);
  });
});
