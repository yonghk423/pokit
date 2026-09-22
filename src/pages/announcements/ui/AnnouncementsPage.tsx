import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchAnnouncements,
  type Announcement,
  type AnnouncementLocale,
} from '@entities/announcement';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useAppLocaleStore, useTranslation } from '@shared/lib/i18n';
import { loadAnnouncementReadIds, markAnnouncementRead } from '@shared/lib/storage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const ICON = 36;
const ICON_SHADOW = 2;
/** soft coral — Material Red 300 계열, 면 스트로크와 함께 씀 */
const BADGE = '#E57373';

function formatPublishedAt(iso: string, locale: AnnouncementLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

function RowIcon({
  color,
  boxBg,
  shadow,
  ringColor,
  showBadge,
}: {
  color: string;
  boxBg: string;
  shadow: string;
  ringColor: string;
  showBadge: boolean;
}) {
  return (
    <View style={styles.iconShell}>
      <View pointerEvents="none" style={[styles.iconShadow, { backgroundColor: shadow }]} />
      <View style={[styles.iconBox, { backgroundColor: boxBg }]}>
        <IconSymbol name="megaphone.fill" size={15} color={color} />
      </View>
      {showBadge ? (
        <View pointerEvents="none" style={[styles.badge, { borderColor: ringColor }]} />
      ) : null}
    </View>
  );
}

/** 설정 → 공지사항 — 설정 행과 같은 카드·아이콘 결 */
export function AnnouncementsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useAppLocaleStore((s) => s.locale) as AnnouncementLocale;
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState(() => new Set(loadAnnouncementReadIds()));
  const [selected, setSelected] = useState<Announcement | null>(null);

  const pageBg = rf.bg;
  const cardFace = isDark ? rf.surfaceAlt : pageBg;
  const rowBorder = isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)';
  const iconShadow = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)';
  const cardShadow = isDark ? '#5A5C72' : '#707979';

  const topInset =
    insets.top >= 1
      ? insets.top
      : Platform.OS === 'ios'
        ? 59
        : Number(StatusBar.currentHeight) || 24;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchAnnouncements(locale);
    if (!result.ok) {
      setError(result.message);
      setItems([]);
    } else {
      setItems(result.items);
    }
    setReadIds(new Set(loadAnnouncementReadIds()));
    setLoading(false);
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const openDetail = useCallback((item: Announcement) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAnnouncementRead(item.id);
    setReadIds((prev) => new Set(prev).add(item.id));
    setSelected(item);
  }, []);

  const priorityLabel = useCallback(
    (priority: Announcement['priority']) => {
      if (priority === 'force') return t('announcements.priority.force');
      if (priority === 'important') return t('announcements.priority.important');
      return t('announcements.priority.info');
    },
    [t],
  );

  const empty = !loading && !error && items.length === 0;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: pageBg }]} darkColor={pageBg} lightColor={pageBg}>
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}>
            <IconSymbol name="chevron.left" size={20} color={rf.text} />
          </Pressable>
          <View style={styles.topTitles}>
            <ThemedText style={[styles.topLabel, { color: rf.textMuted }]}>{t('settings.title')}</ThemedText>
            <ThemedText style={[styles.topPage, { color: rf.text }]}>{t('announcements.title')}</ThemedText>
          </View>
          <View style={styles.headerBtn} pointerEvents="none" />
        </View>

        <ScrollView
          style={styles.bodyPad}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 28) }]}
          showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={rf.text} />
              <ThemedText style={[styles.helper, { color: rf.textMuted }]}>{t('common.loading')}</ThemedText>
            </View>
          ) : null}

          {error ? (
            <View style={styles.centerBlock}>
              <ThemedText style={[styles.helper, { color: rf.text }]}>{t('announcements.error')}</ThemedText>
              <ThemedText style={[styles.errorDetail, { color: rf.textMuted }]}>{error}</ThemedText>
              <BrutalConfirmButton label={t('common.retry')} onPress={() => void reload()} />
            </View>
          ) : null}

          {empty ? (
            <CityPopCardShell isDark={isDark} faceColor={cardFace} shadowColor={cardShadow} shadowOffset={2}>
              <View style={styles.emptyInner}>
                <RowIcon
                  color={rf.primary}
                  boxBg={rf.primaryContainer}
                  shadow={iconShadow}
                  ringColor={cardFace}
                  showBadge={false}
                />
                <ThemedText style={[styles.helper, { color: rf.textMuted }]}>{t('announcements.empty')}</ThemedText>
              </View>
            </CityPopCardShell>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <CityPopCardShell isDark={isDark} faceColor={cardFace} shadowColor={cardShadow} shadowOffset={2}>
              {items.map((item, index) => {
                const unread = !readIds.has(item.id);
                const meta = `${priorityLabel(item.priority)} · ${formatPublishedAt(item.publishedAt, locale)}`;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openDetail(item)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      unread ? `${item.title}, ${t('announcements.unreadHint')}` : item.title
                    }
                    style={[
                      styles.row,
                      index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: rowBorder } : null,
                    ]}>
                    <View style={styles.rowLeft}>
                      <RowIcon
                        color={rf.primary}
                        boxBg={rf.primaryContainer}
                        shadow={iconShadow}
                        ringColor={cardFace}
                        showBadge={unread}
                      />
                      <View style={styles.rowText}>
                        <ThemedText style={[styles.rowTitle, { color: rf.text }]} numberOfLines={2}>
                          {item.title}
                        </ThemedText>
                        <ThemedText style={[styles.rowDesc, { color: rf.textMuted }]} numberOfLines={1}>
                          {meta}
                        </ThemedText>
                      </View>
                    </View>
                    <IconSymbol name="chevron.right" size={14} color={rf.textMuted} />
                  </Pressable>
                );
              })}
            </CityPopCardShell>
          ) : null}
        </ScrollView>
      </View>

      <Modal
        visible={selected != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}>
        {selected ? (
          <ThemedView style={[styles.modalRoot, { backgroundColor: pageBg }]} darkColor={pageBg} lightColor={pageBg}>
            <View style={[styles.modalSafe, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.topBar}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelected(null);
                  }}
                  style={styles.headerBtn}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}>
                  <IconSymbol name="xmark" size={18} color={rf.text} />
                </Pressable>
                <View style={styles.topTitles}>
                  <ThemedText style={[styles.topPage, { color: rf.text }]}>{t('announcements.title')}</ThemedText>
                </View>
                <View style={styles.headerBtn} pointerEvents="none" />
              </View>

              <ScrollView
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}>
                <CityPopCardShell
                  isDark={isDark}
                  faceColor={isDark ? rf.surfaceAlt : '#FFFFFF'}
                  shadowColor={cardShadow}
                  shadowOffset={2}
                  contentStyle={styles.detailInner}>
                  <ThemedText style={[styles.detailTitle, { color: rf.text }]}>{selected.title}</ThemedText>
                  <ThemedText style={[styles.detailMeta, { color: rf.textMuted }]}>
                    {`${priorityLabel(selected.priority)} · ${formatPublishedAt(selected.publishedAt, locale)}`}
                  </ThemedText>
                  <View style={[styles.detailRule, { backgroundColor: rowBorder }]} />
                  <ThemedText style={[styles.detailBody, { color: rf.text }]}>{selected.body}</ThemedText>
                </CityPopCardShell>

                {selected.linkUrl ? (
                  <BrutalConfirmButton
                    label={t('announcements.openLink')}
                    align="stretch"
                    onPress={() => {
                      void Linking.openURL(selected.linkUrl!);
                    }}
                  />
                ) : null}
              </ScrollView>
            </View>
          </ThemedView>
        ) : null}
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CityPopSpacing.gutter,
    marginBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitles: { flex: 1, alignItems: 'center' },
  topLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  topPage: { fontSize: 16, fontWeight: '700', marginTop: 2, letterSpacing: -0.2 },
  bodyPad: { flex: 1, paddingHorizontal: CityPopSpacing.marginMobile },
  content: { gap: 14, paddingTop: 8 },
  centerBlock: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  helper: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
  errorDetail: { fontSize: 12, textAlign: 'center' },
  emptyInner: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
    paddingHorizontal: 18,
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  rowDesc: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
  iconShell: {
    position: 'relative',
    width: ICON + ICON_SHADOW,
    height: ICON + ICON_SHADOW,
    flexShrink: 0,
    overflow: 'visible',
  },
  iconShadow: {
    position: 'absolute',
    left: ICON_SHADOW,
    top: ICON_SHADOW,
    width: ICON,
    height: ICON,
  },
  iconBox: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badge: {
    position: 'absolute',
    top: -2,
    left: ICON - 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BADGE,
    borderWidth: 1.5,
    zIndex: 3,
  },
  modalRoot: { flex: 1 },
  modalSafe: { flex: 1 },
  modalContent: {
    paddingHorizontal: CityPopSpacing.marginMobile,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 32,
  },
  detailInner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  detailTitle: { fontSize: 20, fontWeight: '800', lineHeight: 28, letterSpacing: -0.3 },
  detailMeta: { fontSize: 12, fontWeight: '600' },
  detailRule: { height: StyleSheet.hairlineWidth * 2, width: '100%', marginTop: 2 },
  detailBody: { fontSize: 15, lineHeight: 24, fontWeight: '500' },
});
