import { BASIC_STORE_THUMBNAILS } from './basicStoreThumbnails';
import { DIARY_CLIP_IMAGES } from '../model/heroDiaryClip';
import { Image, type ImageRef } from 'expo-image';
import { useEffect, useState } from 'react';

const sources = {
  legacyCover: require('../../../../assets/store-previews/city-animation-couch.webp'),
  trash: BASIC_STORE_THUMBNAILS['trash-mesh-empty'],
  board: require('../../../../assets/control-illustrations/clipboard-calendar-jet-black.webp'),
  cover: require('../../../../assets/store-previews/everyday-cinema-top-only.webp'),
  warmSepiaCover: require('../../../../assets/store-previews/warm-sepia-open-panel.webp'),
  texturedWatercolorCover: require('../../../../assets/store-previews/textured-watercolor.webp'),
  citypopRetroCover: require('../../../../assets/store-previews/citypop-retro.webp'),
  ...DIARY_CLIP_IMAGES,
  'blue': BASIC_STORE_THUMBNAILS['clip-blue'],
  'red': BASIC_STORE_THUMBNAILS['clip-red'],
  'black': BASIC_STORE_THUMBNAILS['clip-black'],
  'cherry-binder': BASIC_STORE_THUMBNAILS['clip-cherry-binder'],

};
type Artwork = Record<keyof typeof sources, ImageRef>;
// Retain the bounded bundled product set, decoded to at most 768px per edge.
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
