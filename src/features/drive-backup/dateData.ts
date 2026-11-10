import { mergeDependencies, replaceReferences, type BackupDependencies } from './dependencies';
import { localStorageClient as storage } from '@shared/lib/storage/localStorageClient';
type Row = Record<string, any>;
export const validDate = (s: string) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
export function dateOf(value: unknown): string {
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export type DateData = { contentVersion?: 2; story?: string | null; events?: Row[]; originals?: Row[]; date: string; dependencies?: BackupDependencies; gallery: Row[]; diaries: Row[]; scenes: Record<string, unknown>; stats: Row[]; memo: string | null; assignment: unknown; plan: Row | null; puzzles: Row[] };
const read = (key: string): Row => storage.getJson<Row>(key) ?? {};
const diaryDate = (diary: Row): string => validDate(diary.date) ? diary.date : /^legacy:.+:(\d{4}-\d{2}-\d{2})$/.exec(diary.id ?? '')?.[1] ?? dateOf(diary.createdAt);
export function collectDate(date: string): DateData {
  if (!validDate(date)) throw new Error('올바른 날짜를 선택해 주세요.');
  return {
    contentVersion: 2, date,
    story: storage.getItemRaw(`pokit:canvas-note:${date}`),
    events: storage.getJson<Row[]>(`pokit:canvas-events:${date}`) ?? [],
    diaries: (read('pokit:comic-diaries:v1').diaries ?? []).filter((diary: Row) => diaryDate(diary) === date),
    originals: [], gallery: [], scenes: {}, stats: [], memo: null, assignment: null, plan: null, puzzles: [],
  };
}
export function localDates(): string[] {
  const dates = new Set<string>();
  for (const diary of read('pokit:comic-diaries:v1').diaries ?? []) dates.add(diaryDate(diary));
  for (const prefix of ['pokit:canvas-note:', 'pokit:canvas-events:']) {
    for (const key of storage.listKeys(prefix)) dates.add(key.slice(prefix.length));
  }
  for (const image of storage.getJson<Row[]>('pokit:drive-original-gallery:v1') ?? []) dates.add(dateOf(image.createdAt));
  return [...dates].filter(validDate).sort().reverse();
}
function mergePhotoDate(data: DateData): Record<string, unknown> {
  if (!validDate(data.date) || !Array.isArray(data.diaries) || !Array.isArray(data.events) || !Array.isArray(data.originals)
    || (data.story !== null && typeof data.story !== 'string')
    || data.diaries.some(diary => !diary || typeof diary.id !== 'string' || diaryDate(diary) !== data.date || !Array.isArray(diary.scenes))
    || data.events.some(event => !event || typeof event.id !== 'string' || typeof event.title !== 'string')
    || data.originals.some(image => !image || typeof image.uri !== 'string' || dateOf(image.createdAt) !== data.date)) throw new Error('백업 데이터가 손상됐어요.');
  const library = read('pokit:comic-diaries:v1');
  const others = (library.diaries ?? []).filter((diary: Row) => diaryDate(diary) !== data.date);
  if (others.some((diary: Row) => data.diaries.some(value => value.id === diary.id))) throw new Error('다른 날짜의 기록과 ID가 겹쳐요.');
  const diaries = [...others, ...data.diaries];
  return {
    'pokit:comic-diaries:v1': { ...library, version: 1, diaries, activeId: diaries.some(value => value.id === library.activeId) ? library.activeId : null },
    [`pokit:canvas-note:${data.date}`]: data.story ?? '',
    [`pokit:canvas-events:${data.date}`]: data.events,
    'pokit:drive-original-gallery:v1': [...(storage.getJson<Row[]>('pokit:drive-original-gallery:v1') ?? []).filter(image => dateOf(image.createdAt) !== data.date), ...data.originals],
  };
}
export function mergeDate(source: DateData, restorePreferences = false): Record<string, unknown> {
  if (source.contentVersion === 2) return mergePhotoDate(source);
  const { writes: dependencyWrites, mapping } = mergeDependencies(source.dependencies, restorePreferences);
  const data = replaceReferences(source, mapping);
  if (!validDate(data.date) || !Array.isArray(data.diaries) || !Array.isArray(data.stats) || !Array.isArray(data.puzzles) || !data.scenes || typeof data.scenes !== 'object') throw new Error('지원하지 않는 백업 데이터예요.');
  const { date } = data;
  if (data.diaries.some(r => !r || typeof r.id !== 'string' || dateOf(r.createdAt) !== date) || data.stats.some(r => !r || r.dateKey !== date) || data.puzzles.some(r => !r || typeof r.id !== 'string' || dateOf(r.createdAt) !== date) || (data.plan && data.plan.dateKey !== date)) throw new Error('백업 날짜가 일치하지 않아요.');
  const out: Record<string, unknown> = { ...dependencyWrites };
  if (!Array.isArray(data.gallery)) throw new Error('이미지 목록이 손상됐어요.');
  out['pokit:drive-gallery'] = { images: [...(read('pokit:drive-gallery').images ?? []).filter((r: Row) => dateOf(r.createdAt) !== date), ...data.gallery] };
  for (const [key, value] of Object.entries(data.scenes)) {
    if (!/^pokit:comic-day:(?:[^:]+:)?\d{4}-\d{2}-\d{2}$/.test(key) || !key.endsWith(`:${date}`) || !Array.isArray(value)) throw new Error('잘못된 날짜별 기록이에요.');
    out[key] = value;
  }
  for (const key of storage.listKeys('pokit:comic-day:')) if (key.endsWith(`:${date}`) && !(key in out)) out[key] = [];
  const library = read('pokit:comic-diaries:v1');
  const ids = new Set(data.diaries.map(r => r.id));
  const otherDiaries = (library.diaries ?? []).filter((r: Row) => dateOf(r.createdAt) !== date);
  if (otherDiaries.some((r: Row) => ids.has(r.id))) throw new Error('다른 날짜의 일기와 ID가 겹쳐요.');
  const diaries = [...otherDiaries, ...data.diaries];
  out['pokit:comic-diaries:v1'] = { ...library, version: 1, diaries, activeId: diaries.some(r => r.id === library.activeId) ? library.activeId : null, migratedLegacyKeys: [...new Set([...(library.migratedLegacyKeys ?? []), ...Object.keys(data.scenes)])] };
  out['pokit:history-daily-stats'] = { v: 1, rows: [...(read('pokit:history-daily-stats').rows ?? []).filter((r: Row) => r.dateKey !== date), ...data.stats] };
  const memos = { ...read('pokit:horizon-weekly-day-memos') }; delete memos[date]; if (data.memo !== null) memos[date] = data.memo;
  out['pokit:horizon-weekly-day-memos'] = memos;
  const assignments = { ...read('pokit:scheduled-routine-plan').assignmentsByDate }; delete assignments[date]; if (data.assignment !== null) assignments[date] = data.assignment;
  out['pokit:scheduled-routine-plan'] = { assignmentsByDate: assignments };
  // The app keeps only one active day plan. Do not replace a different day's plan.
  if (data.plan && (!read('pokit:day-plan').dateKey || read('pokit:day-plan').dateKey === date)) out['pokit:day-plan'] = data.plan;
  else if (data.plan) out[`pokit:drive-restored-plan:${date}`] = data.plan;
  const puzzle = read('pokit:puzzle-history');
  const otherPuzzles = (puzzle.state?.histories ?? []).filter((r: Row) => dateOf(r.createdAt) !== date);
  if (otherPuzzles.some((r: Row) => data.puzzles.some(p => p.id === r.id))) throw new Error('다른 날짜의 퍼즐과 ID가 겹쳐요.');
  const histories = [...otherPuzzles, ...data.puzzles];
  out['pokit:puzzle-history'] = { v: 2, state: { ...puzzle.state, schemaVersion: 2, histories, activeHistoryId: histories.some(r => r.id === puzzle.state?.activeHistoryId) ? puzzle.state.activeHistoryId : null } };
  return out;
}
