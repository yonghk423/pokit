import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useRef, useState, type ForwardedRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import type { DayPlanQuickMemo } from '@entities/day-plan';
import { parseQuickMemoChecklist, quickMemoPlainBody } from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { pickImageFromLibrary } from '@shared/lib/media/pickImageFromLibrary';
import {
  colorHexUsesLightInk,
  loadPostItFaceColorIdForGroup,
  loadPostItInkColorIdForGroup,
  loadQuickMemoLockPrefs,
  QUICK_MEMO_FONT_SIZE_OPTIONS,
  QUICK_MEMO_POST_IT_INK_KEY,
  QUICK_MEMO_POST_IT_KEY,
  resolvePostItFaceColor,
  resolvePostItInkHex,
  resolvePostItInkMuted,
  savePostItFaceColorForGroup,
  savePostItInkColorForGroup,
  updateQuickMemoLockPrefs,
  type PostItFaceColorId,
  type PostItInkColorId,
  type QuickMemoFontSizePt,
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

/** 모드 아이콘(PlanModeSwitch)과 동일 톤 */
const CARD_SHADOW_LIGHT = 'rgba(24, 26, 46, 0.22)';
const CARD_SHADOW_DARK = 'rgba(0, 0, 0, 0.45)';
const CARD_SHADOW_OFFSET = 2;
const TOOLBAR_BTN_BG = 'rgba(255, 255, 255, 0.42)';
const TOOLBAR_BTN_BORDER = 'rgba(0, 0, 0, 0.12)';
const TOOLBAR_BTN_ACTIVE_BG = 'rgba(0, 0, 0, 0.10)';
const FAB_GAP = 8;
const FAB_SIZE = 40;
/** 메모 본문 가로 여백. 잠금 버튼은 이 여백을 뺀 영역이 아니라 메모지 전체 가운데에 둔다. */
const MEMO_PAD_H = 14;

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  memos: DayPlanQuickMemo[];
  draft: string;
  onChangeDraft: (v: string) => void;
  onSavePress: () => void;
  /** 면색·글자색·잠금 옵션 변경 시 Live Activity 재동기화 */
  onFaceColorChange?: () => void;
};

/** 예전 `[ ]` / `[x]` 마커가 남은 드래프트를 본문만 남긴다. */
function plainDraftFromStored(raw: string): string {
  if (!/^\s*\[[ xX]\]/.test(raw)) return raw;
  return quickMemoPlainBody(parseQuickMemoChecklist(raw));
}

