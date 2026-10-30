import { Pressable, View } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HeroPhotoEntryIcon } from './HeroPhotoEntryIcon';
import { HeroSceneEntryIcon } from './HeroSceneEntryIcon';

export function HeroEntryActions({ ink, onPhoto, onScenes, compact = false }: { ink: string; onPhoto: () => void; onScenes: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  return <View style={{ flexDirection: 'row', gap: compact ? 4 : 8 }}>
    <Pressable testID="comic-empty-photo-add" accessibilityRole="button" accessibilityLabel={t('comicDay.photo.choose')} onPress={() => { tapHaptic(); onPhoto(); }} style={{ width: compact ? 40 : 52, height: compact ? 36 : 52, alignItems: 'center', justifyContent: 'center' }}><View pointerEvents="none" style={{ transform: [{ scale: compact ? 0.58 : 0.68 }] }}><HeroPhotoEntryIcon ink={ink} /></View></Pressable>
    <Pressable testID="comic-empty-scene-add" accessibilityRole="button" accessibilityLabel={t('comicDay.photo.tab.existing')} onPress={() => { tapHaptic(); onScenes(); }} style={{ width: compact ? 40 : 52, height: compact ? 36 : 52, alignItems: 'center', justifyContent: 'center' }}><View pointerEvents="none" style={{ transform: [{ scale: compact ? 0.58 : 0.68 }] }}><HeroSceneEntryIcon ink={ink} /></View></Pressable>
  </View>;
}
