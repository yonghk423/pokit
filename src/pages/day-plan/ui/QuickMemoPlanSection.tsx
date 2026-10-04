import { forwardRef, useEffect, useRef, useState, type ForwardedRef } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import type { DayPlanQuickMemo } from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

/** 투두 휴지통·액션 버튼과 동일 솔리드 음영 */
const ACTION_SHADOW = 1;
const ACTION_SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const ACTION_SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
  onSavePress: () => void;
};

export const QuickMemoPlanSection = forwardRef(function QuickMemoPlanSection(
  { c, isDark, memos, draft, onChangeDraft, onSavePress }: Props,
  ref: ForwardedRef<TextInput>,
) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

  const bottomTabBarHeight = useBottomTabBarHeight();
  const hydratedRef = useRef(false);
  const pill = tabPillColors(isDark);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (draft.trim().length > 0) {
      hydratedRef.current = true;
      return;
    }
    const undone = memos
      .filter((m) => !m.isDone)
      .map((m) => m.text.trim())
      .filter((t) => t.length > 0);
    if (undone.length === 0) {
      hydratedRef.current = true;
      return;
    }
    onChangeDraft(undone.join('\n'));
    hydratedRef.current = true;
  }, [draft, memos, onChangeDraft]);

  const fontSize = width >= 768 ? 26 : width >= 390 ? 22 : 20;
  const lineHeight = Math.round(fontSize * 1.45);
  const footerBottomPad =
    keyboardInset > 0 ? Math.max(12, keyboardInset - bottomTabBarHeight + 8) : 12;

  return (
    <View style={[styles.root, { backgroundColor: c.containerLowest }]}>
      <ThemedTextInput
        ref={ref}
        value={draft}
        onChangeText={onChangeDraft}
        placeholder={t('dayPlan.quickMemoPlaceholder')}
        placeholderTextColor={c.outline}
        multiline
        scrollEnabled
        textAlignVertical="top"
        autoFocus
        style={[
          styles.zenInput,
          {
            backgroundColor: 'transparent',
            color: c.onSurface,
            fontSize,
            lineHeight,
          },
        ]}
      />
      <View style={styles.gradientHint} />
      <View
        style={[
          styles.saveShell,
          {
            marginRight: ACTION_SHADOW,
            marginBottom: ACTION_SHADOW + footerBottomPad,
          },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.saveShadow,
            {
              backgroundColor: isDark ? ACTION_SOFT_SHADOW_DARK : ACTION_SOFT_SHADOW_LIGHT,
              transform: [{ translateX: ACTION_SHADOW }, { translateY: ACTION_SHADOW }],
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dayPlan.quickMemoSaveA11y')}
          hitSlop={8}
          onPress={onSavePress}
          style={[styles.saveBtn, { backgroundColor: pill.activeBg }]}>
          <IconSymbol name="square.and.arrow.down" size={22} color={pill.activeIcon} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  zenInput: {
    flex: 1,
    minHeight: 120,
    alignSelf: 'stretch',
    padding: 0,
    margin: 0,
    fontWeight: '500',
    borderWidth: 0,
  },
  gradientHint: {
    height: 4,
    borderRadius: 0,
    marginTop: 12,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  saveShell: {
    marginTop: 18,
    alignSelf: 'stretch',
    position: 'relative',
  },
  saveShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  saveBtn: {
    alignSelf: 'stretch',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
