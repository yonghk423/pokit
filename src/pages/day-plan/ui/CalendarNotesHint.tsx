import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

export function CalendarNotesHint({ edge = 'bottom', inset, ink, paper, onOpen }: { edge?: 'top' | 'bottom'; inset: number; ink: string; paper: string; onOpen: () => void }) {
  const { t } = useTranslation();
  const downward = edge === 'top';
  const label = t(downward ? 'comicCalendar.swipeDownForPlans' : 'comicCalendar.swipeUpForNotes');
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withRepeat(withTiming(downward ? 4 : -4, { duration: 350 }), 4, true, undefined, ReduceMotion.System);
  }, [downward, lift]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onOpen}
    style={{ position: 'absolute', [edge]: inset, backgroundColor: downward ? paper : undefined, borderRadius: downward ? 8 : undefined, flexDirection: downward ? 'column' : 'column-reverse', gap: 3, alignSelf: 'center', minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
    <ThemedText style={{ color: ink, fontSize: 15, lineHeight: 21, textShadowColor: paper, textShadowRadius: 2 }}>{label}</ThemedText>
    <Animated.View style={motion}><View style={{ width: 9, height: 9, borderTopWidth: 2, borderLeftWidth: 2, borderColor: ink, transform: [{ rotate: downward ? '225deg' : '45deg' }] }} /></Animated.View>
  </Pressable>;
}
