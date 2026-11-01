import { Pressable } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ThemedText } from '@shared/ui/themed-text';

export function HeroCharacterNameButton({ name, ink, onPress, fontSize = 17, lineHeight = 23 }: {
  name: string; ink: string; onPress: () => void; enabled?: boolean; fontSize?: number; lineHeight?: number;
}) {
  const { t } = useTranslation();
  return <Pressable testID="comic-character-name-button" accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')}
    onPress={() => { tapHaptic(); onPress(); }} style={{ flexShrink: 1, maxWidth: '100%', justifyContent: 'center' }}>
    <ThemedText numberOfLines={1} style={{ color: ink, fontSize, lineHeight }}>{name}</ThemedText>
  </Pressable>;
}
