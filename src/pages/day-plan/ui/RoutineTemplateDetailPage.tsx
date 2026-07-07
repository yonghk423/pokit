import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildTemplateDemoConfig, resolveCustomFlowTemplateCatalogEntry } from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { CustomFlowTemplateSessionBody } from '@widgets/custom-flow-template-session';

import { palette } from '../lib/dayPlanPalette';
import { useRoutineTemplateDetailRoute } from '../model/useRoutineTemplateDetailRoute';

export function RoutineTemplateDetailPage() {
  const router = useRouter();
  const { templateKey } = useRoutineTemplateDetailRoute();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const c = useMemo(() => palette(isDark), [isDark]);

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

  if (!entry || !demoConfig) return null;

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;
  const bottomInset = Math.max(insets.bottom, 16);
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <View style={[styles.safe, { paddingTop: topInset }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기">
            <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]} numberOfLines={1}>
            루틴 템플릿
          </ThemedText>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { borderColor: c.border, backgroundColor: cardBg }]}>
            <View style={[styles.iconBox, { borderColor: c.border }]}>
              <IconSymbol name={entry.icon} size={22} color={c.onSurface} />
            </View>
            <ThemedText style={[styles.title, { color: c.onSurface }]}>{entry.label}</ThemedText>
            <ThemedText style={[styles.summary, { color: c.onVariant }]}>{entry.summary}</ThemedText>
          </View>

          <ThemedText style={[styles.previewHint, { color: c.onVariant }]}>
            아래에서 미리 체험해 볼 수 있어요. 저장되지 않는 미리보기예요.
          </ThemedText>

          <CustomFlowTemplateSessionBody
            templateKey={entry.key}
            config={demoConfig}
            onChange={setDemoConfig}
            previewMode
            theme={{
              ink: c.onSurface,
              muted: c.onVariant,
              line: c.border,
              surface: c.containerLow,
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
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  heroCard: {
    borderWidth: 2,
    borderRadius: 0,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  summary: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  previewHint: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
});
