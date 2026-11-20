import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { resolveAppFontFamily, useEffectiveAppFontId } from '@shared/lib/ui-font';

/** Lettering fits inside the existing 44pt touch target, even on narrow phones. */
export const HeroAppliedCalendarIcon = memo(function HeroAppliedCalendarIcon() {
  const fontId = useEffectiveAppFontId();
  const fontFamily = resolveAppFontFamily(fontId, '400');
  return <View pointerEvents="none" accessible={false} style={styles.root}>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={[styles.label, { fontFamily, fontWeight: '400' }]}>CALENDAR</Text>
    <View testID="calendar-return-arrow" style={styles.arrow}>
      <View style={styles.line} />
      <View style={styles.head} />
    </View>
  </View>;
});

const styles = StyleSheet.create({
  root: { width: 44, maxWidth: '100%', height: 32, justifyContent: 'center', alignItems: 'center' },
  // The parent button supplies the localized accessibility label. Treat this as
  // an icon: use the selected family without app or system font-size scaling.
  label: { width: '100%', color: '#393C34', fontSize: 8.5, lineHeight: 12, letterSpacing: 0.25, textAlign: 'center', flexShrink: 1 },
  arrow: { width: 24, height: 8, marginTop: 3, justifyContent: 'center' },
  line: { height: 1, width: 24, backgroundColor: '#393C34' },
  head: { position: 'absolute', left: 0, width: 5, height: 5, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#393C34', transform: [{ rotate: '45deg' }] },
});
