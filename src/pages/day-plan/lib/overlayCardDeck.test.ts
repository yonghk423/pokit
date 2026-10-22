import { deckWindowStart, overlayCardPose, overlayDeckLayout, overlayDeckFrame, loopDeckIndex } from './overlayCardDeck';

it('reveals no more than three card contents through an entire transition', () => {
  for (let progress = 0; progress <= 1; progress += 0.025) {
    const visible = Array.from({ length: 6 }, (_, index) => overlayCardPose(index - progress))
      .filter(pose => pose.opacity > 0 && pose.contentOpacity > 0);
    expect(visible.length).toBeLessThanOrEqual(3);
  }
  expect(overlayCardPose(3).contentOpacity).toBe(0);
  expect(overlayCardPose(3).opacity).toBe(0);
});

it('shows both neighbors even when the snapped offset lands slightly off an index', () => {
  for (const drift of [-0.03, 0, 0.03]) {
    expect(overlayCardPose(-1 - drift).opacity).toBe(1);
    expect(overlayCardPose(1 - drift).opacity).toBe(1);
  }
});

it('keeps first and last windows valid for short lists and scroll overshoot', () => {
  expect(deckWindowStart(-2, 10)).toBe(0);
  expect(deckWindowStart(100, 10)).toBe(7);
  expect(deckWindowStart(5, 2)).toBe(0);
  expect(deckWindowStart(0, 0)).toBe(0);
});


it('preserves the reference card proportions and overlap on every viewport', () => {
  for (const [width, height] of [[340, 600], [390, 740], [768, 900], [740, 340]]) {
    const { cardWidth, cardHeight, scale } = overlayDeckLayout(width, height);
    // Short landscape stages clamp the height instead of shrinking the card.
    if (height >= 600) expect(cardWidth / cardHeight).toBeCloseTo(300 / 414);
    const front = overlayDeckFrame(0, width, height);
    const left = overlayDeckFrame(-1, width, height);
    const right = overlayDeckFrame(1, width, height);
    expect((right.left - front.left) / scale).toBeCloseTo(216);
    expect((front.left - left.left) / scale).toBeCloseTo(216);
    // Each scaled neighbor peeks out from behind the front card on its own side.
    const peek = cardWidth * (1 - left.scale) / 2;
    expect(left.left + peek).toBeLessThan(front.left);
    expect(right.left + cardWidth - peek).toBeGreaterThan(front.left + cardWidth);
    expect(front.left).toBeGreaterThanOrEqual(12 - 0.001);
    expect(front.left + cardWidth).toBeLessThanOrEqual(width - 12 + 0.001);
  }
});


it('wraps forward and backward over any number of cycles', () => {
  expect(loopDeckIndex(12, 12)).toBe(0);
  expect(loopDeckIndex(25, 12)).toBe(1);
  expect(loopDeckIndex(-1, 12)).toBe(11);
  expect(loopDeckIndex(-25, 12)).toBe(11);
  expect(loopDeckIndex(2, 0)).toBe(0);
});

it('fits eight overview cards on a normal phone and uses two readable columns on smaller screens', () => {
  const { overviewCardLayout } = require('./overlayCardDeck');
  const normal = overviewCardLayout(390, 720, 8);
  expect(normal.columns).toBe(3);
  expect(normal.cardHeight * 3 + 16 + 138).toBeLessThanOrEqual(720);
  const small = overviewCardLayout(320, 600, 8);
  expect(small.columns).toBe(2);
  expect(small.cardWidth).toBeGreaterThan(130);
});

it('keeps populated cards on screen when the native animation gets ahead of React mounting', () => {
  const { visibleDeckProgress } = require('./overlayCardDeck');
  for (const anchor of [-20, 8, 44]) {
    for (const pending of [-10000, anchor, 10000]) {
      const progress = visibleDeckProgress(pending, anchor);
      const visible = Array.from({ length: 6 }, (_, offset) => overlayCardPose(anchor - 1 + offset - progress))
        .filter(pose => pose.opacity > 0 && pose.contentOpacity > 0);
      expect(visible.length).toBeGreaterThanOrEqual(2);
    }
  }
});
