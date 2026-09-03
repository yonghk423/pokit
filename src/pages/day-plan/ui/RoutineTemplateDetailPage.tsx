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
import { CityPopSpacing } from '@shared/config/retroFlat';
import { PrimaryColor } from '@shared/config/theme';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { UiSurfacePresentationProvider } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import { palette } from '../lib/dayPlanPalette';
import { useRoutineTemplateDetailRoute } from '../model/useRoutineTemplateDetailRoute';

export function RoutineTemplateDetailPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const { templateKey } = useRoutineTemplateDetailRoute();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const c = useMemo(() => palette(isDark), [isDark]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);

  const entry = useMemo(
    () => (templateKey ? resolveCustomFlowTemplateCatalogEntry(templateKey) : null),
    [templateKey, t],
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

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}>
            <IconSymbol name="chevron.left" size={18} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]} numberOfLines={1}>
            {t('fixedRoutine.templatePageTitle')}
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
          <View style={styles.hero}>
            <View style={styles.heroTitleRow}>
              <IconSymbol name={entry.icon} size={20} color={c.onSurface} />
              <ThemedText style={[styles.title, { color: c.onSurface }]}>{entry.label}</ThemedText>
            </View>
            <ThemedText style={[styles.summary, { color: c.onVariant }]}>{entry.summary}</ThemedText>
            <View style={styles.noteRuleBlock}>
              <View style={[styles.noteRulePrimary, { backgroundColor: c.onSurface }]} />
              <View style={[styles.noteRuleSecondary, { backgroundColor: c.outline }]} />
            </View>
          </View>

          <View style={styles.previewHintWrap}>
            <ThemedText style={[styles.previewHint, { color: c.onVariant }]}>
              {t('fixedRoutine.templatePreviewHint')}
            </ThemedText>
            <View style={styles.noteRuleBlock}>
              <View style={[styles.noteRulePrimary, { backgroundColor: c.onSurface }]} />
              <View style={[styles.noteRuleSecondary, { backgroundColor: c.outline }]} />
            </View>
          </View>

          <UiSurfacePresentationProvider value="note">
            <CustomFlowTemplateSessionBody
              templateKey={entry.key}
              config={demoConfig}
              onChange={(next) => setDemoConfig(next as typeof demoConfig)}
              previewMode
              theme={{
                ink: c.onSurface,
                muted: c.onVariant,
                line: c.outline,
                surface: 'transparent',
                accent: PrimaryColor.rgb,
              }}
            />
          </UiSurfacePresentationProvider>
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
    paddingBottom: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: CityPopSpacing.sm,
    gap: 14,
  },
  hero: {
    gap: 8,
    paddingVertical: 4,
    paddingBottom: 2,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  summary: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  previewHintWrap: {
    gap: 10,
    paddingBottom: 2,
  },
  previewHint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  noteRuleBlock: {
    marginTop: 4,
    gap: 3,
    width: '100%',
  },
  noteRulePrimary: {
    height: 1.5,
    width: '100%',
    opacity: 0.82,
  },
  noteRuleSecondary: {
    height: StyleSheet.hairlineWidth * 2,
    width: '100%',
  },
});
