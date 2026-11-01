/** Run deferred UI work when JS is idle, and prevent it from running after blur/unmount. */
export function scheduleIdleTask(work: () => void): { cancel: () => void } {
  let cancelled = false;
  const run = () => { if (!cancelled) work(); };
  if (typeof globalThis.requestIdleCallback === 'function') {
    const id = globalThis.requestIdleCallback(run, { timeout: 500 });
    return { cancel() { cancelled = true; globalThis.cancelIdleCallback?.(id); } };
  }
  const timer = setTimeout(run, 0);
  return { cancel() { cancelled = true; clearTimeout(timer); } };
}