export const QuickMemoPlanSection = forwardRef(function QuickMemoPlanSection(
  { isDark, memos, draft, onChangeDraft, onSavePress, onFaceColorChange }: Props,
  ref: ForwardedRef<TextInput>,
) {
  const { t } = useTranslation();

  const bottomTabBarHeight = useBottomTabBarHeight();
  const hydratedRef = useRef(false);
  const inputRef = useRef<TextInput | null>(null);
  const keyboardInsetRef = useRef(0);
  const pill = tabPillColors(isDark);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [faceColorId, setFaceColorId] = useState<PostItFaceColorId>(() =>
    loadPostItFaceColorIdForGroup(QUICK_MEMO_POST_IT_KEY),
  );
  const [inkColorId, setInkColorId] = useState<PostItInkColorId>(() =>
    loadPostItInkColorIdForGroup(QUICK_MEMO_POST_IT_INK_KEY),
  );
  const [fontSizePt, setFontSizePt] = useState<QuickMemoFontSizePt>(
    () => loadQuickMemoLockPrefs().fontSizePt,
  );
  const [showCalendar, setShowCalendar] = useState(
    () => loadQuickMemoLockPrefs().showCalendar,
  );
  const [photoUri, setPhotoUri] = useState<string | null>(
    () => loadQuickMemoLockPrefs().photoUri,
  );
  const [draftContentHeight, setDraftContentHeight] = useState(120);
  const [fabOpen, setFabOpen] = useState(false);
  const [fontPanelOpen, setFontPanelOpen] = useState(false);
  const fabProgress = useRef(new Animated.Value(0)).current;
  const fontProgress = useRef(new Animated.Value(0)).current;
  const photoPresence = useRef(new Animated.Value(photoUri ? 1 : 0)).current;
  const photoClearingRef = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardInsetRef.current = event.endCoordinates.height;
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardInsetRef.current = 0;
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
      const plain = plainDraftFromStored(draft);
      if (plain !== draft) onChangeDraft(plain);
      hydratedRef.current = true;
      return;
    }
    const undone = memos
      .filter((m) => !m.isDone)
      .map((m) => m.text.trim())
      .filter((text) => text.length > 0);
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

  const persistPrefs = useCallback(
    (patch: {
      fontSizePt?: QuickMemoFontSizePt;
      showCalendar?: boolean;
      photoUri?: string | null;
    }) => {
      updateQuickMemoLockPrefs(patch);
      onFaceColorChange?.();
    },
    [onFaceColorChange],
  );

  const animateFontPanel = useCallback(
    (open: boolean) => {
      setFontPanelOpen(open);
      Animated.timing(fontProgress, {
        toValue: open ? 1 : 0,
        duration: open ? 320 : 220,
        easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [fontProgress],
  );

  const animateFab = useCallback(
    (open: boolean) => {
      setFabOpen(open);
      if (open) animateFontPanel(false);
      Animated.timing(fabProgress, {
        toValue: open ? 1 : 0,
        duration: open ? 320 : 240,
        easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [animateFontPanel, fabProgress],
  );

  const toggleFontPanel = useCallback(() => {
    const next = !fontPanelOpen;
    if (next) animateFab(false);
    animateFontPanel(next);
    void Haptics.selectionAsync();
  }, [animateFab, animateFontPanel, fontPanelOpen]);

  const retainEditorKeyboard = useCallback(() => {
    if (keyboardInsetRef.current <= 0) return;
    inputRef.current?.focus();
  }, []);

  const onSelectFontSize = useCallback(
    (pt: QuickMemoFontSizePt) => {
      setFontSizePt(pt);
      persistPrefs({ fontSizePt: pt });
      animateFontPanel(false);
      void Haptics.selectionAsync();
    },
    [animateFontPanel, persistPrefs],
  );

  const onToggleCalendar = useCallback(() => {
    setShowCalendar((prev) => {
      const next = !prev;
      persistPrefs({ showCalendar: next });
      return next;
    });
    void Haptics.selectionAsync();
  }, [persistPrefs]);

  const onPickPhoto = useCallback(async () => {
    const result = await pickImageFromLibrary();
    if (!result.ok) {
      if (result.reason === 'permission_denied') {
        Alert.alert(
          t('dayPlan.quickMemoPhotoPermissionTitle'),
          t('dayPlan.quickMemoPhotoPermissionMessage'),
        );
      } else if (result.reason === 'error' || result.reason === 'module_unavailable') {
        Alert.alert(
          t('dayPlan.quickMemoPhotoFailedTitle'),
          t('dayPlan.quickMemoPhotoFailedMessage'),
        );
      }
      return;
    }
    photoClearingRef.current = false;
    photoPresence.setValue(1);
    setPhotoUri(result.uri);
    persistPrefs({ photoUri: result.uri });
    void Haptics.selectionAsync();
  }, [persistPrefs, photoPresence, t]);

  const onClearPhoto = useCallback(() => {
    if (!photoUri || photoClearingRef.current) return;
    photoClearingRef.current = true;
    void Haptics.selectionAsync();
    Animated.timing(photoPresence, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        photoClearingRef.current = false;
        return;
      }
      setPhotoUri(null);
      persistPrefs({ photoUri: null });
      photoClearingRef.current = false;
    });
  }, [persistPrefs, photoPresence, photoUri]);

  const lineHeight = Math.round(fontSizePt * 1.35);
  const footerBottomPad =
    keyboardInset > 0 ? Math.max(12, keyboardInset - bottomTabBarHeight + 8) : 12;
  const fabBottom = footerBottomPad + 12;
  /** 카드 아래로 키패드가 덮는 높이. 이만큼 스크롤 영역을 줄여 본문을 위로 밀 수 있게 한다. */
  const keyboardOverlap =
    keyboardInset > 0 ? Math.max(0, keyboardInset - bottomTabBarHeight) : 0;

  const setInputRef = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const toolBtn = (label: string, icon: string, onPress: () => void, active = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPressIn={retainEditorKeyboard}
      onPress={onPress}
      style={[
        styles.toolBtn,
        {
          borderColor: active ? 'rgba(0,0,0,0.35)' : TOOLBAR_BTN_BORDER,
          backgroundColor: active ? TOOLBAR_BTN_ACTIVE_BG : TOOLBAR_BTN_BG,
        },
      ]}>
      <IconSymbol name={icon} size={18} color="#111111" />
    </Pressable>
  );

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

      <ScrollView
        style={[styles.memoScroll, { marginBottom: keyboardOverlap }]}
        contentContainerStyle={styles.memoBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        {photoUri ? (
          <Animated.View
            pointerEvents={photoClearingRef.current ? 'none' : 'auto'}
            style={[
              styles.photoWrap,
              {
                opacity: photoPresence,
                height: photoPresence.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 112],
                }),
                marginBottom: photoPresence.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ]}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photo}
              contentFit="contain"
              transition={120}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('dayPlan.quickMemoPhotoRemoveA11y')}
              hitSlop={8}
              onPress={onClearPhoto}
              style={[styles.photoRemove, { backgroundColor: pill.activeBg }]}>
              <IconSymbol name="xmark" size={14} color={pill.activeIcon} />
            </Pressable>
          </Animated.View>
        ) : null}

        <ThemedTextInput
          key={`quick-memo-ink-${inkColorId}-${faceInk}`}
          ref={setInputRef}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder={t('dayPlan.quickMemoPlaceholder')}
          placeholderTextColor={faceMuted}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          autoFocus
          onContentSizeChange={(event) => {
            const next = Math.ceil(event.nativeEvent.contentSize.height);
            setDraftContentHeight((prev) => (Math.abs(prev - next) < 2 ? prev : next));
          }}
          style={[
            styles.zenInput,
            {
              backgroundColor: 'transparent',
              color: faceInk,
              fontSize: fontSizePt,
              lineHeight,
              minHeight: Math.max(lineHeight + 8, draftContentHeight),
            },
          ]}
        />
        <Pressable style={styles.inputFill} onPress={() => inputRef.current?.focus()} />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('studyNote.toolbarDismissKeyboard')}
        hitSlop={8}
        onPress={() => {
          void Haptics.selectionAsync();
          Keyboard.dismiss();
        }}
        style={[
          styles.fabFace,
          styles.keyboardDismissFab,
          styles.keyboardDismissFabPlain,
          {
            bottom: fabBottom,
          },
        ]}>
        <IconSymbol name="keyboard.chevron.compact.down" size={22} color={faceInk} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.quickMemoSaveA11y')}
        hitSlop={8}
        onPress={onSavePress}
        style={[
          styles.fabFace,
          styles.saveFab,
          {
            bottom: fabBottom,
            backgroundColor: '#000000',
          },
        ]}>
        <IconSymbol
          name="square.and.arrow.down"
          size={18}
          color={RetroFlatColors.light.bgMint}
          weight="semibold"
        />
      </Pressable>

      <Animated.View
        pointerEvents={fabOpen ? 'auto' : 'none'}
        style={[
          styles.toolbarFloat,
          {
            right: 12,
            bottom: fabBottom + FAB_SIZE + FAB_GAP,
            opacity: fabProgress,
            transform: [
              {
                translateY: fabProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.stack}>
          <View style={styles.stackRow}>
            {toolBtn(
              photoUri
                ? t('dayPlan.quickMemoPhotoRemoveA11y')
                : t('dayPlan.quickMemoPhotoAddA11y'),
              'photo.on.rectangle.angled',
              () => {
                if (photoUri) onClearPhoto();
                else void onPickPhoto();
              },
              Boolean(photoUri),
            )}
            {toolBtn(
              t('dayPlan.quickMemoCalendarA11y'),
              'calendar',
              onToggleCalendar,
              showCalendar,
            )}
          </View>
        </View>
      </Animated.View>

      {/* 글자 크기 전용 float — 메인(+) FAB와 분리, 열릴 때 fade+slide */}
      <Animated.View
        pointerEvents={fontPanelOpen ? 'auto' : 'none'}
        style={[
          styles.fontFloatPanel,
          {
            right: 12 + FAB_SIZE + FAB_GAP,
            bottom: fabBottom + FAB_SIZE + FAB_GAP,
            opacity: fontProgress,
            transform: [
              {
                translateY: fontProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
              {
                scale: fontProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1],
                }),
              },
            ],
          },
        ]}>
        {QUICK_MEMO_FONT_SIZE_OPTIONS.map((pt) => {
          const selected = pt === fontSizePt;
          return (
            <Pressable
              key={pt}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('dayPlan.quickMemoFontSizeA11y', { pt })}
              onPressIn={retainEditorKeyboard}
              onPress={() => onSelectFontSize(pt)}
                style={[
                  styles.fontChip,
                  {
                    borderColor: selected ? 'rgba(0,0,0,0.35)' : TOOLBAR_BTN_BORDER,
                    backgroundColor: selected ? TOOLBAR_BTN_ACTIVE_BG : TOOLBAR_BTN_BG,
                  },
                ]}>
                <ThemedText style={styles.fontChipText}>{pt}</ThemedText>
              </Pressable>
            );
          })}
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dayPlan.quickMemoFontSizeLabel')}
        accessibilityState={{ expanded: fontPanelOpen }}
        onPressIn={retainEditorKeyboard}
        onPress={toggleFontPanel}
        style={[
          styles.fabFace,
          styles.fabDock,
          styles.fontFab,
          {
            bottom: fabBottom,
            backgroundColor: fontPanelOpen ? '#111111' : RetroFlatColors.light.bgMint,
          },
        ]}>
        <ThemedText
          style={[styles.fontFabLabel, { color: fontPanelOpen ? '#FFFFFF' : '#000000' }]}>
          {fontSizePt}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          fabOpen ? t('studyNote.toolbarFabCloseA11y') : t('dayPlan.quickMemoToolsFabA11y')
        }
        onPressIn={retainEditorKeyboard}
        onPress={() => {
          void Haptics.selectionAsync();
          animateFab(!fabOpen);
        }}
        style={[
          styles.fabFace,
          styles.fabDock,
          {
            bottom: fabBottom,
            backgroundColor: RetroFlatColors.light.bgMint,
          },
        ]}>
        <View style={styles.fabIconSlot}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fabIconLayer,
              {
                opacity: fabProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [
                  {
                    rotate: fabProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    }),
                  },
                ],
              },
            ]}>
            <IconSymbol name="plus" size={16} color="#000000" />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fabIconLayer,
              {
                opacity: fabProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [
                  {
                    rotate: fabProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-90deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}>
            <IconSymbol name="xmark" size={16} color="#000000" />
          </Animated.View>
        </View>
      </Pressable>
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
    paddingHorizontal: MEMO_PAD_H,
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
  memoScroll: {
    flex: 1,
    minHeight: 0,
  },
  memoBody: {
    flexGrow: 1,
    gap: 8,
    paddingBottom: FAB_SIZE + 28,
  },
  inputFill: {
    flexGrow: 1,
  },
  photoWrap: {
    width: '100%',
    height: 112,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zenInput: {
    alignSelf: 'stretch',
    padding: 0,
    margin: 0,
    fontWeight: '500',
    borderWidth: 0,
  },
  toolbarFloat: {
    position: 'absolute',
    zIndex: 11,
    elevation: 12,
    // 패널 면색 없음 — 버튼만 반투명으로 떠 있게
    backgroundColor: 'transparent',
  },
  stack: {
    alignItems: 'flex-end',
    gap: 4,
    alignSelf: 'flex-end',
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontFloatPanel: {
    position: 'absolute',
    zIndex: 13,
    elevation: 13,
    alignItems: 'stretch',
    gap: 3,
    backgroundColor: 'transparent',
  },
  fontChip: {
    width: 40,
    height: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111111',
  },
  fabFace: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabDock: {
    position: 'absolute',
    right: 12,
    zIndex: 12,
  },
  keyboardDismissFab: {
    position: 'absolute',
    left: 12,
    zIndex: 12,
  },
  keyboardDismissFabPlain: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveFab: {
    position: 'absolute',
    zIndex: 12,
    // left 50%는 패딩 안쪽 너비 기준이라 메모지보다 MEMO_PAD_H만큼 왼쪽으로 붙는다.
    left: '50%',
    marginLeft: -FAB_SIZE / 2 + MEMO_PAD_H,
  },
  fontFab: {
    right: 12 + FAB_SIZE + FAB_GAP,
  },
  fontFabLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  fabIconSlot: {
    width: 16,
    height: 16,
  },
  fabIconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
