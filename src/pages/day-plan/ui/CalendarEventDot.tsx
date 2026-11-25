import { View } from 'react-native';

export function CalendarEventDot({ date, visible, color, size = 4, outline }: {
  date: string; visible: boolean; color: string; size?: number; outline?: string;
}) {
  return <View pointerEvents="none" style={{ height: size + 2, alignSelf: 'center', flexShrink: 0 }}>
    {visible && <View testID={`calendar-event-dot-${date}`} style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      borderWidth: outline ? 0.6 : 0, borderColor: outline,
    }} />}
  </View>;
}
