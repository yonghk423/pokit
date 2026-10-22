/** Reference coordinates, ordered from the foreground into the stack. */
export function overlayCardPose(depth: number) {
  'worklet';
  const d = Math.max(-2, Math.min(2, depth));
  const distance = Math.abs(d);
  return {
    // Place the neighboring cards far enough out to reveal a small, balanced
    // paper edge on both sides of the foreground card.
    x: d * 0.72,
    y: distance * 8,
    scale: 1 - Math.min(1, distance) * 0.22,
    // Snapped scroll offsets land a hair off whole indices, so a hard cutoff at 1
    // hides one neighbor. Stay opaque through 1.1 and fade out by 1.5.
    opacity: Math.max(0, Math.min(1, (1.5 - distance) / 0.4)),
    contentOpacity: distance < 0.5 ? 1 : distance < 1.1 ? 0.72 : 0,
    zIndex: Math.round(30 - distance * 10),
  };
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
  const offsetY = (height - cardHeight) / 2 + 44;
  return { cardWidth, cardHeight, scale, offsetX, offsetY };
}

export function overlayDeckFrame(depth: number, width: number, height: number) {
  'worklet';
  const pose = overlayCardPose(depth);
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
