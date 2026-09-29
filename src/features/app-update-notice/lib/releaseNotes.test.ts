import { listRecentReleaseNotes } from './releaseNotes';

describe('listRecentReleaseNotes', () => {
  it('returns newest localized versions first and caps the list', () => {
    const items = listRecentReleaseNotes('ko', 3);
    expect(items).toHaveLength(3);
    expect(items[0]?.version).toBe('1.8.15');
    expect(items[0]?.highlights.length).toBeGreaterThan(0);
    expect(items.map((row) => row.version)).toEqual(['1.8.15', '1.8.14', '1.8.10']);
  });
});
