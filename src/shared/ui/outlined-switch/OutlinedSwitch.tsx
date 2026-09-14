import { Platform, StyleSheet, Switch, View, type SwitchProps } from 'react-native';

import { useNoteSurfaceColors, useUiSurfacePresentation } from '@shared/ui/presentation';

const TRACK_ON = '#000000';
const TRACK_OFF = 'rgba(0,0,0,0.28)';
const TRACK_OFF_LIGHT_INK = 'rgba(255,255,255,0.32)';

/** 노트·크림 면에서 iOS 꺼짐 토글이 묻히지 않게 음영으로 윤곽을 낸다. */
export function OutlinedSwitch({
  trackColor,
  thumbColor,
  ios_backgroundColor,
  style,
  ...rest
}: SwitchProps) {
  const isNote = useUiSurfacePresentation() === 'note';
  const noteColors = useNoteSurfaceColors();
  const lightInk = isNote && noteColors?.usesLightInk === true;
  const offTrack = lightInk ? TRACK_OFF_LIGHT_INK : TRACK_OFF;

  return (
    <View
      style={[
        styles.frame,
        lightInk
          ? styles.shadowLightInk
          : Platform.OS === 'android'
            ? styles.shadowAndroid
            : styles.shadow,
      ]}>
      <Switch
        {...rest}
        style={style}
        trackColor={{ false: trackColor?.false ?? offTrack, true: trackColor?.true ?? TRACK_ON }}
        thumbColor={thumbColor ?? '#FFFFFF'}
        ios_backgroundColor={ios_backgroundColor ?? offTrack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 20,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
  },
  shadowAndroid: {
    elevation: 3,
  },
  shadowLightInk: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 4,
  },
});
