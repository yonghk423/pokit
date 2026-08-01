import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildTemplateDemoConfig, resolveCustomFlowTemplateCatalogEntry } from '@entities/day-plan';
import { CityPopSpacing, RetroFlatColors, RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { PrimaryColor } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import { palette } from '../lib/dayPlanPalette';
import { useRoutineTemplateDetailRoute } from '../model/useRoutineTemplateDetailRoute';

const BRUTAL_SHADOW_SM = 2;

export function RoutineTemplateDetailPage() {
  const router = useRouter();
  const { templateKey } = useRoutineTemplateDetailRoute();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const c = useMemo(() => palette(isDark), [isDark]);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const shadowColor = isDark ? tone.solidShadow : tone.text;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

  const entry = useMemo(
    () => (templateKey ? resolveCustomFlowTemplateCatalogEntry(templateKey) : null),
    [templateKey],
  );

  const [demoConfig, setDemoConfig] = useState(() =>
    templateKey ? buildTemplateDemoConfig(templateKey) : null,
  );

  useEffect(() => {
    if (!entry) router.back();
  }, [entry, router]);

  useEffect(() => {
    if (entry) setDemoConfig(buildTemplateDemoConfig(entry.key));
  }, [entry?.key]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      const pinnedY = scrollOffsetRef.current;
      setKeyboardHeight(Math.max(0, event.endCoordinates?.height ?? 0));
      // 패딩 변화·시스템 포커스 스크롤이 맨 아래로 밀지 않도록 현재 오프셋을 유지
      const restore = () => {
        scrollRef.current?.scrollTo({ y: pinnedY, animated: false });
      };
      requestAnimationFrame(restore);
      setTimeout(restore, 50);
      setTimeout(restore, 200);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  if (!entry || !demoConfig) return null;

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;
  const bottomInset = Math.max(insets.bottom, 16);
  const keyboardOpen = keyboardHeight > 0;
  const scrollBottomPad =
    Platform.OS === 'ios' && keyboardOpen
      ? Math.max(24, keyboardHeight + 16)
      : bottomInset + 24;
  const cardBg = isDark ? tone.surfaceAlt : '#FFFFFF';
  const iconBoxBg = cardBg;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View style={[styles.header, { borderBottomColor: tone.border }]}>
          <View
            style={[
              styles.headerBtnShell,
              { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.headerBtnShadow,
                {
                  backgroundColor: shadowColor,
                  borderColor: tone.border,
                  transform: [
                    { translateX: BRUTAL_SHADOW_SM },
                    { translateY: BRUTAL_SHADOW_SM },
                  ],
                },
              ]}
            />
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  borderColor: tone.border,
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(158, 207, 209, 0.22)'
                      : 'rgba(168, 218, 220, 0.35)'
                    : cardBg,
                },
                pressed && { opacity: 0.92 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="뒤로가기">
              <IconSymbol name="chevron.left" size={18} color={c.onSurface} />
            </Pressable>
          </View>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]} numberOfLines={1}>
            루틴 템플릿
          </ThemedText>
          <View style={styles.headerBtnSpacer} pointerEvents="none" />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}>
          <View
            style={[
              styles.heroShell,
              { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.heroShadow,
                {
                  backgroundColor: shadowColor,
                  borderColor: tone.border,
                  transform: [
                    { translateX: BRUTAL_SHADOW_SM },
                    { translateY: BRUTAL_SHADOW_SM },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.heroCard,
                { borderColor: tone.border, backgroundColor: cardBg },
              ]}>
              <View
                style={[
                  styles.iconBoxShell,
                  { marginRight: BRUTAL_SHADOW_SM, marginBottom: BRUTAL_SHADOW_SM },
                ]}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.iconBoxShadow,
                    {
                      backgroundColor: shadowColor,
                      borderColor: tone.border,
                      transform: [
                        { translateX: BRUTAL_SHADOW_SM },
                        { translateY: BRUTAL_SHADOW_SM },
                      ],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.iconBox,
                    { borderColor: tone.border, backgroundColor: iconBoxBg },
                  ]}>
                  <IconSymbol name={entry.icon} size={20} color={c.onSurface} />
                </View>
              </View>
              <ThemedText style={[styles.title, { color: c.onSurface }]}>{entry.label}</ThemedText>
              <ThemedText style={[styles.summary, { color: c.onVariant }]}>{entry.summary}</ThemedText>
            </View>
          </View>

          <View
            style={[
              styles.hintChip,
              {
                borderColor: tone.border,
                backgroundColor: tone.primaryContainer,
              },
            ]}>
            <ThemedText style={[styles.previewHint, { color: tone.primary }]}>
              아래에서 미리 체험해 볼 수 있어요. 저장되지 않는 미리보기예요.
            </ThemedText>
          </View>

          <CustomFlowTemplateSessionBody
            templateKey={entry.key}
            config={demoConfig}
            onChange={setDemoConfig}
            previewMode
            theme={{
              ink: c.onSurface,
              muted: c.onVariant,
              line: tone.border,
              surface: cardBg,
              accent: PrimaryColor.rgb,
            }}
          />
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CityPopSpacing.sm,
    paddingBottom: 12,
    borderBottomWidth: RETRO_BORDER_WIDTH,
  },
  headerBtnShell: {
    position: 'relative',
  },
  headerBtnShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerBtnSpacer: {
    width: 36 + BRUTAL_SHADOW_SM,
    height: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: CityPopSpacing.sm,
    gap: CityPopSpacing.sm,
  },
  heroShell: {
    position: 'relative',
  },
  heroShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
  heroCard: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    padding: CityPopSpacing.sm,
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  iconBoxShell: {
    position: 'relative',
  },
  iconBoxShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
    textAlign: 'center',
  },
  summary: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  hintChip: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
