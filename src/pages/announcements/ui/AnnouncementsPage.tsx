import { AppModal as Modal } from '@shared/ui/app-modal';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
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
  toAnnouncementLocale,
  type AnnouncementLocale,
} from '@entities/announcement';
import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useAppLocaleStore, useTranslation } from '@shared/lib/i18n';
import {
  loadAnnouncementReadIds,
  markAnnouncementRead,
  markAnnouncementsRead,
} from '@shared/lib/storage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const ICON = 34;
const ICON_SHADOW = 2;
const LIST_ROW_SHADOW = 2;
/** 미읽음 점 — 파스텔 톤 진한 레드 */
const BADGE = '#C45C5C';

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
  border,
  shadow,
  ringColor,
  showBadge,
}: {
  color: string;
  boxBg: string;
  border: string;
  shadow: string;
  ringColor: string;
  showBadge: boolean;
}) {
  return (
    <View style={[styles.iconShell, { marginRight: ICON_SHADOW, marginBottom: ICON_SHADOW }]}>
      <View
        pointerEvents="none"
        style={[
          styles.iconShadow,
          {
            backgroundColor: shadow,
            transform: [{ translateX: ICON_SHADOW }, { translateY: ICON_SHADOW }],
          },
        ]}
      />
      <View style={[styles.iconBox, { backgroundColor: boxBg, borderColor: border }]}>
        <IconSymbol name="megaphone.fill" size={16} color={color} />
      </View>
      {showBadge ? (
        <View pointerEvents="none" style={[styles.badge, { borderColor: ringColor }]} />
      ) : null}
    </View>
  );
}

function AnnouncementListCard({
  face,
  frame,
  shadow,
  children,
}: {
  face: string;
  frame: string;
  shadow: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.listRowShell, { marginRight: LIST_ROW_SHADOW, marginBottom: LIST_ROW_SHADOW }]}>
      <View
        pointerEvents="none"
        style={[
          styles.listRowShadow,
          {
            backgroundColor: shadow,
            transform: [{ translateX: LIST_ROW_SHADOW }, { translateY: LIST_ROW_SHADOW }],
          },
        ]}
      />
      <View style={[styles.listRowFace, { backgroundColor: face }]}>
        <PaperGrain opacity={0.46} />
        <HanddrawnFrame color={frame} />
        {children}
      </View>
    </View>
  );
}

