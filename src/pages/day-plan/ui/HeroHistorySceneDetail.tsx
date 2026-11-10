import { applyPolaroidDraft } from '../lib/applyPolaroidDraft';
import type { HeroCardText } from './HeroCardCaption';
import type { ImageSourcePropType } from 'react-native';
import type { ComicDayScene } from '../lib/heroDayStorage';
import { HeroImageActions } from './HeroImageActions';

/** History owns this detail; opening it never activates a diary on the main tab. */
export function HeroHistorySceneDetail({ scene, source, date, onClose, onDelete, onSaveText }: {
  scene: Pick<ComicDayScene, 'title' | 'memo'> & Partial<Pick<ComicDayScene, 'paper' | 'pen' | 'fontId' | 'artworkUri' | 'polaroidSettings' | 'originalArtworkUri'>>; source: ImageSourcePropType | undefined; date: number;
  onSaveText?: (text: HeroCardText & Partial<ComicDayScene>) => void; onClose: () => void; onDelete?: () => void;
}) {
  return <HeroImageActions initialDraft={scene.polaroidSettings} onSaveDraft={onSaveText ? async draft => { const fields = await applyPolaroidDraft(draft, scene.originalArtworkUri ?? scene.artworkUri); onSaveText({ ...fields, title: draft.title, memo: draft.memo ?? '' }); } : undefined} onDelete={onDelete} onSaveText={onSaveText} editorOnly onEditorClose={onClose} uri={scene.originalArtworkUri ?? scene.artworkUri} source={typeof source === 'number' ? source : undefined} title={scene.title} memo={scene.memo} paper={scene.paper} pen={scene.pen} fontId={scene.fontId} exportDate={date} />;
}
