import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { cityPopFont } from '@shared/config/retroFlat';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

export type ScrapTapeLabelTone = 'scrap' | 'masking';

export type ScrapTapeLabelProps = {
  /** 테이프 본문 */
  text: string;
  /** 본문 위 보조 (날짜 등) */
  caption?: string;
  isDark?: boolean;
  /**
   * scrap: 노란 면 + 검정 테두리 (기본)
   * masking: 흰 마스킹 테이프 (포스티 상단 테이프 톤)
   */
  tone?: ScrapTapeLabelTone;
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
 * `tone="masking"` 이면 흰 마스킹 테이프(테두리 없음·소프트 섀도우).
 */
export function ScrapTapeLabel({
  text,
  caption,
  isDark = false,
  tone = 'scrap',
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
  const isMasking = tone === 'masking';
  const face = isMasking
    ? isDark
      ? 'rgba(255,255,255,0.52)'
      : 'rgba(255,255,255,0.58)'
    : isDark
      ? 'rgba(255, 236, 179, 0.92)'
      : '#FFE8A8';
  const ink = isMasking
    ? isDark
      ? 'rgba(26,26,26,0.78)'
      : 'rgba(42,42,42,0.72)'
    : '#111111';
  const deg = flat ? 0 : rotateDeg;

  const body = (
    <View
      style={[
        styles.tape,
        isMasking && styles.tapeMasking,
        {
          backgroundColor: face,
          borderColor: isMasking ? 'transparent' : ink,
          borderWidth: isMasking ? 0 : 1.5,
          transform: [{ rotate: `${deg}deg` }],
        },
        !flat && (isMasking ? styles.tapeShadowSoft : styles.tapeShadow),
        style,
      ]}>
      {caption ? (
        <Text
          style={[styles.caption, isMasking && styles.captionMasking, { color: ink }, cityPopFont('700')]}
          numberOfLines={1}>
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
        <Text
          style={[styles.text, isMasking && styles.textMasking, { color: ink }, cityPopFont('800')]}
          numberOfLines={2}>
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
  tapeMasking: {
    paddingHorizontal: 6,
    paddingVertical: 3,
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
  /** 포스티 상단 마스킹 테이프 — soft drop */
  tapeShadowSoft: Platform.select({
    ios: {
      shadowColor: 'rgba(44,42,41,0.12)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 1,
    },
    android: { elevation: 1 },
    default: {},
  }) as ViewStyle,
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  captionMasking: {
    fontSize: 9,
    lineHeight: 11,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.3,
    textAlign: 'center',
    fontWeight: '800',
  },
  textMasking: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.2,
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
