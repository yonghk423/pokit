import type { PolaroidDraft } from '../ui/HeroPolaroidEditor';
import type { ComicDayScene } from './heroDayStorage';
import { saveHeroOriginalPhoto } from './heroOriginalPhoto';

export async function applyPolaroidDraft(draft: PolaroidDraft, originalUri?: string): Promise<Partial<ComicDayScene>> {
  const { processedUri, ...settings } = draft;
  let artworkUri = originalUri;
  if (processedUri) {
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const fs = await import('expo-file-system/legacy');
    const rendered = await manipulateAsync(processedUri, [], { format: SaveFormat.JPEG, compress: 0.9 });
    try { artworkUri = await saveHeroOriginalPhoto(rendered.uri, 'edited.jpg'); }
    finally { await fs.deleteAsync(rendered.uri, { idempotent: true }).catch(() => undefined); }
  }
  return { title: draft.title, memo: draft.memo ?? '', ...(draft.pen ? { pen: draft.pen } : {}), ...(draft.fontId ? { fontId: draft.fontId } : {}), artworkUri, originalArtworkUri: originalUri, polaroidSettings: settings };
}
