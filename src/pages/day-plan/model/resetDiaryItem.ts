import { applyTheme, type ThemeSlot } from './diaryTheme';
import { applyHeroDiaryClip } from './heroDiaryClip';
import { applyHeroTrashBinStyle } from './heroTrashBinStyle';
import { applyHeroCameraStyle } from './heroCameraStyle';
import { applyHeroPhotoWall } from './heroPhotoWall';

/** Restore the four built-in controls; optional decorations have no fallback. */
export function resetDiaryItem(category: ThemeSlot) {
  switch (category) {
    case 'clip': return applyHeroDiaryClip('blue');
    case 'trash': return applyHeroTrashBinStyle('mesh');
    case 'camera': return applyHeroCameraStyle('mini-evo');
    case 'photoWall': return applyHeroPhotoWall('none');
    default: return applyTheme(null, category);
  }
}
