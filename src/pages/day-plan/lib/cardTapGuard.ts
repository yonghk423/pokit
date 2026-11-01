/** A touch that becomes a drag must never open the card, even if it returns to its start. */
export function createCardTapGuard(distance = 8) {
  let origin: { x: number; y: number } | null = null;
  let blocked = false;
  return {
    start(x: number, y: number, touches = 1) { origin = { x, y }; blocked = touches !== 1; },
    move(x: number, y: number, touches = 1) {
      if (touches > 1) blocked = true;
      if (origin && Math.hypot(x - origin.x, y - origin.y) > distance) blocked = true;
    },
    cancel() { blocked = true; },
    canOpen() { return !blocked; },
  };
}
