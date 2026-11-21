import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export type ArchivedNote = { key: string; date: string; monthly: boolean };
export type ArchivedNoteMonth = { month: string; entries: ArchivedNote[] };

/** Index existing documents without copying them or counting their metadata as notes. */
export function loadNoteArchive(): ArchivedNoteMonth[] {
  const documents = new Map<string, ArchivedNote>();
  for (const key of localStorageClient.listKeys('pokit:')) {
    const match = /^pokit:(canvas-note|monthly-album-note):(\d{4}-\d{2}(?:-\d{2})?)(?::(?:inline|illustrations))?$/.exec(key);
    if (!match) continue;
    const monthly = match[1] === 'monthly-album-note';
    const date = monthly ? `${match[2]}-01` : match[2];
    if (monthly ? match[2].length !== 7 : match[2].length !== 10) continue;
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== Number(date.slice(0, 4)) || parsed.getMonth() + 1 !== Number(date.slice(5, 7)) || parsed.getDate() !== Number(date.slice(8))) continue;
    const base = `pokit:${match[1]}:${match[2]}`;
    const inline = localStorageClient.getJson<{ text?: unknown; icons?: unknown }>(base + ':inline');
    const validInline = typeof inline?.text === 'string' && Array.isArray(inline.icons);
    const text = validInline ? inline.text as string : localStorageClient.getItemRaw(base) ?? '';
    const icons = validInline ? inline.icons : localStorageClient.getJson<unknown>(base + ':illustrations');
    if (!text.replace(/\uFFFC/g, '').trim() && !(Array.isArray(icons) && icons.length)) continue;
    documents.set(base, { key: base, date, monthly });
  }
  const groups = new Map<string, ArchivedNote[]>();
  for (const note of documents.values()) {
    const month = note.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), note]);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a)).map(([month, entries]) => ({
    month, entries: entries.sort((a, b) => Number(b.monthly) - Number(a.monthly) || b.date.localeCompare(a.date)),
  }));
}

/** Delete only this notebook's note documents; keep photos, events and other months. */
export function deleteNoteArchiveMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
  const monthlyKey = `pokit:monthly-album-note:${month}`;
  const dailyPrefix = `pokit:canvas-note:${month}-`;
  for (const key of localStorageClient.listKeys('pokit:')) {
    if (key === monthlyKey || key.startsWith(monthlyKey + ':') ||
      (key.startsWith(dailyPrefix) && /^\d{2}(?::|$)/.test(key.slice(dailyPrefix.length)))) {
      localStorageClient.removeItem(key);
    }
  }
}
