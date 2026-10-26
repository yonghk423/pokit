import { DAY_PLAN_MATE_CARD_TOP } from './dayPlanDeckMetrics';

/** A centered paper stack; the outgoing front card travels right, then behind it. */
function forwardCardPose(depth: number) {
  'worklet';
  if (depth < 0) {
    const turn = Math.min(1, -depth);
    const arc = Math.sin(Math.PI * turn);
    return {
      x: arc * 0.86,
      y: -arc * 5 + turn * 24,
      scale: 1 - turn * 0.045,
      rotate: arc * 7,
      opacity: depth <= -1 ? 0 : Math.min(1, (1 - turn) / 0.16),
      contentOpacity: 1,
      zIndex: turn < 0.53 ? 40 : 5,
    };
  }
  const d = Math.min(3, depth);
  // The front stays upright; rear edges peek out on alternating sides.
  const first = Math.min(1, d);
  const second = Math.max(0, Math.min(1, d - 1));
  return {
    x: -0.045 * first + 0.095 * second,
    y: 14 * first + 10 * second,
    scale: 1 - 0.02 * first - 0.02 * second,
    rotate: -1.8 * first + 3.6 * second,
    opacity: depth <= 2 ? 1 : Math.max(0, 1 - (depth - 2) / 0.2),
    contentOpacity: depth <= 2.2 ? 1 : 0,
    zIndex: Math.round(30 - d * 10),
  };
}

/** Reverse gestures send the current front left and bring the preceding card forward. */
export function overlayCardPose(depth: number, direction = 1) {
  'worklet';
  if (direction < 0 && Math.abs(depth) > 0.001 && Math.abs(depth) < 0.999) {
    const pose = forwardCardPose(-depth);
    return { ...pose, x: -pose.x, rotate: -pose.rotate };
  }
  return forwardCardPose(depth);
}

export function deckWindowStart(progress: number, count: number) {
  'worklet';
  return Math.max(0, Math.min(Math.max(0, count - 3), Math.floor(progress)));
}

/** Large centered portrait card with slim peeks of the neighboring cards. */
export function overlayDeckLayout(width: number, height: number) {
  'worklet';
  // Leave a wider gutter so both neighboring cards remain clearly visible
  // within the narrow phone viewport.
  const cardWidth = Math.max(1, Math.min(width - 84, 300));
  const scale = cardWidth / 300;
  const cardHeight = Math.min(414 * scale, Math.max(1, height - 56));
  const offsetX = (width - cardWidth) / 2;
  const offsetY = Math.min(DAY_PLAN_MATE_CARD_TOP, Math.max(12, height - cardHeight - 12));
  return { cardWidth, cardHeight, scale, offsetX, offsetY };
}

export function overlayDeckFrame(depth: number, width: number, height: number, direction = 1) {
  'worklet';
  const pose = overlayCardPose(depth, direction);
  const layout = overlayDeckLayout(width, height);
  return {
    ...pose,
    left: layout.offsetX + pose.x * layout.cardWidth,
    top: layout.offsetY + pose.y,
  };
}

export function loopDeckIndex(index: number, count: number) {
  'worklet';
  return count > 0 ? ((index % count) + count) % count : 0;
}

export function overviewCardLayout(width: number, height: number, count: number) {
  const columns = width < 360 ? 2 : 3;
  const cardWidth = Math.max(1, (width - 28 - (columns - 1) * 8) / columns);
  const rows = Math.max(1, Math.ceil(count / columns));
  const fittingHeight = (height - 138 - (rows - 1) * 8) / rows;
  return { columns, cardWidth, cardHeight: Math.max(150, Math.min(220, cardWidth * 1.7, fittingHeight)) };
}


/** Keep a populated window visible until React has committed the next mounted card range. */
export function visibleDeckProgress(progress: number, mountedWindow: number) {
  'worklet';
  return Math.max(mountedWindow - 0.49, Math.min(mountedWindow + 1.49, progress));
}
