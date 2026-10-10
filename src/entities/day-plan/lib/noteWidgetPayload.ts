import { t } from '@shared/lib/i18n';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { normalizeWorkDetailConfig } from './goalCategorySessionConfig';
import {
  resolveWorkStudyNotePageLabel,
  resolveWorkStudyNotePagePreview,
  workStudyPageBlocksToPlainText,
  type WorkStudyNotePage,
} from './workStudyDocument';
import { resolveWidgetPostItAppearance } from './widgetPostItAppearance';

export type NoteWidgetPage = {
  id: string;
  title: string;
  preview: string;
  createdDateKey: string;
};

export type NoteWidgetBundlePayload = {
  version: 1;
  fallbackPageId: string | null;
  pages: NoteWidgetPage[];
  faceHex: string;
  inkHex: string;
  mutedHex: string;
  underlineText: boolean;
  emptyMessage: string;
};

function sortNotePagesForWidget(pages: WorkStudyNotePage[]): WorkStudyNotePage[] {
  return [...pages].sort((a, b) => {
    const aKey = a.createdDateKey ?? '';
    const bKey = b.createdDateKey ?? '';
    if (aKey !== bKey) return bKey.localeCompare(aKey);
    return pages.indexOf(a) - pages.indexOf(b);
  });
}

/** 홈 위젯 면이 다 차도 남을 만큼만 남긴다. 칸이 비는데 40자에서 자르지 않는다. */
const NOTE_WIDGET_PREVIEW_LIMIT = 800;

function clipPreview(preview: string): string {
  const compact = preview.replace(/\n{3,}/g, '\n\n').trim();
  if (compact.length <= NOTE_WIDGET_PREVIEW_LIMIT) return compact;
  return `${compact.slice(0, NOTE_WIDGET_PREVIEW_LIMIT).trimEnd()}…`;
}

/** 위젯 고르기용 — 앱 목록과 같이 날짜 제목, 같은 날은 · 2 · 3 */
export function toNoteWidgetPages(pages: WorkStudyNotePage[]): NoteWidgetPage[] {
  const sorted = sortNotePagesForWidget(pages);
  const seen = new Map<string, number>();
  return sorted.map((page) => {
    const base =
      resolveWorkStudyNotePageLabel(page, pages).trim() || t('widgetSettings.note.untitled');
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return {
      id: page.id,
      title: count > 1 ? `${base} · ${count}` : base,
      preview: clipPreview(
        workStudyPageBlocksToPlainText(page.blocks) || resolveWorkStudyNotePagePreview(page),
      ),
      createdDateKey: typeof page.createdDateKey === 'string' ? page.createdDateKey : '',
    };
  });
}

export function buildNoteWidgetBundlePayload(): NoteWidgetBundlePayload {
  const workRaw = loadGoalDetailCategoryConfig('work');
  const work = normalizeWorkDetailConfig(workRaw ?? {});
  const pages = work.document.pages ?? [];
  const entries = toNoteWidgetPages(pages);
  const activeId = work.document.activePageId;
  const fallbackPageId =
    entries.find((row) => row.id === activeId)?.id ?? entries[0]?.id ?? null;
  const appearance = resolveWidgetPostItAppearance(false);
  return {
    version: 1,
    fallbackPageId,
    pages: entries,
    faceHex: appearance.faceHex,
    inkHex: appearance.inkHex,
    mutedHex: appearance.mutedHex,
    underlineText: appearance.underlineText,
    emptyMessage: t('widgetSettings.note.emptyMessage'),
  };
}
