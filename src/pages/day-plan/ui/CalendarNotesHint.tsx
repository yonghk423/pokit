import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

export function CalendarNotesHint({ bottom, ink, paper, onOpen }: { bottom: number; ink: string; paper: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const label = t('comicCalendar.swipeUpForNotes');
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withRepeat(withTiming(-4, { duration: 350 }), 4, true, undefined, ReduceMotion.System);
  }, [lift]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onOpen}
    style={{ position: 'absolute', bottom, alignSelf: 'center', minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={motion}><View style={{ width: 9, height: 9, borderTopWidth: 2, borderLeftWidth: 2, borderColor: ink, transform: [{ rotate: '45deg' }] }} /></Animated.View>
    <ThemedText style={{ color: ink, fontSize: 15, lineHeight: 21, textShadowColor: paper, textShadowRadius: 2 }}>{label}</ThemedText>
  </Pressable>;
}
