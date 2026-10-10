import {
  appendLinkedRoutines,
  applyCompletedPieceCount,
  buildPiecesForTarget,
  createPuzzleHistoryInput,
} from './puzzleHistoryDomain';

describe('puzzleHistoryDomain (completion count)', () => {
  it('builds one piece per target', () => {
    const rows = buildPiecesForTarget(10);
    expect(rows).toHaveLength(10);
    expect(rows[0]?.puzzleIndex).toBe(0);
    expect(rows[9]?.completed).toBe(false);
  });

  it('creates history for each target', () => {
    for (const targetCount of [1, 10, 20, 50, 100] as const) {
      const h = createPuzzleHistoryInput({
        id: `h-${targetCount}`,
        title: 't',
        imageUri: 'file:///tmp/a.jpg',
        targetCount,
      });
      expect(h.totalPieces).toBe(targetCount);
      expect(h.pieces).toHaveLength(targetCount);
      expect(h.completionBaseline).toBe(0);
    }
  });

  it('stores per-category completion baseline', () => {
    const h = createPuzzleHistoryInput({
      id: 'c',
      title: 't',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
      linkedCategoryKeys: ['reading', 'stretch'],
      completionBaselineByCategory: { reading: 4, stretch: 1 },
    });
    expect(h.completionBaselineByCategory).toEqual({ reading: 4, stretch: 1 });
    expect(h.completionBaseline).toBe(5);
  });

  it('appends routines without dropping ones already linked', () => {
    const h = createPuzzleHistoryInput({
      id: 'add',
      title: 't',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
      linkedCategoryKeys: ['reading'],
      completionBaselineByCategory: { reading: 3 },
    });
    const next = appendLinkedRoutines(h, ['reading', 'work', 'water'], {
      reading: 99,
      work: 4,
      water: 1,
    });
    expect(next.linkedCategoryKeys).toEqual(['reading', 'work', 'water']);
    expect(next.completionBaselineByCategory).toEqual({ reading: 3, work: 4, water: 1 });
    expect(next.completionBaseline).toBe(8);
    const done = { ...h, status: 'completed' as const };
    expect(appendLinkedRoutines(done, ['work'], { work: 1 })).toBe(done);
  });

  it('applies sticky completion counts', () => {
    let h = createPuzzleHistoryInput({
      id: 'a',
      title: 't',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
    });
    h = applyCompletedPieceCount(h, 3);
    expect(h.completedCount).toBe(3);
    expect(h.pieces[0]?.completed).toBe(true);
    expect(h.pieces[2]?.completed).toBe(true);
    expect(h.pieces[3]?.completed).toBe(false);

    const again = applyCompletedPieceCount(h, 2);
    expect(again.completedCount).toBe(3);
  });

  it('completes when reaching target', () => {
    let h = createPuzzleHistoryInput({
      id: 'b',
      title: 't',
      imageUri: 'file:///a.jpg',
      targetCount: 10,
    });
    h = applyCompletedPieceCount(h, 10);
    expect(h.status).toBe('completed');
    expect(h.completedCount).toBe(10);
  });
});
