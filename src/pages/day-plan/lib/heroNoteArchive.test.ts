import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { loadNoteArchive } from './heroNoteArchive';

jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { listKeys: jest.fn(), getJson: jest.fn(), getItemRaw: jest.fn() } }));
function storage(values: Record<string, unknown>) {
  jest.mocked(localStorageClient.listKeys).mockReturnValue(Object.keys(values));
  jest.mocked(localStorageClient.getItemRaw).mockImplementation(key => typeof values[key] === 'string' ? values[key] as string : null);
  jest.mocked(localStorageClient.getJson).mockImplementation(key => values[key] ?? null);
}
it('groups existing daily and monthly documents, deduplicates inline mirrors and sorts newest first', () => {
  storage({
    'pokit:canvas-note:2026-11-18': 'Legacy mirror',
    'pokit:canvas-note:2026-11-18:inline': { text: 'New story', icons: [] },
    'pokit:canvas-note:2026-11-18:colors': { pen: '#333' },
    'pokit:canvas-note:2026-11-01': 'First day',
    'pokit:monthly-album-note:2026-11:inline': { text: 'Monthly story', icons: [] },
    'pokit:canvas-note:2025-12-31': 'Last year',
  });
  const groups = loadNoteArchive();
  expect(groups.map(group => group.month)).toEqual(['2026-11', '2025-12']);
  expect(groups[0].entries.map(note => [note.date, note.monthly])).toEqual([['2026-11-01', true], ['2026-11-18', false], ['2026-11-01', false]]);
});
it('ignores cleared documents, metadata and invalid dates while retaining illustration-only notes', () => {
  storage({
    'pokit:canvas-note:2026-11-18': 'Stale legacy text',
    'pokit:canvas-note:2026-11-18:inline': { text: '  ', icons: [] },
    'pokit:canvas-note:2026-11-19:colors': { paper: '#FFF' },
    'pokit:canvas-note:2026-02-30': 'Invalid date',
    'pokit:canvas-note:2026-13-01': 'Invalid month',
    'pokit:monthly-album-note:2026-11-01': 'Wrong date shape',
    'pokit:canvas-note:2026-11-20:illustrations': ['star'],
    'pokit:canvas-note:2026-11-21:inline': { text: '\uFFFC', icons: ['star'] },
  });
  expect(loadNoteArchive()[0].entries.map(note => note.date)).toEqual(['2026-11-21', '2026-11-20']);
});
it('rereads storage so edits and deletions are reflected without migrating notes', () => {
  storage({ 'pokit:canvas-note:2026-11-18': 'Hello' });
  expect(loadNoteArchive()).toHaveLength(1);
  storage({ 'pokit:canvas-note:2026-11-18': '' });
  expect(loadNoteArchive()).toEqual([]);
});
