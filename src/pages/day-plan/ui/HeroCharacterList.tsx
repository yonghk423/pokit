import { useEffect } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { SELECTABLE_COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';

export function HeroCharacterList({ ink, muted, selectedId, onSelect, open }: {
  ink: string; muted: string; selectedId?: string; onSelect: (character: ComicCharacter) => void; open: boolean;
}) {
  const { t } = useTranslation();
  const reveal = useAnimatedValue(0);
  useEffect(() => {
    const animation = Animated.timing(reveal, { toValue: open ? 1 : 0, duration: open ? 220 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [open, reveal]);
  const circle = <Svg pointerEvents="none" width={36} height={36} viewBox="0 0 52 52" style={StyleSheet.absoluteFill}>
    <Path d="M26 2C12 1 2 12 2 26S12 50 26 50 50 40 50 26 40 2 26 2Z" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" />
  </Svg>;
  return <Animated.View testID="hero-header-character-list" pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[s.root, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) }] }]}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
      {SELECTABLE_COMIC_CHARACTERS.map(character => <Pressable key={character.id} testID={`hero-header-character-${character.id}`} accessibilityRole="button" accessibilityLabel={t('comicDay.character.choose', { name: t(character.name) })} accessibilityState={{ selected: selectedId === character.id }} onPress={() => onSelect(character)} style={s.item}>
        <View style={s.portrait}><Image source={character.cover} resizeMode="contain" style={s.image} />{circle}</View>
        <ThemedText style={[s.name, { color: ink }]}>{t(character.name)}</ThemedText>
      </Pressable>)}
      <View testID="hero-header-character-upcoming" accessible accessibilityLabel={t('comicDay.character.new') + ', ' + t('comicDay.character.soon')} style={s.item}>
        <View style={s.portrait}><Image source={require('../../../../assets/control-illustrations/coming-soon-coffee-walk.png')} resizeMode="contain" style={s.image} />{circle}</View>
        <ThemedText style={[s.name, { color: muted }]}>{t('comicDay.character.new')}</ThemedText>
        <ThemedText style={[s.status, { color: muted }]}>{t('comicDay.character.soon')}</ThemedText>
      </View>
    </ScrollView>
  </Animated.View>;
}
const s = StyleSheet.create({
  root: { position: 'absolute', left: 24, top: 2, width: 108, zIndex: 20 },
  list: { gap: 2 }, item: { width: 50, alignItems: 'center', gap: 1 },
  portrait: { width: 36, height: 36, padding: 4 }, image: { width: 28, height: 28, borderRadius: 14 },
  name: { fontSize: 10, lineHeight: 14 }, status: { fontSize: 9, lineHeight: 12 },
});
