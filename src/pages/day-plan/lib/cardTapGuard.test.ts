import { createCardTapGuard } from './cardTapGuard';
it('opens a stationary tap and tolerates slight finger jitter', () => {
 const guard = createCardTapGuard();
 guard.start(100, 100); guard.move(103, 104);
 expect(guard.canOpen()).toBe(true);
});
it('never opens after a swipe, including a swipe that returns to its starting point', () => {
 const guard = createCardTapGuard();
 guard.start(100, 100); guard.move(150, 100); guard.move(100, 100);
 expect(guard.canOpen()).toBe(false);
 guard.start(100, 100);
 expect(guard.canOpen()).toBe(true);
});
it('rejects vertical drags, a moved release without intermediate events, and cancelled touches', () => {
 const guard = createCardTapGuard();
 guard.start(100, 100); guard.move(100, 140);
 expect(guard.canOpen()).toBe(false);
 guard.start(100, 100); guard.cancel();
 expect(guard.canOpen()).toBe(false);
 guard.start(100, 100, 2);
 expect(guard.canOpen()).toBe(false);
});