/** 설정 → 공지사항 — 설정 행과 같은 종이 카드 */
export function AnnouncementsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = toAnnouncementLocale(useAppLocaleStore((s) => s.locale));
  const isDark = useColorScheme() === 'dark';
  const rf = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState(() => new Set(loadAnnouncementReadIds()));
  const [selected, setSelected] = useState<Announcement | null>(null);

  const pageBg = rf.bg;
  const cardFace = isDark ? rf.bg : '#FFFEFA';
  const listFrame = isDark ? 'rgba(224, 225, 215, 0.48)' : '#C8C2B4';
  const listShadow = isDark ? 'rgba(0, 0, 0, 0.30)' : 'rgba(62, 57, 47, 0.14)';
  const rowBorder = isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)';
  /** 설정 탭 SettingsRowIcon과 동일 — 흰 면 · 검정 테두리 · 솔리드 음영 */
  const iconColor = isDark ? '#FAFAFA' : '#000000';
  const iconBoxBg = isDark ? rf.surfaceAlt : '#FFFFFF';
  const iconBorder = isDark ? 'rgba(255,255,255,0.55)' : '#000000';
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

  const markAllRead = useCallback(() => {
    if (items.length === 0) return;
    const unreadIds = items.map((item) => item.id).filter((id) => !readIds.has(id));
    if (unreadIds.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAnnouncementsRead(unreadIds);
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of unreadIds) next.add(id);
      return next;
    });
  }, [items, readIds]);

  const priorityLabel = useCallback(
    (priority: Announcement['priority']) => {
      if (priority === 'force') return t('announcements.priority.force');
      if (priority === 'important') return t('announcements.priority.important');
      return t('announcements.priority.info');
    },
    [t],
  );

  const empty = !loading && !error && items.length === 0;
  const hasUnread = items.some((item) => !readIds.has(item.id));

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
          {hasUnread ? (
            <BrutalConfirmButton
              compact
              fill={isDark ? '#49665C' : '#D8EAE3'}
              labelColor={isDark ? '#DDE8DF' : '#6A7F70'}
              shadowColor="transparent"
              shadowOffset={0}
              label={t('announcements.markAllRead')}
              accessibilityLabel={t('announcements.a11y.markAllRead')}
              onPress={markAllRead}
              style={styles.headerActionBtn}
            />
          ) : (
            <View style={styles.headerActionSpacer} pointerEvents="none" />
          )}
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
            <AnnouncementListCard face={cardFace} frame={listFrame} shadow={listShadow}>
              <View style={styles.emptyInner}>
                <RowIcon
                  color={iconColor}
                  boxBg={iconBoxBg}
                  border={iconBorder}
                  shadow={iconShadow}
                  ringColor={cardFace}
                  showBadge={false}
                />
                <ThemedText style={[styles.helper, { color: rf.textMuted }]}>{t('announcements.empty')}</ThemedText>
              </View>
            </AnnouncementListCard>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <View style={styles.list}>
              {items.map((item) => {
                const unread = !readIds.has(item.id);
                const meta = `${priorityLabel(item.priority)} · ${formatPublishedAt(item.publishedAt, locale)}`;
                return (
                  <AnnouncementListCard key={item.id} face={cardFace} frame={listFrame} shadow={listShadow}>
                    <Pressable
                      onPress={() => openDetail(item)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        unread ? `${item.title}, ${t('announcements.unreadHint')}` : item.title
                      }
                      style={styles.row}>
                      <View style={styles.rowText}>
                        <View style={styles.titleLine}>
                          {unread ? <View style={styles.unreadDot} accessibilityElementsHidden /> : null}
                          <ThemedText style={[styles.rowTitle, { color: rf.text }]} numberOfLines={2}>
                            {item.title}
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.rowDesc, { color: unread ? BADGE : rf.textMuted }]} numberOfLines={1}>
                          {unread ? `${t('announcements.unreadHint')} · ${meta}` : meta}
                        </ThemedText>
                      </View>
                      <IconSymbol name="chevron.right" size={14} color={rf.textMuted} />
                    </Pressable>
                  </AnnouncementListCard>
                );
              })}
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: CityPopSpacing.gutter,
    marginBottom: 8,
    minHeight: 44,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerActionBtn: {
    zIndex: 1,
  },
  headerActionSpacer: {
    width: 72,
    height: 40,
  },
  topTitles: {
    position: 'absolute',
    left: CityPopSpacing.gutter + 88,
    right: CityPopSpacing.gutter + 88,
    alignItems: 'center',
  },
  topLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  topPage: { fontSize: 16, fontWeight: '700', marginTop: 2, letterSpacing: -0.2 },
  bodyPad: { flex: 1, paddingHorizontal: 8 },
  content: { gap: 14, paddingTop: 8 },
  list: { gap: 10 },
  centerBlock: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  helper: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
  errorDetail: { fontSize: 12, textAlign: 'center' },
  emptyInner: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
    paddingHorizontal: 18,
  },
  listRowShell: {
    position: 'relative',
  },
  listRowShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 4,
  },
  listRowFace: {
    position: 'relative',
    borderRadius: 4,
    zIndex: 1,
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BADGE, flexShrink: 0 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  rowDesc: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
  iconShell: {
    position: 'relative',
    width: ICON,
    height: ICON,
    flexShrink: 0,
    overflow: 'visible',
  },
  iconShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ICON,
    height: ICON,
  },
  iconBox: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 1,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
