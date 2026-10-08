import {
  ensurePuzzleRevealBaseline,
  listUnseenCompletedPuzzleIndices,
  markPuzzleRevealSeen,
  resetPuzzleRevealSeenForTests,
} from './puzzleRevealSeen';

describe('puzzleRevealSeen', () => {
  beforeEach(() => {
    resetPuzzleRevealSeenForTests();
  });

  it('treats baseline as already seen so only newer indices are pending', () => {
    ensurePuzzleRevealBaseline('h1', [0, 1, 2]);
    expect(listUnseenCompletedPuzzleIndices('h1', [0, 1, 2, 3])).toEqual([3]);
  });

  it('marking seen clears pending', () => {
    ensurePuzzleRevealBaseline('h1', [0]);
    expect(listUnseenCompletedPuzzleIndices('h1', [0, 1])).toEqual([1]);
    markPuzzleRevealSeen('h1', [1]);
    expect(listUnseenCompletedPuzzleIndices('h1', [0, 1])).toEqual([]);
  });

  it('does not mass-animate when baseline was never set', () => {
    expect(listUnseenCompletedPuzzleIndices('h1', [0, 1, 2])).toEqual([]);
    expect(listUnseenCompletedPuzzleIndices('h1', [0, 1, 2, 3])).toEqual([3]);
  });
});
