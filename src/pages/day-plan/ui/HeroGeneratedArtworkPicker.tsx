import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HeroAiLibraryImage } from '../lib/heroAiLibrary';
import type { ComicSceneId } from '../lib/heroSceneImages';
import { ComicScenePicker } from './HeroScenePicker';

/** All artwork sources share the same protagonist and collection navigation. */
export function HeroGeneratedArtworkPicker({ images, paper, onClose, onChoose, onChooseScene, initialCollectionId }: {
  images: HeroAiLibraryImage[]; ink: string; paper: string;
  initialCollectionId?: string; onChooseScene?: (scene: ComicSceneId) => void;
  onClose: () => void; onChoose: (image: HeroAiLibraryImage) => void;
}) {
  const insets = useSafeAreaInsets();
  const collection = initialCollectionId ?? (images[0]?.uri.includes('/hero-photos/') ? 'original-photos' : 'generated-illustrations');
  return <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: paper }}><ComicScenePicker embedded initialCollectionId={collection} scenes={[]} onChange={() => undefined} selectionPurpose="add" onSelectArtwork={onChoose} onSelectScene={onChooseScene} onClose={onClose} /></View>;
}
