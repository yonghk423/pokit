import { Pressable, View } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HeroPhotoEntryIcon } from './HeroPhotoEntryIcon';
import { HeroSceneEntryIcon } from './HeroSceneEntryIcon';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';

export function HeroEntryActions({ ink, onPhoto, onScenes, compact = false, photoActive = false, character = COMIC_CHARACTERS[0] }: { ink: string; onPhoto: () => void; onScenes: () => void; compact?: boolean; photoActive?: boolean; character?: ComicCharacter }) {
  const { t } = useTranslation();
  return <View style={{ flexDirection: 'row', gap: compact ? 4 : 8 }}>
    <Pressable testID="comic-empty-photo-add" accessibilityRole="button" accessibilityState={{ selected: photoActive }} accessibilityLabel={t('comicDay.photo.choose')} onPress={() => { tapHaptic(); onPhoto(); }} style={{ width: compact ? 40 : 52, height: compact ? 36 : 52, alignItems: 'center', justifyContent: 'center' }}><View pointerEvents="none" style={{ transform: [{ scale: compact ? 0.58 : 0.68 }] }}><HeroPhotoEntryIcon ink={ink} selected={photoActive} /></View></Pressable>
    <Pressable testID="comic-empty-scene-add" accessibilityRole="button" accessibilityState={{ selected: !photoActive }} accessibilityLabel={t('comicDay.photo.tab.existing')} onPress={() => { tapHaptic(); onScenes(); }} style={{ width: compact ? 40 : 52, height: compact ? 36 : 52, alignItems: 'center', justifyContent: 'center' }}><View pointerEvents="none" style={{ transform: [{ scale: compact ? 0.58 : 0.68 }] }}><HeroSceneEntryIcon ink={ink} character={character} selected={!photoActive} /></View></Pressable>
  </View>;
}
