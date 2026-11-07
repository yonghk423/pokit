import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { loadHeroOriginalPhotoLibrary } from '../lib/heroOriginalPhoto';
import { loadHeroAiLibrary, subscribeHeroAiLibrary, type HeroAiLibraryImage } from '../lib/heroAiLibrary';

export function useHeroGeneratedImages(original = false) {
  const [images, setImages] = useState<HeroAiLibraryImage[]>([]);
  useEffect(() => {
    let live = true, revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try { const values = await (original ? loadHeroOriginalPhotoLibrary() : loadHeroAiLibrary()); if (live && request === revision) setImages(values); } catch { /* Preserve the last device library on a temporary read failure. */ }
    };
    void refresh();
    const unsubscribe = subscribeHeroAiLibrary(() => { void refresh(); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { live = false; unsubscribe(); app.remove(); };
  }, [original]);
  return images;
}

