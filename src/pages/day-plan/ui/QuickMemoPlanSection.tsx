import { forwardRef, useCallback, useEffect, useRef, useState, type ForwardedRef } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import type { DayPlanQuickMemo } from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import {
  colorHexUsesLightInk,
  loadPostItFaceColorIdForGroup,
  loadPostItInkColorIdForGroup,
  QUICK_MEMO_POST_IT_INK_KEY,
  QUICK_MEMO_POST_IT_KEY,
  resolvePostItFaceColor,
  resolvePostItInkHex,
  resolvePostItInkMuted,
  savePostItFaceColorForGroup,
  savePostItInkColorForGroup,
  type PostItFaceColorId,
  type PostItInkColorId,
} from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { ColorPaletteAccordion } from '@shared/ui/color-palette-accordion';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { PostItFaceColorChips } from '@shared/ui/post-it-face-color-chips';
import { PostItInkColorChips } from '@shared/ui/post-it-ink-color-chips';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

/** 투두 휴지통·액션 버튼과 동일 솔리드 음영 */
const ACTION_SHADOW = 1;
const ACTION_SOFT_SHADOW_LIGHT = 'rgba(0, 0, 0, 0.12)';
const ACTION_SOFT_SHADOW_DARK = 'rgba(255, 255, 255, 0.12)';
/** 모드 아이콘(PlanModeSwitch)과 동일 톤 */
const CARD_SHADOW_LIGHT = 'rgba(24, 26, 46, 0.22)';
const CARD_SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';
const CARD_SHADOW_OFFSET = 2;

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
  onSavePress: () => void;
  /** 면색·글자색 변경 시 Live Activity 재동기화 */
  onFaceColorChange?: () => void;
};

export const QuickMemoPlanSection = forwardRef(function QuickMemoPlanSection(
  { c, isDark, memos, draft, onChangeDraft, onSavePress, onFaceColorChange }: Props,
  ref: ForwardedRef<TextInput>,
) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

  const bottomTabBarHeight = useBottomTabBarHeight();
  const hydratedRef = useRef(false);
  const pill = tabPillColors(isDark);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [faceColorId, setFaceColorId] = useState<PostItFaceColorId>(() =>
    loadPostItFaceColorIdForGroup(QUICK_MEMO_POST_IT_KEY),
  );
  const [inkColorId, setInkColorId] = useState<PostItInkColorId>(() =>
    loadPostItInkColorIdForGroup(QUICK_MEMO_POST_IT_INK_KEY),
  );

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

  const faceBg = resolvePostItFaceColor(faceColorId, isDark);
  const faceInk = resolvePostItInkHex(inkColorId, faceColorId, isDark);
  const faceMuted = resolvePostItInkMuted(faceInk);
  /** 글자색이 밝으면(화이트 계열) 아코디언 크롬도 밝은 톤 */
  const chromeIsLightInk = !colorHexUsesLightInk(faceInk);

  const onSelectFaceColor = useCallback(
    (id: PostItFaceColorId) => {
      setFaceColorId(id);
      savePostItFaceColorForGroup(QUICK_MEMO_POST_IT_KEY, id);
      onFaceColorChange?.();
    },
    [onFaceColorChange],
  );

  const onSelectInkColor = useCallback(
    (id: PostItInkColorId) => {
      setInkColorId(id);
      savePostItInkColorForGroup(QUICK_MEMO_POST_IT_INK_KEY, id);
      onFaceColorChange?.();
    },
    [onFaceColorChange],
  );

  const fontSize = width >= 768 ? 26 : width >= 390 ? 22 : 20;
  const lineHeight = Math.round(fontSize * 1.45);
  const footerBottomPad =
    keyboardInset > 0 ? Math.max(12, keyboardInset - bottomTabBarHeight + 8) : 12;

  return (
    <PostItCardShell
      // 테이프는 밝은 마스킹 톤 고정 — 어두운 면색에서도 위쪽 테이프가 보이게
      isDark={false}
      faceColor={faceBg}
      solidShadow
      shadowColor={isDark ? CARD_SHADOW_DARK : CARD_SHADOW_LIGHT}
      shadowOffset={CARD_SHADOW_OFFSET}
      style={styles.shell}
      contentStyle={styles.root}>
      <ColorPaletteAccordion ink={faceInk} isDark={isDark || chromeIsLightInk} defaultExpanded={false}>
        <View style={styles.colorBlock}>
          <ThemedText style={[styles.colorLabel, { color: faceMuted }]} numberOfLines={1}>
            {t('dayPlan.quickMemoFaceColorLabel')}
          </ThemedText>
          <PostItFaceColorChips
            selectedId={faceColorId}
            isDark={isDark}
            ink={faceInk}
            onSelect={onSelectFaceColor}
            compact
            collapsible={false}
          />
          <ThemedText style={[styles.colorLabel, { color: faceMuted }]} numberOfLines={1}>
            {t('dayPlan.quickMemoInkColorLabel')}
          </ThemedText>
          <PostItInkColorChips
            selectedId={inkColorId}
            chromeInk={faceInk}
            onSelect={onSelectInkColor}
          />
        </View>
      </ColorPaletteAccordion>

      <ThemedTextInput
        key={`quick-memo-ink-${inkColorId}-${faceInk}`}
        ref={ref}
        value={draft}
        onChangeText={onChangeDraft}
        placeholder={t('dayPlan.quickMemoPlaceholder')}
        placeholderTextColor={faceMuted}
        multiline
        scrollEnabled
        textAlignVertical="top"
        autoFocus
        style={[
          styles.zenInput,
          {
            backgroundColor: 'transparent',
            color: faceInk,
            fontSize,
            lineHeight,
          },
        ]}
      />
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
    </PostItCardShell>
  );
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  root: {
    flex: 1,
    minHeight: 0,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 0,
  },
  colorBlock: {
    gap: 8,
    paddingBottom: 8,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 2,
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
  saveShell: {
    marginTop: 12,
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
