import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';

import { buildTemplateDemoConfig } from './customFlowTemplate';
import { listCustomFlowTemplateCatalogEntries } from './customFlowTemplateCatalog';

describe('template demo locale copy', () => {
  afterEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
  });

  it('builds English sample fields for memo / checklist / counter', () => {
    useAppLocaleStore.setState({ locale: 'en' });
    const memo = buildTemplateDemoConfig('memo') as { lastEntry?: string };
    expect(memo.lastEntry).toMatch(/charger|earbuds/i);

    const checklist = buildTemplateDemoConfig('checklist') as {
      checklist?: Array<{ text?: string }>;
    };
    expect(checklist.checklist?.[0]?.text).toMatch(/water/i);

    const counter = buildTemplateDemoConfig('counter') as { activityLabel?: string };
    expect(counter.activityLabel).toMatch(/Push/i);

    const preview = listCustomFlowTemplateCatalogEntries().find((e) => e.key === 'memo');
    expect(preview?.previewLines.join(' ')).toMatch(/Groceries|note/i);
    expect(preview?.previewLines.join(' ')).not.toMatch(/[가-힣]/);
  });

  it('builds Japanese sample fields', () => {
    useAppLocaleStore.setState({ locale: 'ja' });
    const reminder = buildTemplateDemoConfig('reminder') as {
      reminderItems?: Array<{ label?: string }>;
    };
    expect(reminder.reminderItems?.[0]?.label).toMatch(/サプリ|朝/);
    expect(reminder.reminderItems?.[0]?.label).not.toMatch(/[가-힣]/);
  });
});
