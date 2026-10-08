import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { usePuzzleHistoryStore } from '@entities/puzzle-history';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button/BrutalConfirmButton';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

export function PuzzleHistoryAlbumPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;

  const { hydrate, histories, activeHistoryId } = usePuzzleHistoryStore(
    useShallow((s) => ({
      hydrate: s.hydrate,
      histories: s.histories,
      activeHistoryId: s.activeHistoryId,
    })),
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const album = useMemo(
    () =>
      histories
        .filter((h) => h.status === 'completed')
        .sort((a, b) =>
          (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt),
        ),
    [histories],
  );

  const hasActive = Boolean(
    histories.find((h) => h.id === activeHistoryId && h.status === 'active'),
  );

  return (
    <ThemedView style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={10}
          onPress={() => {
            void Haptics.selectionAsync();
            if (router.canGoBack()) router.back();
            else router.replace('/puzzle-history');
          }}
          style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={18} color={c.text} />
        </Pressable>
        <ThemedText style={[styles.topTitle, { color: c.text }]}>
          {t('history.puzzle.albumTitle')}
        </ThemedText>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={album}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          album.length === 0 ? styles.listEmpty : null,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <ThemedText style={[styles.emptyTitle, { color: c.text }]}>
              {t('history.puzzle.albumEmptyTitle')}
            </ThemedText>
            <ThemedText style={[styles.emptyBody, { color: c.textMuted }]}>
              {t('history.puzzle.albumEmptyBody')}
            </ThemedText>
            {!hasActive ? (
              <BrutalConfirmButton
                align="stretch"
                label={t('history.puzzle.startCta')}
                onPress={() => router.push('/puzzle-history-start')}
                style={{ marginTop: 16 }}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => {
              void Haptics.selectionAsync();
              router.push({
                pathname: '/puzzle-history-detail',
                params: { id: item.id },
              });
            }}
            style={[styles.card, { backgroundColor: c.surfaceAlt }]}>
            <Image
              source={{ uri: item.thumbnailUri || item.imageUri }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`album-${item.id}`}
            />
            <View style={styles.cardText}>
              <ThemedText style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                {item.title}
              </ThemedText>
              <ThemedText style={[styles.cardMeta, { color: c.textMuted }]}>
                {t('history.puzzle.albumItemMeta', {
                  count: item.targetCount ?? item.duration,
                })}
              </ThemedText>
            </View>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyWrap: { paddingHorizontal: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    gap: 12,
    padding: 10,
  },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  cardText: { flex: 1, justifyContent: 'center', minWidth: 0, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardMeta: { fontSize: 12, lineHeight: 17 },
});
