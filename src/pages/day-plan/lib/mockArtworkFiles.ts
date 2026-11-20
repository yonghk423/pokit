/** Fresh names prevent reuse of previous Pinterest and AI portrait caches. */
export function mockArtworkFileName(sceneId: string, _generatedPortrait: boolean): string {
  return `selected-unsplash-v2-${sceneId.slice(3)}.webp`;
}

/** Recognize only former bundled fixtures, including paths from an older iOS container. */
export function previousMockArtworkSceneId(uri: string): string | undefined {
  const match = /\/hero-photos\/(?:photo-|selected-v[12]-|selected-ai-v1-|selected-unsplash-v1-)([a-z0-9-]+)\.(?:webp|jpg)$/.exec(uri);
  return match ? `p6-${match[1]}` : undefined;
}

export function generatedMockPortraitName(uri: string): string | undefined {
  const id = previousMockArtworkSceneId(uri);
  return id && /^p6-(?:\d{2}-[a-z-]+|extra-\d{2})$/.test(id) ? mockArtworkFileName(id, true) : undefined;
}
