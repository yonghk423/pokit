import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { cityPopFont } from '@shared/config/retroFlat';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

export type ScrapTapeLabelProps = {
  /** 테이프 본문 */
  text: string;
  /** 본문 위 보조 (날짜 등) */
  caption?: string;
  isDark?: boolean;
  /** 살짝 기운 각도 */
  rotateDeg?: number;
  onPress?: () => void;
  /** true면 텍스트 직접 입력 */
  editable?: boolean;
  onChangeText?: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** 펼침 등 — 그림자·기울기 완화 */
  flat?: boolean;
};

/**
 * 루틴 탭 스크랩 테이프와 동일 톤 — 노란 면 + 검정 테두리 + solid 모서리.
 */
export function ScrapTapeLabel({
  text,
  caption,
  isDark = false,
  rotateDeg = -1.5,
  onPress,
  editable = false,
  onChangeText,
  placeholder,
  maxLength = 40,
  accessibilityLabel,
  style,
  flat = false,
}: ScrapTapeLabelProps) {
  const face = isDark ? 'rgba(255, 236, 179, 0.92)' : '#FFE8A8';
  const ink = '#111111';
  const deg = flat ? 0 : rotateDeg;

  const body = (
    <View
      style={[
        styles.tape,
        {
          backgroundColor: face,
          borderColor: ink,
          transform: [{ rotate: `${deg}deg` }],
        },
        !flat && styles.tapeShadow,
        style,
      ]}>
      {caption ? (
        <Text style={[styles.caption, { color: ink }, cityPopFont('700')]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
      {editable ? (
        <ThemedTextInput
          value={text}
          onChangeText={onChangeText}
          placeholder={placeholder}
          maxLength={maxLength}
          style={[styles.input, { color: ink }, cityPopFont('800')]}
          placeholderTextColor="rgba(17,17,17,0.35)"
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        <Text style={[styles.text, { color: ink }, cityPopFont('800')]} numberOfLines={2}>
          {text}
        </Text>
      )}
    </View>
  );

  if (!onPress || editable) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      onPress={onPress}
      style={({ pressed }) => [pressed && !flat && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tape: {
    alignSelf: 'flex-start',
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderRadius: 0,
    alignItems: 'center',
    gap: 2,
  },
  /** 루틴 탭 createTape 와 같은 solid 오프셋 그림자 (약한 톤) */
  tapeShadow: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle,
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.3,
    textAlign: 'center',
    fontWeight: '800',
  },
  input: {
    minWidth: 88,
    maxWidth: 180,
    padding: 0,
    margin: 0,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  pressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
});
