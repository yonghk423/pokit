import { Image, type ImageRef } from 'expo-image';
import { useEffect, useState } from 'react';

const sources = {
  board: require('../../../../assets/control-illustrations/clipboard-calendar-v2.webp'),
  cover: require('../../../../assets/store-previews/city-animation-couch.webp'),
  blue: require('../../../../assets/control-illustrations/blue-clipboard-clip.webp'),
  black: require('../../../../assets/control-illustrations/black-clipboard-clip.webp'),
};
type Artwork = Record<keyof typeof sources, ImageRef>;
// Only these four bundled products are retained, each decoded to at most 768px.
// This bounded set uses at most 9 MB of pixels; downloaded themes are not retained.
let ready: Artwork | null = null;
let pending: Promise<Artwork> | null = null;
function prepare() {
  if (ready) return Promise.resolve(ready);
  if (!pending) pending = Promise.all(Object.entries(sources).map(async ([key, source]) =>
    [key, await Image.loadAsync(source, { maxWidth: 768, maxHeight: 768 })] as const,
  )).then(entries => (ready = Object.fromEntries(entries) as Artwork)).catch(error => { pending = null; throw error; });
  return pending;
}
export function useStoreArtwork() {
  const [artwork, setArtwork] = useState(ready);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    prepare().then(value => { if (live) setArtwork(value); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [attempt]);
  return { artwork, failed, retry: () => { setFailed(false); setAttempt(value => value + 1); } };
}
