import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CityPopSpacing,
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { markGuideBookSeenAndFlush } from '@shared/lib/storage';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { buildGuideBookToc, getGuideBookPages } from '../lib/guideBookPages';
import { GuideBookFigure } from './GuideBookFigures';

type ViewMode = 'toc' | 'read';

/** 목차로 섹션을 고르고, 섹션 안에서만 이전·다음. 번호는 해당 페이지만. */
export function GuideBookPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const pages = useMemo(() => getGuideBookPages(locale), [locale]);
  const toc = useMemo(() => buildGuideBookToc(locale), [locale]);

  const [view, setView] = useState<ViewMode>('toc');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [pageInSection, setPageInSection] = useState(0);

  const section = toc[sectionIndex]!;
  const globalPageIndex = section?.pageIndexes[pageInSection] ?? 0;
  const item = pages[globalPageIndex]!;
  const sectionPageCount = section?.pageIndexes.length ?? 0;
  const isFirstInSection = pageInSection <= 0;
  const isLastInSection = pageInSection >= sectionPageCount - 1;

  const close = useCallback(() => {
    void markGuideBookSeenAndFlush().finally(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/day-plan');
      }
    });
  }, [router]);

  const openSection = useCallback((si: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSectionIndex(si);
    setPageInSection(0);
    setView('read');
  }, []);

  const backToToc = useCallback(() => {
    void Haptics.selectionAsync();
    setView('toc');
  }, []);

  const goNext = useCallback(() => {
    if (isLastInSection) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setView('toc');
      return;
    }
    setPageInSection((p) => p + 1);
    void Haptics.selectionAsync();
  }, [isLastInSection]);

  const goPrev = useCallback(() => {
    if (isFirstInSection) {
      backToToc();
      return;
    }
    setPageInSection((p) => p - 1);
    void Haptics.selectionAsync();
  }, [backToToc, isFirstInSection]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: rf.bg }]} lightColor={rf.bg} darkColor={rf.bg}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topLeft}>
          <ThemedText
            style={[styles.topLabel, { color: rf.textMuted }, cityPopFont('700')]}
            lightColor={rf.textMuted}
            darkColor={rf.textMuted}>
            {t('guideBook.title')}
          </ThemedText>
          <ThemedText
            style={[styles.topPage, { color: rf.text }, cityPopFont('600')]}
            lightColor={rf.text}
            darkColor={rf.text}>
            {view === 'toc'
              ? t('common.toc')
              : t('guideBook.chapterProgress', {
                  chapter: section.chapter,
                  current: pageInSection + 1,
                  total: sectionPageCount,
                })}
          </ThemedText>
        </View>
        <View style={styles.topRight}>
          {view === 'read' ? (
            <Pressable
              onPress={backToToc}
              accessibilityRole="button"
              accessibilityLabel={t('guideBook.backToTocA11y')}
              hitSlop={10}
              style={styles.skipBtn}>
              <ThemedText
                style={[styles.skipLabel, { color: rf.text }, cityPopFont('600')]}
                lightColor={rf.text}
                darkColor={rf.text}>
                {t('common.toc')}
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              close();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('guideBook.closeA11y')}
            hitSlop={12}
            style={styles.skipBtn}>
            <ThemedText
              style={[styles.skipLabel, { color: rf.text }, cityPopFont('600')]}
              lightColor={rf.text}
              darkColor={rf.text}>
              {t('common.close')}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {view === 'toc' ? (
        <ScrollView
          style={styles.bodyPad}
          contentContainerStyle={[styles.tocContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}>
          <ThemedText
            style={[styles.tocLead, { color: rf.textMuted }, cityPopFont('500')]}
            lightColor={rf.textMuted}
            darkColor={rf.textMuted}>
            {t('guideBook.tocLead')}
          </ThemedText>
          {toc.map((sec, si) => {
            const rowBg = isDark ? rf.surfaceAlt : '#FFFFFF';
            const rowBgPressed = isDark ? rf.surfaceContainer : '#F3F0E8';
            return (
            <View
              key={sec.chapter}
              style={[
                styles.tocRowShell,
                { marginRight: SOLID_SHADOW_OFFSET, marginBottom: SOLID_SHADOW_OFFSET },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.tocRowShadow,
                  {
                    backgroundColor: isDark ? rf.solidShadow : rf.border,
                    transform: [
                      { translateX: SOLID_SHADOW_OFFSET },
                      { translateY: SOLID_SHADOW_OFFSET },
                    ],
                  },
                ]}
              />
              <Pressable
                onPress={() => openSection(si)}
                accessibilityRole="button"
                accessibilityLabel={t('guideBook.sectionA11y', { chapter: sec.chapter })}
                style={({ pressed }) => [
                  styles.tocRow,
                  { backgroundColor: pressed ? rowBgPressed : rowBg },
                ]}>
                <View style={[styles.tocIcon, { backgroundColor: rf.primaryContainer }]}>
                  <IconSymbol name={sec.icon as 'calendar'} size={20} color={rf.text} />
                </View>
                <View style={styles.tocText}>
                  <ThemedText
                    style={[styles.tocTitle, { color: rf.text }, cityPopFont('800')]}
                    lightColor={rf.text}
                    darkColor={rf.text}>
                    {sec.chapter}
                  </ThemedText>
                  <ThemedText
                    style={[styles.tocSub, { color: rf.textMuted }, cityPopFont('500')]}
                    lightColor={rf.textMuted}
                    darkColor={rf.textMuted}>
                    {sec.subtitle}
                    {sec.pageIndexes.length > 1
                      ? t('common.pagesSuffix', { count: sec.pageIndexes.length })
                      : ''}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={16} color={rf.textMuted} />
              </Pressable>
            </View>
            );
          })}
        </ScrollView>
      ) : (
        <>
          <View style={styles.bodyPad}>
            <View
              style={[
                styles.frame,
                {
                  borderColor: rf.border,
                  backgroundColor: isDark ? rf.surfaceAlt : '#F6F3EB',
                },
              ]}>
              <ScrollView
                key={`${section.chapter}-${pageInSection}`}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces>
                <View style={styles.figureWrap}>
                  <GuideBookFigure figureId={item.figureId} isDark={isDark} />
                </View>

                <View style={styles.copy}>
                  <ThemedText
                    style={[styles.chapter, { color: rf.textMuted }, cityPopFont('700')]}
                    lightColor={rf.textMuted}
                    darkColor={rf.textMuted}>
                    {item.chapter}
                  </ThemedText>
                  <ThemedText
                    style={[styles.title, { color: rf.text }, cityPopFont('800')]}
                    lightColor={rf.text}
                    darkColor={rf.text}>
                    {item.title}
                  </ThemedText>
                  {item.lead ? (
                    <ThemedText
                      style={[styles.lead, { color: rf.textMuted }, cityPopFont('500')]}
                      lightColor={rf.textMuted}
                      darkColor={rf.textMuted}>
                      {item.lead}
                    </ThemedText>
                  ) : null}

                  <ThemedText
                    style={[styles.calloutHeading, { color: rf.text }, cityPopFont('800')]}
                    lightColor={rf.text}
                    darkColor={rf.text}>
                    {t('guideBook.onScreen')}
                  </ThemedText>
                  {item.callouts.map((c) => (
                    <View key={`${item.id}-${c.n}`} style={styles.calloutRow}>
                      <View
                        style={[
                          styles.calloutBadge,
                          { borderColor: rf.border, backgroundColor: rf.primaryContainer },
                        ]}>
                        <ThemedText
                          style={[styles.calloutBadgeText, { color: rf.text }, cityPopFont('800')]}
                          lightColor={rf.text}
                          darkColor={rf.text}>
                          {c.n}
                        </ThemedText>
                      </View>
                      <View style={styles.calloutTextWrap}>
                        <ThemedText
                          style={[styles.calloutLabel, { color: rf.text }, cityPopFont('800')]}
                          lightColor={rf.text}
                          darkColor={rf.text}>
                          {c.label}
                        </ThemedText>
                        <ThemedText
                          style={[styles.calloutDetail, { color: rf.textMuted }, cityPopFont('500')]}
                          lightColor={rf.textMuted}
                          darkColor={rf.textMuted}>
                          {c.detail}
                        </ThemedText>
                      </View>
                    </View>
                  ))}

                  {item.notes?.map((note) => (
                    <ThemedText
                      key={note}
                      style={[
                        styles.note,
                        { color: rf.textMuted, borderColor: rf.border },
                        cityPopFont('500'),
                      ]}
                      lightColor={rf.textMuted}
                      darkColor={rf.textMuted}>
                      {note}
                    </ThemedText>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            {sectionPageCount <= 1 ? (
              <Pressable
                onPress={backToToc}
                accessibilityRole="button"
                accessibilityLabel={t('guideBook.backToTocA11y')}
                style={[
                  styles.navBtn,
                  styles.navBtnSingle,
                  {
                    borderColor: rf.border,
                    backgroundColor: rf.primaryContainer,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.navLabel,
                    { color: isDark ? rf.primaryOn : '#0A0A0A' },
                    cityPopFont('800'),
                  ]}
                  lightColor="#0A0A0A"
                  darkColor={rf.primaryOn}>
                  {t('common.toc')}
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.navRow}>
                <Pressable
                  onPress={goPrev}
                  accessibilityRole="button"
                  accessibilityLabel={isFirstInSection ? t('guideBook.backToTocA11y') : t('guideBook.prevPageA11y')}
                  style={[
                    styles.navBtn,
                    styles.navBtnGhost,
                    {
                      borderColor: rf.border,
                      backgroundColor: isDark ? rf.surfaceAlt : '#FFFFFF',
                    },
                  ]}>
                  <ThemedText
                    style={[styles.navLabel, { color: rf.text }, cityPopFont('700')]}
                    lightColor={rf.text}
                    darkColor={rf.text}>
                    {isFirstInSection ? t('common.toc') : t('common.prev')}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={goNext}
                  accessibilityRole="button"
                  accessibilityLabel={isLastInSection ? t('guideBook.backToTocA11y') : t('guideBook.nextPageA11y')}
                  style={[
                    styles.navBtn,
                    styles.navBtnPrimary,
                    {
                      borderColor: rf.border,
                      backgroundColor: rf.primaryContainer,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.navLabel,
                      { color: isDark ? rf.primaryOn : '#0A0A0A' },
                      cityPopFont('800'),
                    ]}
                    lightColor="#0A0A0A"
                    darkColor={rf.primaryOn}>
                    {isLastInSection ? t('common.toc') : t('common.next')}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: CityPopSpacing.gutter,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: { flex: 1, gap: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topLabel: { fontSize: 13, letterSpacing: 0.6 },
  topPage: { fontSize: 13, letterSpacing: -0.1 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  skipLabel: { fontSize: 15 },
  bodyPad: {
    flex: 1,
    paddingHorizontal: CityPopSpacing.gutter,
  },
  tocContent: { paddingTop: 4, gap: 10 },
  tocLead: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  tocRowShell: {
    position: 'relative',
  },
  tocRowShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  tocIcon: {
    width: 40,
    height: 40,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tocText: { flex: 1, gap: 2 },
  tocTitle: { fontSize: 16, letterSpacing: -0.2 },
  tocSub: { fontSize: 12, lineHeight: 17 },
  frame: {
    flex: 1,
    borderWidth: RETRO_BORDER_WIDTH,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 28, flexGrow: 1 },
  figureWrap: { paddingHorizontal: 12, paddingTop: 12 },
  copy: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  chapter: { fontSize: 12, letterSpacing: 0.8 },
  title: { fontSize: 22, letterSpacing: -0.4, lineHeight: 28 },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.12,
    marginBottom: 4,
  },
  calloutHeading: {
    fontSize: 14,
    letterSpacing: -0.15,
    marginTop: 8,
    marginBottom: 2,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  calloutBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  calloutBadgeText: { fontSize: 12, lineHeight: 14 },
  calloutTextWrap: { flex: 1, gap: 2 },
  calloutLabel: { fontSize: 14, letterSpacing: -0.15 },
  calloutDetail: { fontSize: 13, lineHeight: 19, letterSpacing: -0.1 },
  note: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  footer: {
    paddingHorizontal: CityPopSpacing.gutter,
    paddingTop: 10,
  },
  navRow: { flexDirection: 'row', gap: 10 },
  navBtn: {
    minHeight: 52,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  navBtnGhost: { flex: 0.42 },
  navBtnPrimary: { flex: 1 },
  navBtnSingle: { width: '100%' },
  navLabel: { fontSize: 16, letterSpacing: -0.2 },
});
